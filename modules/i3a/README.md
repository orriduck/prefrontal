# I3A Meeting Module

I3A means **Intent, Identity, and Auditability**. An I3A Meeting lets a human
approval owner observe a controller and one or more peer agents without making
raw agent chat the source of truth. For local cross-agent collaboration, run
the canonical, versioned `agent2agent` skill first; I3A adds the durable record
and publication contract rather than replacing that methodology.

This module is agent- and vendor-neutral. It is compatible with a visible
terminal workspace, a browser agent, or another transport, but it does not
make a particular product, model, or UI normative.

## What it guarantees

- One human approval owner and one controller/sole user briefer per meeting.
- Stable participant identity separated from adapter and native-session IDs.
- Explicit separation of transport, peer execution, review, agenda, and
  artifact states.
- Append-only, replayable events and hash-addressed reviewed artifacts.
- Recorded disagreement: `unanimous`, `controller-decided-with-dissent`, or
  `user-decided`.
- Privacy and authorization as source-level fields, not assumptions about UI
  placement.

It does **not** authorize deployment, external messages, skill edits, memory
sync, repository selection, or deletion. Those require a named user gate.

## Files

- [`PROTOCOL.md`](PROTOCOL.md) — the narrow I3A record overlay and its relation
  to the canonical collaboration procedure.
- [`MEETING-RECORD.md`](MEETING-RECORD.md) — durable record, redaction, and
  publication rules.
- [`schema/event.schema.json`](schema/event.schema.json) — JSON Schema for a
  single event line.
- [`templates/`](templates/) — a publish-safe meeting skeleton.

## Fast start

1. Copy `templates/meeting/` to a fresh meeting directory.
2. Fill `meeting.json` before asking a peer to act. It names the controller,
   participants, scope, allowed mutations, exclusions, and approval owner.
3. Append one UTF-8 JSON object per event to `events.jsonl`. Use the schema
   before building a transport adapter.
4. Store reviewed files under `artifacts/`, with SHA-256 digests in the
   matching `REPORT`, `ACCEPT`, and `DECISION` events.
5. Add an `AGENDA-*.md` decision and exactly one controller brief. Run
   `node scripts/validate-record.mjs <meeting-dir>` before review, and add
   `--public` before publication.
6. Before publishing, apply the publication checklist in `MEETING-RECORD.md`.
   Public records exclude credentials, local absolute paths, raw scrollback,
   private user data, and native-session identifiers unless their disclosure
   was separately approved.

## Storage model

```text
protocol module        reusable rules, schema, templates
meeting archive        manifest, event stream, reviewed artifacts, decisions
durable memory         reviewed compact pointers only
raw transcript         optional evidence; never canonical by default
```

Keep reusable protocol in a standards repository, meeting instances in a
separately governed archive, and private memory in its private repository.
This avoids treating a transcript, a product repository, and a memory store as
the same object with the same lifecycle.

## Conformance minimum

A meeting is I3A-v1 conformant only if it can demonstrate that:

1. Transport completion alone cannot close a peer turn or agenda.
2. Every accepted decision can be reconstructed from event sequence, artifact
   digest, review verdict, and approval ownership.
3. A peer cannot brief the human directly or accept its own output.
4. Cancellation, timeout, process exit, ambiguity, and recovery are explicit
   states rather than silent success.
5. The supplied public validator rejects unsafe paths, raw-session fields,
   unapproved artifacts, broken integrity chains, and common secret patterns.
