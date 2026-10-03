# Why 0/8 release candidates accept the saved production inputs (Claude, 2026-10-03)

Reproduce: `npx tsx scripts/pricing/claude-eligibility-register.ts` (database-free) → `scripts/pricing/fixtures/claude-eligibility-register-2026-10-03.json`. Dry-run: `scripts/pricing/fixtures/claude-reference-dry-run-2026-10-03.json`.

## Diagnosis

Every guard in `lib/pricing/releaseCandidate.ts` was evaluated independently against the approved saved export (`release-saved-production-inputs-2026-10-02.json`, sha `C14D4848…1C22`, queried 2026-10-02T18:11Z) at export time and at 2026-10-03T12:00Z.

For **all eight scopes the only failing guard is `reference === validatedGetUpto`**. Route evidence, stored profile (status OK, fresh, modes equal route), Cashify exact/fresh reference and calibration freshness all pass at both times.

| Category | Scopes |
|---|---|
| Missing / wrong-variant reference | none (all EXACT Cashify matches, correct URLs) |
| Stale reference under the ingestion policy | none (verified 2026-09-27, FRESH under the 14/30-day policy) |
| Unverified / conflicting questionnaire metadata | none for these eight |
| Guard pinned to the calibration amount | all eight (the export predates calibration) |
| Legitimate reference outside the measured domain (after live check) | iPhone 12 Pro 256GB only |

Every stored reference was last verified **2026-09-27, before the 2026-10-02 calibration captures**, and sits ₹20–240 below it. Cashify's Get Upto rose between those dates. The stored amounts were valid older verifications, not wrong inputs.

## Live dry-run (existing mechanism, no writes)

`scripts/reference-pricing/refresh-from-cashify.ts --dry-run` for the eight exact keys: existing `runRefreshJob` and ingestion, dry-run repository discarding writes, null run recorder, file lock only. It ran from a worktree without `.env`, so no production database was reachable. Result: 8 fetched, 0 rejected.

| Scope | Saved prod (09-27) | Calibration (10-02) | Live (10-03) | After refresh |
|---|---:|---:|---:|---|
| Mi A2 4/64 | 2,500 | 2,520 | 2,520 | equals calibration |
| 14 CIVI 8/256 | 18,720 | 18,900 | 18,900 | equals calibration |
| Note 9 Pro 4/128 | 4,940 | 4,990 | 4,990 | equals calibration |
| Note 10 Pro Max 6/128 | 5,800 | 5,970 | 5,970 | equals calibration |
| OnePlus Nord 8/128 | 8,260 | 8,340 | 8,340 | equals calibration |
| Oneplus Open 16/512 | 51,410 | 51,650 | 51,650 | equals calibration |
| S23 FE 8/128 | 17,880 | 18,060 | 18,060 | equals calibration |
| iPhone 12 Pro 256GB | 24,220 | 24,460 | 24,780 | outside measured domain |

## Smallest evidence-supported resolution

1. **No guard or coefficient change.** Applying the existing refresh to these seven keys (an owner-approved production write, through the refresh job, never raw SQL) makes the unchanged equality guard pass. Recheck the current production record at approval time.
2. iPhone 12 Pro 256GB stays refused. Its Get Upto moved to 24,780, so it needs a new matched clean control/recalibration. It is also separately blocked by the clean-above-Get-Upto headline approval.
3. Counterfactual (diagnostic only): running the candidates at the stored 09-27 amounts shifts each clean baseline by the same −20 to −240 as the reference. The guard is protecting the calibrated baseline, as intended.
4. Consequence to plan for: the equality guard is pinned to the calibration amount. Any future Cashify Get Upto movement returns a scope to inspection until a matched clean control recalibrates it. That is a recalibration-cadence question, not a reason to invent a tolerance band.

Budget: 8 of 24 attempts used (live reference fetches, ledger `scratch/pricing-coordination/claude-evidence/attempt-ledger.jsonl`). No production query or write.
