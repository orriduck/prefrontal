#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const [recordArg, ...flags] = process.argv.slice(2);
const publicMode = flags.includes("--public");
if (!recordArg || flags.some((flag) => flag !== "--public")) {
  console.error("Usage: node scripts/validate-record.mjs <meeting-dir> [--public]");
  process.exit(2);
}

const root = resolve(recordArg);
const errors = [];
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const fail = (message) => errors.push(message);
const safePath = (value) =>
  typeof value === "string" &&
  !value.startsWith("/") &&
  !value.startsWith("~") &&
  !value.includes("://") &&
  !value.split(/[\\/]/).includes("..") &&
  /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value);
const fileAt = (relativePath) => {
  if (!safePath(relativePath)) return null;
  const candidate = resolve(root, relativePath);
  return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null;
};
const kinds = new Set([
  "TASK", "ACK", "SKELETON", "CHECKPOINT", "REPORT", "CORRECTION",
  "ACCEPT", "REJECT", "EVENT", "HEARTBEAT", "CANCEL_REQUEST", "CANCEL_ACK",
  "RECOVERY", "DECISION", "BRIEF", "INCIDENT", "PARTICIPANT_ADMITTED",
  "PARTICIPANT_REMOVED", "CONTROLLER_TRANSFER", "MANIFEST_AMENDMENT",
]);
const controllerKinds = new Set(["TASK", "CORRECTION", "ACCEPT", "REJECT", "DECISION", "BRIEF", "CANCEL_REQUEST", "PARTICIPANT_ADMITTED", "PARTICIPANT_REMOVED", "CONTROLLER_TRANSFER", "MANIFEST_AMENDMENT"]);
const peerKinds = new Set(["ACK", "SKELETON", "CHECKPOINT", "REPORT", "CANCEL_ACK"]);
const secretPattern = /(?:authorization\s*:\s*bearer|api[_ -]?key\s*[:=]|password\s*[:=]|secret\s*[:=]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|file:\/\/|\/Users\/|\/home\/)/i;

function parseJson(relativePath) {
  const fullPath = fileAt(relativePath);
  if (!fullPath || !existsSync(fullPath)) {
    fail(`missing or unsafe required file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

const manifest = parseJson("meeting.json");
const participantById = new Map();
if (manifest) {
  if (manifest.spec_version !== "i3a-meeting/v1") fail("meeting.json has an unsupported spec_version");
  if (!manifest.meeting_id || !manifest.approval_owner || !manifest.controller) fail("meeting.json lacks meeting_id, approval_owner, or controller");
  const controllers = (manifest.participants ?? []).filter((participant) => participant.role === "controller");
  const peers = (manifest.participants ?? []).filter((participant) => participant.role === "peer");
  if (controllers.length !== 1 || controllers[0]?.participant_id !== manifest.controller) fail("meeting.json must name exactly one matching controller");
  if (peers.length < 1) fail("meeting.json must name at least one peer");
  for (const participant of manifest.participants ?? []) {
    if (!participant.participant_id || !participant.adapter_profile_id) fail("every participant needs participant_id and adapter_profile_id");
    else if (participantById.has(participant.participant_id)) fail(`meeting.json repeats participant_id ${participant.participant_id}`);
    else participantById.set(participant.participant_id, participant);
  }
}

const eventsPath = fileAt("events.jsonl");
const events = [];
if (!eventsPath || !existsSync(eventsPath)) {
  fail("missing events.jsonl");
} else {
  const lines = readFileSync(eventsPath, "utf8").split(/\r?\n/).filter(Boolean);
  let previousRawDigest = "GENESIS";
  let expectedSequence = 1;
  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      fail(`events.jsonl line ${index + 1} is invalid JSON: ${error.message}`);
      continue;
    }
    const label = `event ${event.event_id ?? `line-${index + 1}`}`;
    for (const field of ["protocol_version", "meeting_id", "event_id", "sequence", "previous_event_digest", "timestamp", "kind", "participant_id", "role", "adapter_profile_id", "agenda_id", "turn_id", "semantic_state", "authorization_ref", "payload"]) {
      if (!(field in event)) fail(`${label} lacks ${field}`);
    }
    if (event.protocol_version !== "i3a-meeting/v1") fail(`${label} has unsupported protocol_version`);
    if (manifest && event.meeting_id !== manifest.meeting_id) fail(`${label} has the wrong meeting_id`);
    if (event.sequence !== expectedSequence++) fail(`${label} sequence is not contiguous`);
    if (event.previous_event_digest !== previousRawDigest) fail(`${label} breaks the event digest chain`);
    if (!kinds.has(event.kind)) fail(`${label} has unsupported kind ${event.kind}`);
    const participant = participantById.get(event.participant_id);
    if (!participant) fail(`${label} names a participant absent from meeting.json`);
    else {
      if (event.role !== participant.role) fail(`${label} role does not match meeting.json`);
      if (event.adapter_profile_id !== participant.adapter_profile_id) fail(`${label} adapter profile does not match meeting.json`);
    }
    if (controllerKinds.has(event.kind) && event.role !== "controller") fail(`${label} must be authored by the controller`);
    if (controllerKinds.has(event.kind) && event.participant_id !== manifest?.controller) fail(`${label} must use the manifest controller identity`);
    if (peerKinds.has(event.kind) && event.role !== "peer") fail(`${label} must be authored by a peer`);
    const requiresArtifacts = ["REPORT", "ACCEPT"].includes(event.kind);
    if (requiresArtifacts && !(Array.isArray(event.artifact_refs) && event.artifact_refs.length && event.artifact_revisions && event.artifact_digests)) fail(`${label} ${event.kind} requires artifact refs, revisions, and digests`);
    if (event.kind === "ACCEPT" && !event.review_ref) fail(`${label} ACCEPT requires review evidence`);
    if (event.kind === "DECISION" && !(event.decision_ref && event.consensus)) fail(`${label} DECISION requires decision_ref and consensus`);
    if (event.kind === "BRIEF" && !event.brief_ref) fail(`${label} BRIEF requires brief_ref`);
    if (event.kind === "MANIFEST_AMENDMENT" && !(event.previous_manifest_digest && event.manifest_digest)) fail(`${label} amendment requires both manifest digests`);
    for (const pathValue of [...(event.artifact_refs ?? []), event.review_ref, event.decision_ref, event.brief_ref].filter(Boolean)) {
      const fullPath = fileAt(pathValue);
      if (!fullPath || !existsSync(fullPath)) fail(`${label} references a missing or unsafe path: ${pathValue}`);
      else if (event.artifact_digests?.[pathValue] && sha256(readFileSync(fullPath)) !== event.artifact_digests[pathValue]) fail(`${label} digest mismatch for ${pathValue}`);
    }
    if (requiresArtifacts) {
      const references = new Set(event.artifact_refs);
      for (const reference of references) {
        if (!Number.isInteger(event.artifact_revisions?.[reference]) || event.artifact_revisions[reference] < 1) fail(`${label} lacks a positive revision for ${reference}`);
        if (!/^sha256:[a-f0-9]{64}$/i.test(event.artifact_digests?.[reference] ?? "")) fail(`${label} lacks a SHA-256 digest for ${reference}`);
      }
      for (const reference of [...Object.keys(event.artifact_revisions ?? {}), ...Object.keys(event.artifact_digests ?? {})]) {
        if (!references.has(reference)) fail(`${label} has an artifact mapping without an artifact_ref: ${reference}`);
      }
    }
    if ("native_session_ref" in event) fail(`${label} contains forbidden raw native_session_ref`);
    if (event.native_session_commitment && !/^sha256:[a-f0-9]{64}$/i.test(event.native_session_commitment)) fail(`${label} has an invalid session commitment`);
    if (secretPattern.test(JSON.stringify(event))) fail(`${label} contains a forbidden private-data pattern`);
    previousRawDigest = sha256(line);
    events.push(event);
  }
  if (!events.length) fail("events.jsonl is empty");
}

const reportsByTurn = new Map();
for (const event of events.filter((event) => event.kind === "REPORT")) {
  const reports = reportsByTurn.get(event.turn_id) ?? [];
  reports.push(event);
  reportsByTurn.set(event.turn_id, reports);
}
const decisions = new Set(events.filter((event) => event.kind === "DECISION").map((event) => event.agenda_id));
const acceptedArtifactRefs = new Set(events.filter((event) => event.kind === "ACCEPT").flatMap((event) => event.artifact_refs ?? []));
const decisionRefs = new Set(events.filter((event) => event.kind === "DECISION").map((event) => event.decision_ref));
const briefRefs = new Set(events.filter((event) => event.kind === "BRIEF").map((event) => event.brief_ref));
const briefs = new Map();
for (const event of events) {
  if (event.kind === "ACCEPT") {
    const matchingReports = reportsByTurn.get(event.turn_id) ?? [];
    const matchingEvidence = matchingReports.some((report) => JSON.stringify(report.artifact_refs) === JSON.stringify(event.artifact_refs) && JSON.stringify(report.artifact_revisions) === JSON.stringify(event.artifact_revisions) && JSON.stringify(report.artifact_digests) === JSON.stringify(event.artifact_digests));
    if (!matchingEvidence) fail(`ACCEPT for ${event.turn_id} has no matching REPORT evidence mapping`);
  }
  if (event.kind === "BRIEF") {
    briefs.set(event.agenda_id, (briefs.get(event.agenda_id) ?? 0) + 1);
    if (!decisions.has(event.agenda_id)) fail(`BRIEF for ${event.agenda_id} has no DECISION`);
  }
}
for (const [agenda, count] of briefs) if (count !== 1) fail(`agenda ${agenda} has ${count} BRIEFs; exactly one is allowed`);

if (publicMode) {
  if (manifest?.privacy?.classification !== "public-redacted" || manifest?.publication?.allowed !== true) fail("public validation requires public-redacted privacy and publication.allowed=true");
  const firstEvent = events[0];
  const manifestDigest = manifest && sha256(readFileSync(fileAt("meeting.json")));
  if (firstEvent?.manifest_digest !== manifestDigest) fail("first event must commit the exact meeting.json digest before public release");
  const publishingPath = fileAt("PUBLISHING.md");
  const publishing = publishingPath && existsSync(publishingPath) ? readFileSync(publishingPath, "utf8") : "";
  if (!publishing || /- \[ \]/.test(publishing)) fail("PUBLISHING.md is incomplete");
  const archive = parseJson("archive-manifest.json");
  const checksumsPath = fileAt("checksums.sha256");
  if (!checksumsPath || !existsSync(checksumsPath)) fail("public archive lacks checksums.sha256");
  else if (!archive || archive.checksums_digest !== sha256(readFileSync(checksumsPath))) fail("archive-manifest.json must commit checksums.sha256");
  const walk = (directory, prefix = "") => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${prefix}${entry.name}`;
    return entry.isDirectory() ? walk(resolve(directory, entry.name), `${rel}/`) : [rel];
  });
  const actualFiles = new Set(walk(root));
  for (const relativePath of actualFiles) {
    if (/(?:raw|transcript|scrollback|\.env$|auth|credential)/i.test(relativePath)) fail(`public archive contains prohibited filename: ${relativePath}`);
    if (lstatSync(resolve(root, relativePath)).isSymbolicLink()) fail(`public archive contains prohibited symlink: ${relativePath}`);
  }
  const expectedFiles = new Set([...actualFiles].filter((file) => !["checksums.sha256", "archive-manifest.json"].includes(file)));
  const listedFiles = new Set(Array.isArray(archive?.files) ? archive.files : []);
  for (const file of listedFiles) if (!safePath(file) || !expectedFiles.has(file)) fail(`archive-manifest.json lists missing or unsafe file: ${file}`);
  for (const file of expectedFiles) if (!listedFiles.has(file)) fail(`archive-manifest.json omits published file: ${file}`);
  const checksumLines = readFileSync(checksumsPath, "utf8").split(/\r?\n/).filter(Boolean);
  const checksumEntries = new Map();
  for (const line of checksumLines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._/-]*)$/i.exec(line);
    if (!match) { fail(`invalid checksum entry: ${line}`); continue; }
    if (checksumEntries.has(match[2])) fail(`duplicate checksum entry: ${match[2]}`);
    checksumEntries.set(match[2], match[1].toLowerCase());
  }
  for (const file of listedFiles) {
    if (!checksumEntries.has(file)) fail(`checksums.sha256 omits ${file}`);
    else if (sha256(readFileSync(resolve(root, file))).slice(7) !== checksumEntries.get(file)) fail(`checksum mismatch for ${file}`);
    const content = readFileSync(resolve(root, file), "utf8");
    if (secretPattern.test(content)) fail(`public file contains forbidden private-data pattern: ${file}`);
    if (file.startsWith("artifacts/") && !acceptedArtifactRefs.has(file)) fail(`published artifact is not accepted evidence: ${file}`);
    if (file.startsWith("decisions/") && !decisionRefs.has(file)) fail(`published decision lacks DECISION event: ${file}`);
    if (file.startsWith("briefs/") && !briefRefs.has(file)) fail(`published brief lacks BRIEF event: ${file}`);
  }
  for (const file of checksumEntries.keys()) if (!listedFiles.has(file)) fail(`checksums.sha256 contains unlisted file: ${file}`);
}

if (errors.length) {
  console.error(`I3A validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`I3A validation passed: ${events.length} event(s), ${publicMode ? "public-redacted" : "private"} record.`);
