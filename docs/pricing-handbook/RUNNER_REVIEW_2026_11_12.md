# Review of `codex/android-cashify-rules-20261110` (12 November 2026, 02:00 IST)

Reviewed read-only: commits `769595d`, `7ae75b9`, `136b161`, `b998d5c`, plus the uncommitted wiring in that worktree at the time (calculator, service, diagnostics, questionnaire, quote page). The uncommitted part was still changing; re-check it once committed. Test suites were not run by the reviewer.

## Confirmed good

- Independent replay of all 5,537 standard OnePlus quotes through `priceDevice`: 100% within ₹10, no bias.
- Forced-age answers match the data (cracked glass, panel, bent, touch No, screen not original, warranty No, bill No); loose screen correctly does not force it.
- Accessories "both missing" uses the measured value, not a sum.
- Bonus is still applied once by the existing service line; tiers, cap, fees and tokens untouched.
- 9RT gaps are filled from the 9R and labelled inferred, never ₹0.

## Must fix before release

1. **Unrecognised answers are priced as flawless.** `evaluateRunner` sets `unknown = true` but never returns it, so an unmatched answer costs ₹0. On OnePlus 12 12/256 (R ₹33,470), each of these returns the full ₹33,470:
   - `hardware: ['hinge']`, `['s_pen']` or any unknown id on a model whose rules lack it
   - `defects: ['broken_screen']` without a `screenCondition` (the old engine charged this as cracked)
   - `screenCondition: 'Screen cracked/glass broken'` (no space) or lower-case; matching is exact-string

   Fix: when any fault or answer is unrecognised, do not price it. Return an unsupported result that the service turns into `INVALID_DIAGNOSTICS` or `MANUAL_INSPECTION_REQUIRED`. Normalise labels (case, whitespace) before matching. Treat a group in `defects` with no detail answer as invalid. Add a test for each case above.

2. **Warranty Yes with no age answer prices as "below 3 months" (the highest price).** `runnerAge(null)` returns `below3`. Where the profile has age, the service must refuse a quote with `warranty: true` and `mobileAge: null`, as it already does for a missing bill answer.

3. **Two-storage straight-line rules.** 42 OnePlus rules (and Phone 3a Lite touch) are `affine`, fitted through only two storages. Two points always fit exactly, so they cannot be told apart from fixed or percentage rules and they move oddly when the reference changes. Example: OnePlus 9 touch No goes from 64% of R at 0.6×R to 44% at 1.5×R. Only allow `affine` or `capped` with three or more storages. With two, choose fixed or percentage and keep `byStorage` measured values where neither fits within ₹10. Re-run leave-one-storage-out and report the change.

## Check and report

4. **Owner sign-off.** The branch changes the catalog (`seed_devices.ts`) and bypasses the October OnePlus display and accessory release routes for covered models. Both were listed as owner decisions in the plans. State in the PR that they need explicit approval.
5. **Multi-fault floor.** Five functional faults on OnePlus 12 give ₹1,200 (the scrap floor), because Wi-Fi, Bluetooth, fingerprint and face are each a percentage and add past 100% of R. This is inferred; there is no combination evidence. Say so in the report and put this case in the combination collection list.
6. Conflicting accessory input (`box: false` but `accessories` still lists `box`) is priced as present. Prefer the explicit `false`.
7. Run the full offline suite, both `tsc` projects and `npm run build` after committing the wiring, and report the counts.

## Re-verification of PR 32 at `082b373` (12 November 2026, 21:10 IST)

Run by the reviewer in a separate checkout, not taken from the PR text.

- Findings 1, 2, 3, 5, 6 and 7 are fixed. Unknown hardware, defects without a detail answer, and warranty Yes without an age answer now return manual inspection. Label case and spacing variants price the same as the exact label. Explicit `box: false` / `charger: false` now win.
- Replay: Nothing 1,671/1,671 and OnePlus 5,537/5,537 within ₹10, no bias.
- Offline runner: 73 passed, 0 failed, 2 skipped.
- Finding 4 (owner sign-off for catalog changes and bypassing the October OnePlus routes) is disclosed in the PR and still needs the owner.

### New finding from the fix for finding 3

8. **Eleven OnePlus age rules are now stored per storage as fixed rupees, so they no longer follow the reference.** OnePlus 11 5G, 12, 13R, 15 and 15R (`age:above11`, and for 15/15R also `3to6` and `6to11`). The age deduction is charged on every out-of-warranty, bill-No and forced-age answer (cracked glass, panel, bent, touch No, screen not original). Example: OnePlus 15 12/256 above-11 stays ₹12,980 whatever R is. Its own fallback is 22.6% of R, so a 10% reference move leaves it about ₹1,300 wrong on those quotes. Fix: when a `byStorage` rule's fallback is a percentage, store the reference each value was measured at and scale the value by `R / R_measured`, so it matches exactly at the measured reference and moves with it afterwards. Add a reference-move test for one of these models.

Not re-checked by the reviewer: browser flow after the fixes, live OTP and lead persistence, deployed revision.
