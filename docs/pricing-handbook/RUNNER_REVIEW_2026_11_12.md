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
