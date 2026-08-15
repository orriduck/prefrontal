# I3A Protocol Overlay v1

## Canonical collaboration procedure

For local cross-agent collaboration, use the versioned `agent2agent` skill as
the sole methodological source: task packet, visible channel, handshake,
bounded execution, independent review, correction, and durable handoff all
belong there. Non-local implementations must declare their equivalent procedure
and any weaker guarantees before work begins.

I3A deliberately does not restate that workflow. It defines only what an I3A
record adds: portable identity, authority, semantic evidence, integrity, and a
safe public projection.

## Record invariants

1. `participant_id` is stable and separate from `adapter_profile_id` and an
   opaque `native_session_commitment`. The latter is a SHA-256 commitment,
   never a raw session ID in a public record.
2. Peer execution, review, agenda, and artifact states are recorded separately.
   Transport state, timeout, process exit, and file mtime are evidence only.
3. `REPORT` is a submission, `ACCEPT` is a controller review verdict, and an
   agenda is complete only after controller `DECISION` then controller `BRIEF`.
4. The controller alone emits `TASK`, `CORRECTION`, `ACCEPT`, `REJECT`,
   `DECISION`, and `BRIEF`; a peer cannot accept itself or brief the human.
5. Every event links to its predecessor. Manifest amendments, participant
   admission/removal, and controller transfers are typed, authorized events.
6. Consensus is recorded as `unanimous`, `controller-decided-with-dissent`, or
   `user-decided`. P0 dissent remains an escalation, not a majority vote.
7. An unapproved skill or process mutation is recorded as `INCIDENT`; valid
   improvement is proposal, independent review, explicit approval, versioned
   apply, and conformance test.

The detailed event contract and the validator are in
[`MEETING-RECORD.md`](MEETING-RECORD.md) and `scripts/validate-record.mjs`.
