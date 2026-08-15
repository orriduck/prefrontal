# I3A Meeting Record v1

## Directory layout

```text
<meeting-id>/
  meeting.json              # immutable-at-start manifest; amendments are events
  events.jsonl              # append-only protocol events
  artifacts/                # reviewed work products, named by stable path
  decisions/                # controller decisions by agenda
  briefs/                   # one controller brief per accepted agenda
  checksums.sha256          # artifact and record digests at archive time
  PUBLISHING.md             # completed redaction and release checklist
```

The record is portable: paths inside events are repository-relative and may
not contain local home directories, usernames, credentials, browser data, or
unredacted native-session IDs. The validator checks these claims before a
public release; a markdown checklist alone is not a publication control.

## Manifest (`meeting.json`)

The manifest records immutable meeting identity and initial authority:

```json
{
  "spec_version": "i3a-meeting/v1",
  "meeting_id": "i3a-YYYY-MM-DD-slug",
  "status": "open",
  "approval_owner": "human:<opaque-id>",
  "controller": "controller-1",
  "participants": [
    {"participant_id": "controller-1", "role": "controller", "adapter_profile_id": "example/atomic/v1"},
    {"participant_id": "peer-1", "role": "peer", "adapter_profile_id": "example/raw-terminal/v1"}
  ],
  "scope": {"objective": "", "allowed_mutations": [], "exclusions": [], "external_effects": "forbidden"},
  "privacy": {"classification": "public-redacted", "raw_transcript": "excluded"},
  "publication": {"allowed": false}
}
```

Do not overwrite the manifest to repair history. Add a `MANIFEST_AMENDMENT`
event with `previous_manifest_digest`, `manifest_digest`, an authorization
reference, and a minimal patch reference. The first event commits the initial
manifest digest. A public archive also includes `archive-manifest.json`, whose
file list and root digest are verified by the validator.

## Event stream (`events.jsonl`)

Each line is one UTF-8 JSON object validated by
[`schema/event.schema.json`](schema/event.schema.json). Required fields are:

```text
protocol_version, meeting_id, event_id, sequence, timestamp,
kind, participant_id, role, adapter_profile_id, agenda_id,
turn_id, semantic_state, authorization_ref, payload
```

Every event includes `previous_event_digest` (`GENESIS` for sequence 1). Artifact-bearing
events also include `artifact_refs`, `artifact_digests`, and
`artifact_revisions`. `payload` is free natural language but bounded by the
meeting's declared inline budget. Large or review-critical content belongs in
an artifact, not an oversized event.

Required kinds are `TASK`, `ACK`, `SKELETON`, `CHECKPOINT`, `REPORT`,
`CORRECTION`, `ACCEPT`, `REJECT`, `EVENT`, `HEARTBEAT`, `CANCEL_REQUEST`,
`CANCEL_ACK`, `RECOVERY`, `DECISION`, `BRIEF`, `INCIDENT`, `PARTICIPANT_ADMITTED`,
`PARTICIPANT_REMOVED`, `CONTROLLER_TRANSFER`, and `MANIFEST_AMENDMENT`. `to` is a named
recipient list; broadcast is controller-gated and must enumerate recipients.

## Artifacts, decisions, and briefs

Each artifact is revised in place with an explicit revision marker. A `REPORT`
contains its SHA-256, size, and an EOF/latest-entry anchor. The controller
writes a review verdict before `ACCEPT`, then a decision record before the
single user brief. The decision records consensus status and any dissent.
For every `artifact_ref`, both `REPORT` and matching `ACCEPT` must carry the
same one-to-one revision and SHA-256 mapping. An event's participant and
adapter profile must match the immutable manifest; a controller-only event must
use the manifest's exact controller ID, not merely claim the controller role.

The archive-time `checksums.sha256` covers `meeting.json`, `events.jsonl`,
`PUBLISHING.md`, all accepted artifacts, decisions, and briefs. It does not
bless unreviewed raw scrollback. `archive-manifest.json` is intentionally
outside the checksum set so it can commit the checksum-file digest without a
circular hash. It must enumerate this complete published file set:

```json
{
  "files": ["meeting.json", "events.jsonl", "PUBLISHING.md"],
  "checksums_digest": "sha256:<digest-of-checksums.sha256>"
}
```

Public validation requires the manifest list, repository files, and checksum
entries to have identical closure. Every `artifacts/` file must be referenced
by a matching accepted artifact digest; decisions and briefs must be referenced
by their controller events. The validator scans every listed UTF-8 file for
the same secret/private-path patterns it rejects in events.

## Publication checklist

Before pushing to a public archive:

1. Confirm the approval owner authorized publication and the manifest says
   `publication.allowed: true`.
2. Run `node scripts/validate-record.mjs <meeting-dir> --public`. It rejects
   secrets, local absolute paths, raw-session fields, unapproved artifacts,
   malformed integrity chains, and incomplete publishing checklists.
3. Remove secrets, local absolute paths, credentials, personal data,
   private prompt context, and raw session identifiers.
4. Replace participant display names with approved public pseudonyms where
   necessary; preserve stable IDs within the record.
5. Confirm every linked artifact is public-safe and every digest matches.
6. Record any omitted evidence as `redacted` in `PUBLISHING.md`; do not
   silently substitute invented content.
7. Regenerate `checksums.sha256`, validate event JSON, and commit the release
   as a named publication decision.

## Memory pointer

Durable memory receives only a compact, reviewed pointer: meeting ID, accepted
decision IDs, archive commit/digest, applicable protocol version, owner, and
superseded prior pointers. Never copy full events or raw transcripts into every
agent's memory. Generated shared views remain derived and are never edited by
hand.
