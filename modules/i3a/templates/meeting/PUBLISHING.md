# Publication checklist

Status: not approved. Replace this file with the completed checklist before
making the meeting directory public.

- [ ] Approval owner authorized this release.
- [ ] `meeting.json` says `publication.allowed: true`.
- [ ] No secrets, private data, local paths, raw session IDs, or raw scrollback.
- [ ] Every published artifact was reviewed and has a matching SHA-256 digest.
- [ ] Redactions are named; no content was silently invented or replaced.
- [ ] `checksums.sha256` was regenerated and checked.
- [ ] `node scripts/validate-record.mjs <meeting-dir> --public` passed.
