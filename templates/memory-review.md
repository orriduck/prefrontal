# Memory Review - YYYY-MM-DD

Reviewer: `<agent>`
Scope: `<files or date range>`
Mode: proposal only

## Summary

- Candidates reviewed:
- Proposed solidify:
- Proposed archive:
- Credential-boundary warnings:
- Conflicts needing user choice:

## Decisions Needed

### MR-YYYY-MM-001 - `<short title>`

Category: `solidify|archive|credential-boundary|merge-duplicate|conflict|expire|directory`
Confidence: `high|med|low`
Source: `<path>`

Current memory:

```text
<short quote or paraphrase; do not include secrets>
```

Proposed action:

```text
<what should happen>
```

Proposed durable text:

```text
<canonical memory text, or "none">
```

Preserved constraints:

- `<constraint that must survive compression>`

Omitted from active memory:

- `<what is intentionally not carried forward>`

User choice:

- `[ ] solidify as written`
- `[ ] solidify with edit`
- `[ ] archive`
- `[ ] remove from active memory`
- `[ ] keep unchanged`

## Credential Boundary Items

### MR-YYYY-MM-C001 - `<service>`

Source: `<path>`
Credential value present: `yes|no|unknown`
Safe reference:

```text
<service>: credential stored at <path>; allowed use: <purpose>; never commit raw secret.
```

User choice:

- `[ ] keep safe reference only`
- `[ ] remove credential mention entirely`
- `[ ] move to credentials index`

## Directory Suggestions

- `<suggested folder/file move>`

## Apply Notes

No changes applied by this review.

Suggested follow-up:

```bash
# After user marks decisions, apply them in a separate task.
bash ~/.prefrontal-cortex/sync/sync.sh commit "memory-steward: apply review YYYY-MM-DD"
```

