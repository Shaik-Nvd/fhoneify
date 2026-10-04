# Restore measured pricing corrections without disabling ordinary quotes

Base: deployed main `1d51f9a0901a1aeb3dab77265b2e610a61f5db1f` (PR #13).

## Behavior

The new `hybrid` mode evaluates the existing guarded correction against one reference/profile lookup. A qualifying candidate or accessory correction is used with the existing uplift, cap, fee and rounding. A correction rejected for missing/expired evidence, moved reference, unmatched questionnaire or unsupported condition returns the unchanged legacy calculation for those same inputs. No calibrated reference is invented, copied into production or used to re-anchor an unmeasured damage deduction.

Explicit inspection remains for unknown/conflicting/incomplete diagnostic options, exact Xiaomi 14 Ultra 16/512 baseline risk, and exact Redmi Note 15 Pro Plus 12/512 hardware faults. Valid nonworking-call answers retain the existing legacy dead-phone quote. Missing references retain their existing error behavior.

The merged expansion file contains 44 routes: the original 21 unchanged plus 23 previously audited measured-point routes. Loading them does not establish production eligibility or independent accuracy. Existing reference, variant, freshness, questionnaire, accessory and measured-condition checks are unchanged. The newest 23 profiles remain development fits. Moved/missing production references cause legacy fallback rather than activating a correction.

Tokens distinguish corrected and fallback selections. Old legacy/release tokens recompute when entering hybrid; hybrid tokens recompute after rollback or a corrected/fallback selection change. Known unsafe current answers cannot bypass inspection using an old token. Lead storage and the condition-bucket endpoint use the same authoritative selection; the latter resolves the canonical catalog identity by device ID.

## Validation

All ten selected offline suites passed:

- Hybrid: 16 groups, including catalog-wide availability parity, expiration, reference movement, invalid inputs, token transitions and one lookup per quote.
- Catalog parity: 6,768 unchanged quotes and 3 exact unsafe-profile refusals across 2,257 valid catalog rows with clean, body-scratch and nonworking answers. References in this check are synthetic; this is availability evidence, not pricing accuracy.
- Real HTTP/controller/token/lead flow: 36 groups, four in-memory leads, zero database writes.
- Production pricing: 37; pricing goldens: 27; INR deductions: 22; reference data: 28; quote consistency: 10.
- Strict release policy: 12 groups; measured-point profiles: 10 groups; accessory scope: 17 checks.
- Next TypeScript and production build pass. Existing quote-page hook/image warnings remain. Server TypeScript reports the same six pre-existing admin/inventory/standalone-script errors; no new errors.
- Independent code review found the nonworking-call guard issue; it was corrected and covered by tests. Final review found no remaining implementation blocker.

At eligible inputs, Nord 8/128 reproduces gross 8,986 (net 8,887) clean and gross 3,931 (net 3,832) display lines. These are reproductions of preserved measurements, not fresh Cashify validation.

No Cashify attempts, reference writes or production leads were created. The exhausted collection ledgers were not changed.

## Activation and rollback

The committed file uses `mode: "hybrid"` and preserves `releaseCandidate: false`. Older code reading only the boolean remains legacy. New code reads the explicit hybrid mode. `PRICING_RELEASE_CANDIDATE=off` always overrides it; `hybrid` selects hybrid explicitly. Historical environment `on` still selects the strict release-candidate policy and must not be used for this rollout.

After normal PR review/merge/deployment, verify API `/health` reports hybrid with 44 loaded routes. Quote Nord at its eligible current metadata; quote an uncovered iPhone 17 Pro and confirm it retains its legacy price/token. Verify missing-reference errors and exact unsafe-profile inspection. Test reload and lead behavior locally; do not create production customer leads for smoke checks.

The first expanded route expires 2026-10-15T14:04:30.047Z; expiry is per route/spec and may differ from older reports. Expired correction evidence falls back to legacy, preventing another blanket inspection outage.

Rollback: set `PRICING_RELEASE_CANDIDATE=off` and restart, or change the committed mode to legacy. Hybrid tokens then recompute under legacy. Reference history and measurements are untouched.

## Limits

This fixes selection/availability and restores eligible measured corrections. It does not make legacy estimates accurate on every phone or condition, prove independent accuracy across 50 workbook devices, or fill missing reference/evidence gaps. No broader pricing completion claim is justified.
