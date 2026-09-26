# Weekly Memory Distillation Contract

Run once per week against `~/.prefrontal-cortex`. This is a direct, versioned maintenance job:
improve the active memory and shared knowledge, then commit and push the result.

## Scope

- Read active `agents/<name>/memory/`, generated `shared/MEMORY.md` and `shared/USER.md`,
  and canonical `shared/knowledge/`.
- Distill durable methods, decision rules, and recurring concepts into the relevant canonical
  topic page. Remove duplicate wording and implementation chatter from active memory when the
  distilled page preserves the useful constraint and provenance.
- Preserve retired agents and historical material in `archive/`; do not revive them or add them
  to `registry/`.

## Hard boundaries

1. Never edit generated `shared/MEMORY.md` or `shared/USER.md` by hand.
2. Never add credentials, authentication material, access-control email addresses, browser state,
   client-confidential information, or raw secrets.
3. Preserve uncertainty, source attribution, confidence and consequential constraints. Do not
   silently resolve a factual conflict by guessing.
4. Do not create daily logs, review proposals, coordination queues, or handoff files.
5. If there is nothing worth improving, make no commit.

## Completion

Run `bash ~/.prefrontal-cortex/sync/sync.sh commit "memory: weekly distillation"` after a
material improvement. Report the committed changes and any conflict that was deliberately left
unresolved.
