import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const moduleRoot = resolve(import.meta.dirname, "..");
const template = resolve(moduleRoot, "templates/meeting");
const validator = resolve(moduleRoot, "scripts/validate-record.mjs");
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function recordCopy() {
  const directory = mkdtempSync(resolve(tmpdir(), "i3a-record-"));
  cpSync(template, directory, { recursive: true });
  return directory;
}
function validate(directory, ...flags) {
  return spawnSync(process.execPath, [validator, directory, ...flags], { encoding: "utf8" });
}
function makePublic(directory) {
  const manifestPath = resolve(directory, "meeting.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.privacy.classification = "public-redacted";
  manifest.publication.allowed = true;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const eventPath = resolve(directory, "events.jsonl");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  event.manifest_digest = digest(readFileSync(manifestPath));
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
  writeFileSync(resolve(directory, "PUBLISHING.md"), readFileSync(resolve(directory, "PUBLISHING.md"), "utf8").replaceAll("[ ]", "[x]"));
  const publishingPath = resolve(directory, "PUBLISHING.md");
  const files = ["meeting.json", "events.jsonl", "PUBLISHING.md"];
  const checksums = files.map((file) => `${digest(readFileSync(resolve(directory, file))).slice(7)}  ${file}`).join("\n") + "\n";
  writeFileSync(resolve(directory, "checksums.sha256"), checksums);
  writeFileSync(resolve(directory, "archive-manifest.json"), `${JSON.stringify({ files, checksums_digest: digest(checksums) }, null, 2)}\n`);
}

test("validates the private template", () => {
  const directory = recordCopy();
  try { assert.equal(validate(directory).status, 0); } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects a broken event chain", () => {
  const directory = recordCopy();
  try {
    const eventPath = resolve(directory, "events.jsonl");
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    event.previous_event_digest = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
    assert.equal(validate(directory).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects an unsafe artifact reference", () => {
  const directory = recordCopy();
  try {
    const eventPath = resolve(directory, "events.jsonl");
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    event.artifact_refs = ["/Users/private/evidence.md"];
    writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
    assert.equal(validate(directory).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects a peer-authored brief", () => {
  const directory = recordCopy();
  try {
    const eventPath = resolve(directory, "events.jsonl");
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    event.kind = "BRIEF";
    event.role = "peer";
    event.brief_ref = "briefs/setup.md";
    writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
    assert.equal(validate(directory).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects a claimed controller identity absent from the manifest", () => {
  const directory = recordCopy();
  try {
    const eventPath = resolve(directory, "events.jsonl");
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    event.kind = "TASK";
    event.participant_id = "imposter-controller";
    event.role = "controller";
    writeFileSync(eventPath, `${JSON.stringify(event)}\n`);
    assert.equal(validate(directory).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects an ACCEPT whose artifact evidence differs from its REPORT", () => {
  const directory = recordCopy();
  try {
    const artifactDir = resolve(directory, "artifacts");
    mkdirSync(artifactDir);
    const artifactPath = resolve(artifactDir, "evidence.md");
    writeFileSync(artifactPath, "reviewable evidence\n");
    const eventPath = resolve(directory, "events.jsonl");
    const firstLine = readFileSync(eventPath, "utf8").trim();
    const first = JSON.parse(firstLine);
    const artifactRef = "artifacts/evidence.md";
    const report = { ...first, event_id: "e-0002", sequence: 2, previous_event_digest: digest(firstLine), kind: "REPORT", participant_id: "peer-1", role: "peer", turn_id: "review-1", semantic_state: "SUBMITTED", artifact_refs: [artifactRef], artifact_revisions: { [artifactRef]: 1 }, artifact_digests: { [artifactRef]: digest(readFileSync(artifactPath)) } };
    const reportLine = JSON.stringify(report);
    const accept = { ...first, event_id: "e-0003", sequence: 3, previous_event_digest: digest(reportLine), kind: "ACCEPT", turn_id: "review-1", semantic_state: "ACCEPTED", review_ref: "meeting.json", artifact_refs: [artifactRef], artifact_revisions: { [artifactRef]: 2 }, artifact_digests: { [artifactRef]: digest(readFileSync(artifactPath)) } };
    writeFileSync(eventPath, `${firstLine}\n${reportLine}\n${JSON.stringify(accept)}\n`);
    assert.equal(validate(directory).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("requires the redacted public projection", () => {
  const directory = recordCopy();
  try {
    assert.equal(validate(directory, "--public").status, 1);
    makePublic(directory);
    assert.equal(validate(directory, "--public").status, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("rejects secret-looking text even with a complete public file list", () => {
  const directory = recordCopy();
  try {
    makePublic(directory);
    const leak = resolve(directory, "leak.md");
    writeFileSync(leak, "api_key=not-a-real-key\n");
    const archivePath = resolve(directory, "archive-manifest.json");
    const archive = JSON.parse(readFileSync(archivePath, "utf8"));
    archive.files.push("leak.md");
    const checksums = archive.files.map((file) => `${digest(readFileSync(resolve(directory, file))).slice(7)}  ${file}`).join("\n") + "\n";
    writeFileSync(resolve(directory, "checksums.sha256"), checksums);
    archive.checksums_digest = digest(checksums);
    writeFileSync(archivePath, `${JSON.stringify(archive, null, 2)}\n`);
    assert.equal(validate(directory, "--public").status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
