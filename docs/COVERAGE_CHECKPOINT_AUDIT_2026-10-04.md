# Coverage checkpoint audit (2026-10-04)

- Branch base: 55d4d6bd607fa0fb7cd48cc7be5ae5aeaf1f3f12
- Replay timestamp: 2026-10-03T19:00:00.000Z
- 150-case production replay eligibility: 34/150. This is offline eligibility, not proof of a live customer price.
- Exact-identity observation join: 148/150 have a tester or traced observation after joining the later controls; missing: FM043_B, FM043_C. This supersedes the historical 144/150 count and six-missing-C claim.
- Observed-point eligibility: 40 before -> 77 in the earlier snapshot -> 80 after exact follow-up joins. Production-reference replay eligibility remains 34.
- Research specs reviewed: 23; see the JSON artifact for exact variant, measured reference, questionnaire regime, clean control, supported conditions and guard. A generated spec is development fit, not independent validation.
- Collection: 24/24 reservations in the coordinated release campaign; 19 attempt identities overlap the handoff copy. Separate 20/20 release-review and 120-attempt workbook campaigns have no transferable allowance. Verified remaining new attempts: 0; collection disabled.
- Holdouts and failures remain preserved in source evidence.

## Reproduction and input limitation

Run npx tsx scripts/pricing/reconstruct-coverage-case-inputs.ts, rerun the coverage-gap-register command shown at the top of scratch/coverage-expansion/replayed-gap-2026-10-04.md, then run npx tsx scripts/pricing/audit-coverage-checkpoint.ts --write. Input paths and SHA-256 hashes are in scratch/coverage-expansion/checkpoint-audit-2026-10-04.json. The raw canonical workbook register is absent from this branch; the rerun uses a reconstructed register from the exact case IDs and saved condition labels. This limitation is explicit, and original tester/collector observations remain separate from synthetic inputs.
