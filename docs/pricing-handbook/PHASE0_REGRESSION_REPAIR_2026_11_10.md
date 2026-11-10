# Phase 0: pricing regression repair, 10 November 2026

Scope: Phase 0 of `NOTHING_CODEX_PLAN.md`, with the companion `ONEPLUS_CODEX_PLAN.md` read for sequencing. The plans were read at `df9d40d` in the existing Nothing worktree. This branch starts at fetched `origin/main` commit `e55e14cf9e44813f991d76b4f0e919bf50aa38f2`.

## Changes

The approved INR1,000 bonus cap was already implemented on main by `61b7f97`. Updated the stale cap-derived expectations in the eleven suites named in the plan and the service replay helper they consume. Expected bonus amounts use `referenceBonus`; independent policy assertions remain in the reference-bonus and catalog property suites. Tightened the affected captured-payout corridor assertions to INR1,000. No recorded Cashify condition-price fixture changed.

Updated the three stale comments/notes in `payoutCeiling.ts`, `pricingService.ts`, and `config/pricing-release.json`. These are the only changes outside tests and the offline replay helper. Runtime pricing behavior is unchanged.

## Diagnosis of the two suspected defects

Both historical comparisons use the same deliberately unreachable database endpoints as the offline runner:

| Revision | Generalization properties | Accessory suite |
|---|---|---|
| `ba325c5` (parent of Get Upto ceiling commit `614677d`) | Pass; 0 blocking failures, 2,132 known-policy reports | Pass, 17 checks |
| `614677d` (parent of bonus-cap commit `61b7f97`) | Pass; 0 blocking failures, 2,132 known-policy reports | Fail: 20 versus 400 |
| `e55e14c` baseline | Fail from stale bonus oracle: 429,412 blocking failures; same 2,132 known-policy reports | Fail: 20 versus 400 |

The 2,132 no-calls reports already exist before either November change. The test explicitly classifies them as known-policy reports, reflecting a fixed no-calls scrap value exceeding some severely damaged working-phone values. Neither November commit introduced them. Preserved the invariant, its reporting, and every scrap/repair value; updating the bonus oracle clears the blocking failures without weakening the invariant.

For the OnePlus 9 accessory comparison at reference INR9,710, the legacy condition-equivalent exceeds the corrected equivalent by exactly INR400. `614677d` caps the final legacy quote at Get Upto, so the final quote difference becomes INR20. The corrected equivalent is Selling INR9,690; the legacy equivalent remains INR10,090. The strengthened test checks both the unchanged INR400 condition difference and each final quote against `min(condition + bonus, reference + bonus)`. It also checks the INR20 final difference. No ceiling was removed or policy decision inferred.

## Validation

- Baseline offline runner: 51 passed, 13 failed, 2 explicitly excluded.
- Final offline runner: 64 passed, 0 failed, 2 explicitly excluded.
- Both Next and server TypeScript projects: exit 0.
- `npm run build`: exit 0 after allowing the existing Google Fonts downloads. The initial sandboxed attempt failed fetching fonts. Existing lint/Browserslist/Next configuration warnings remain.
- `git diff --check`: clean.

The runner excludes the production-writing quote integration test and the browser-only suite. Some suites also explicitly skip unavailable private evidence cohorts. A green runner does not establish new Cashify parity or production/browser/OTP/lead persistence. No production database test, migration, reference refresh, auth change, browser flow or deployment was performed. The Nothing ZIP remains untouched and uncommitted; Phase 1 intake has not started.

## Sequencing and remaining decisions

The companion plan requires the Android branch to start from main after Phase 0 has merged. Keep this Phase 0 change as a separate PR. The owner explicitly prohibited merging and deployment without instruction, so those actions remain pending.

Nothing phases still need the plan's owner decisions on the existing Get Upto ceiling, inferred multi-fault pricing, and catalog changes. The companion plan also introduces OnePlus work and its own pending decisions. No approval for these has been inferred from elapsed time or from the regression repair.

Rollback of this Phase 0 commit restores assertions/documentation only; it does not change production pricing. Private execution logs and historical comparisons are kept locally under `release-test-logs/phase0/` and are not part of the public PR.

## Review

A separate review found no blocking issues and independently passed accessories (17 checks), reference-bonus (4,065 checks), Get Upto (5 checks), and diff whitespace verification. Deferred minor: pre-existing INR2,000 corridor allowances outside the eleven failing suites remain in composed-release, exact-final-quotes, glass-shadow-http, six-iphone-router, and regression tests. They can miss route-specific breaches of the newer cap; independent current-cap checks still pass. This follow-up is outside the plan's targeted failing-suite edits.
