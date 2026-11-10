# Nothing / CMF pricing: verified state and Codex work order (10 November 2026)

Written after a read-only investigation of `main` at `e55e14c` and the owner's `Nothing.zip`. Nothing in the repository was changed by that investigation except this file. Codex executes the phases below in order. Read `AGENTS.md`, `docs/HANDOFF_CODEX.md`, `README.md`, `STRICT_RULES.md` and `CODEX_PRICING_HANDBOOK.md` in this folder first; they still apply in full.

## 1. What was verified

### 1.1 The teammate's bonus change

| Item | Before | Now on `main` | Commit |
|---|---|---|---|
| Tier percentages | 8% up to ₹20,000, 6% up to ₹50,000, 4% above | **unchanged** | — |
| Bonus cap | ₹2,000 | **₹1,000** | `61b7f97` (2 Nov) |
| New rule | — | final price is never above Fhoneify's own Get Upto (`min(quote, R + bonus)`) | `614677d` (2 Nov) |
| Engine version | `...reference-bonus-v2...` | `...2026-11-02-reference-bonus-v3-cap1000...` | `61b7f97` |

The percentages were not changed, only the cap. The cap is consistent in `referenceBonus.ts`, `payoutCeiling.ts`, `explain.ts`, `exactFinalQuote.ts`, `AGENTS.md` and this handbook.

**The change left `main` with a red test suite.** `node --import tsx scripts/pricing-evidence/run-offline-suites.ts` on `e55e14c`: 51 passed, **13 failed**, 2 skipped (the 30 October release was 64 passed, 0 failed). Failing suites:

`pricing.get-upto`, `pricing.payout-ceiling`, `pricing.production`, `pricing.quote-consistency`, `pricing.scoped-storage`, `pricing.team-text-wiring`, `pricing.questionnaire-metadata`, `pricing.iphone-captures`, `pricing.iphone12-captured-profile`, `pricing.apple512-isolation`, `pricing.apple-evidence-service-reconciliation`, `pricing.generalization-properties`, `pricing.release-candidate-accessories`.

- Eleven of them fail on assertions that still expect the ₹2,000 cap (for example `51000 !== 52000`, `12340 !== 12830` at reference ₹18,630). These are stale expectations.
- Two need real diagnosis, not an expectation edit:
  - `pricing.generalization-properties`: the invariant "no-calls (fixed scrap price) never beats the same phone with calls working" has 2,132 failures. It had none on 30 October.
  - `pricing.release-candidate-accessories`: `20 !== 400`.
- Stale wording that still says ₹2,000: comment at `lib/pricing/payoutCeiling.ts:38`, comment at `lib/pricing/pricingService.ts:376`, the `note` in `config/pricing-release.json`.

Not verified: which commit Render is serving. Check the deployed revision before claiming anything about production.

Effect on Nothing phones: every variant with a reference of ₹12,500 or more gets a flat ₹1,000 bonus (8% and 6% both exceed the cap). Only CMF Phone 1 is below that (about ₹920–960).

### 1.2 The Nothing data

`Nothing.zip` → 13 model folders, each with `results.json`, `results.csv`, `full_test_results.txt`, `checkpoint.json` and a `Cashify_Test_Results.zip` that is a byte-identical mirror of those four files (count once).

- **34 model/storage variants, 1,671 quotes, all `quoted`, all dated 8 November 2026.** No no-offer, no pending rows.
- Every row passes arithmetic: `base − selling = 20`, `selling − processing_fee = total`, `deduction = baseline selling − case selling`. Processing fee is 99 (1,632 rows), 49 (34) or 69 (5).
- Every variant's `final_control_matches` and `healthy_controls_match` are true.
- Each variant has: 1 flawless baseline, 17 single functional faults, 19 single physical answers, 3 "group opened, nothing wrong" controls, 3–5 initial-question "No" answers, 1–3 accessory cases and 3 age brackets (not Phone 1).
- **It is single-fault data only. There is not one quote with two faults together.**
- `checkpoint.json` records the full answer path per case, including whether Cashify showed the age page.

Models: CMF Phone 1, CMF Phone 2 Pro 5G, Phone 1, Phone 2, Phone 2a 5G, Phone 2a Plus, Phone 3, Phone 3a, Phone 3a Lite, Phone 3a Pro, Phone 4a, Phone 4a Pro, Phone 4b.

### 1.3 How the current engine does against it

Replaying all 1,671 quotes through `priceDevice` (current `calculateNothingPrice`, reference = that variant's observed base):

| | Current engine |
|---|---|
| Mean absolute error | **₹1,470** |
| Within ₹20 | 3.1% |
| Within ₹100 | 10.2% |
| Errors over ₹300 / over ₹1,000 | 1,285 / 802 |
| Worst | ₹7,963 (Phone 4a Pro, Bluetooth) |
| Overpays Cashify / underpays | 951 / 669 rows |

Worst groups: age brackets (MAE ₹3,303, the age answer is ignored), panel damage (₹2,981), initial "No" answers (₹2,209), functional (₹1,383). Even the flawless baseline is off (0.98 × R instead of R).

### 1.4 What Cashify actually does for Nothing (from the data)

The structure is very regular. Fractions below are of the variant's flawless **base** (= Get Upto = `R`), rounded to ₹10.

**Three profiles:**

| Profile | Models |
|---|---|
| P1 | Phone 1 (no warranty, bill or age question at all) |
| A | CMF Phone 1, Phone 2, Phone 2a 5G, Phone 2a Plus |
| B | CMF Phone 2 Pro 5G, Phone 3, 3a, 3a Lite, 3a Pro, 4a, 4a Pro, 4b |

**Proportional to R (same fraction at every storage):**

| Answer | P1 | A | B |
|---|---:|---:|---:|
| Fingerprint | 0.264 | 0.210 | 0.200 |
| Wi-Fi, Bluetooth (each) | 0.396 | 0.315 | 0.300 |
| Proximity | 0.030 | 0.030 | 0.030 |
| Body: more than 2 scratches | 0.059 | 0.120 | 0.120 |
| Body: 1–2 scratches | 0 | 0.065 | 0.065 |
| Body: major dents | 0.1016 | 0.160 | 0.160 |
| Body: 1–2 minor dents | 0.059 | 0.120 | 0.120 |
| Panel cracked / missing / bent | 0.1765 | 0.344 | 0.3762 |
| Loose screen | 0.1765 | 0.230 | 0.230 |
| Age 3–6 months | not asked | 0.066 | 0.1118 |
| Age 6–11 months | not asked | 0.0955 | 0.1398 |
| Age above 11 months | not asked | 0.2035 | 0.2427 |
| Face sensor | 0 | 0 | 0, except Phone 3: 0.200 |

**Fixed rupees per model (identical across that model's storages):** front camera, back camera, volume, power, battery, speaker, charging port, camera glass, vibrator, microphone, all screen scratch/chip answers, all spot/line/discoloration answers, missing box, missing charger. **Silent button and audio receiver are ₹0 on every variant.**

**Warranty "No" = bill "No" = age "Above 11 months"**, to the rupee, on all 31 variants that ask.

**Conditions that skip the age page (Cashify forces the above-11-months state):** cracked glass, panel cracked/missing, bent panel, touch not working, screen not original, warranty No, bill No. Their deductions decompose exactly:

- screen not original = age-above-11 + fixed (₹2,250–4,050 by model)
- cracked glass = screen-not-original + fixed (₹720–1,310)
- touch not working = screen-not-original + fixed (₹2,750–4,950)
- On Phone 1 (no age) all three are plain fixed rupees: ₹2,700 / ₹3,570 / ₹6,000.

Spots, lines, discoloration, chipped glass, loose screen and "cannot make calls" do **not** force the age state.

**Cannot make calls:** flat base ₹800 (CMF 1, CMF 2 Pro, Phone 1, 2a, 2a Plus, 3a Lite) or ₹1,200 (Phone 2, 3, 3a, 3a Pro, 4a, 4a Pro, 4b). It is per model, not a clean price threshold; store it per model.

**Accessories are not additive.** CMF 2 Pro: box ₹450, charger ₹300, both ₹450. Phone 1: ₹500, ₹400, ₹500. Phone 3, 3a Lite, 4a 6/128: box ₹300, charger ₹0. All other variants are offered the box only (₹150 on profile A, ₹300 on B).

One inconsistency to keep, not smooth: Phone 3a Lite touch-not-working differs between storages (extra ₹3,640 at 128 GB, ₹3,850 at 256 GB).

### 1.5 Gaps found around the data

- **Catalog:** `lib/seed_devices.ts` has 31 Nothing variants; the data has 34. Missing: Phone 4a 6 GB/128 GB, Phone 4b 6 GB/128 GB, Phone 4b 8 GB/128 GB. There is a placeholder row `Nothing Phone 4b` / storage `128 GB` / id `11111111-2222-3333-4444-555555555555` / base ₹29,999 / empty Cashify link. The CMF Phone 2 Pro 8/128 link has a typo (`phoe`).
- **References:** the committed snapshot `lib/cashify_prices.json` is ₹400–2,500 below the 8 November bases and has no Phone 4b or 4a 6/128 entry. The production `ReferencePrice` rows were not read.
- **UI (`app/quote/page.tsx`):** `hasChargerInBox` shows the charger only for Phone 3. Cashify asks it on CMF Phone 2 Pro and Phone 1, where it costs money. The quote page voids warranty for spots, lines, discoloration and loose screen (`warrantyVoidedByDiagnostics`); for Nothing, Cashify does not.
- **Engine:** `calculateFhoneifyPrice` drops the age answer when the crawled profile says `ageMode: NOT_ASKED` unless the device is an Apple evidence model. Nothing's age page is conditional in the same way.

## 2. Owner decisions (Phase 0 can start now; 2–4 are needed before Phases 2–4)

1. **₹1,000 cap: approved by the owner on 10 November 2026.** Phase 0 updates the stale ₹2,000 test expectations to the ₹1,000 policy. Decisions 2–4 are still open.
2. **Is "final price never above Get Upto" (`614677d`) approved?** It lowers quotes wherever the legacy engine's box bonus pushes the condition value above the reference.
3. **Multi-fault quotes for Nothing** (no evidence yet): price them with the inferred combination rule in Phase 3, or send them to inspection until combination quotes are collected. Recommended: price, labelled inferred, and collect the Phase 7 quotes.
4. **Catalog:** approve adding the 3 missing variants and removing the placeholder Phone 4b row. This changes `seed_devices.ts` and needs matching database/reference rows.

## 3. Work order for Codex

Work on a branch `codex/nothing-pricing-20261110` from current `main`. One commit per phase. Do not merge or deploy.

### Phase 0 — Make `main` green again (separate PR, before any Nothing work)

1. Re-run `node --import tsx scripts/pricing-evidence/run-offline-suites.ts`; confirm the 13 failures above.
2. For the eleven cap-expectation suites: update only assertions whose expected value was derived from the ₹2,000 cap, recomputing from `referenceBonus`. Do not touch any other golden.
3. Diagnose the two real ones. For the no-calls invariant, find which of `61b7f97` or `614677d` introduced it (run the suite at each parent). Fix the code if it is a defect; do not weaken the invariant.
4. Fix the three stale ₹2,000 comments/notes listed in 1.1.
5. Gate: 64 passed, 0 failed, 2 skipped; both `tsc` projects; `npm run build`.

### Phase 1 — Intake

1. New `scripts/pricing-evidence/import-nothing-data.ts` (do not reuse the Apple importers). Input: a folder path argument. Read `results.json` + `checkpoint.json` per model folder; treat the inner ZIP as a mirror and verify its hashes match.
2. Hard-fail on: arithmetic mismatch, a status other than `quoted` it does not understand, a case label it cannot map, a variant without baseline or final control.
3. Output to `data/pricing-evidence/nothing-2026-11-08/` (add to `.gitignore`; the repository is public): `inventory.json` with SHA-256 per file, `measurements.jsonl` with one row per quote: model, RAM/storage, case id, the answers as `DiagnosticsType`, the full recorded answer path, whether the age page was shown and what was selected, base, selling, fees, observed time, source pointer.
4. Gate: 13 folders, 34 variants, 1,671 measurements, 0 excluded. Commit a small parser fixture (2–3 synthetic rows), not the data.

### Phase 2 — References and catalog (read-only on production)

1. Read-only query of production `ReferencePrice` and the questionnaire profile for all Nothing/CMF keys. Report per variant: database reference, last verified, 8 November base, difference; and stored `warrantyMode`/`billMode`/`ageMode`.
2. Do not write references. If rows are missing or stale, report it; the weekly refresh is the fix and is out of scope.
3. With owner decision 4: add the 3 missing variants, remove the placeholder, fix the `phoe` link. Confirm the reference refresh can match the new keys.
4. Phone 1 must resolve to `NOT_ASKED` for warranty, bill and age. Every other model must reach the engine with the age answer intact (Phase 4).

### Phase 3 — The Nothing rule model

New folder `lib/pricing/nothingCashifyModel/` (`model.ts`, `calibration.json`, `index.ts`). Do not import from or edit `appleCashifyModel`. Pure, deterministic, browser-safe, every rupee explained in a breakdown, every value labelled `measured` or `inferred`.

Rule, on the base basis (clean phone = `R`):

```
state    = max(age answer, forced above-11 if any forcing condition)   # charged once
value    = R
         − age[state] × R
         − screen group        # largest of: touch extra, cracked extra + orig extra, orig extra, chip/scratch, spots, lines, discoloration
         − body scratches − body dents            # pct of R
         − panel/bent/loose (extra above the forced age part)
         − Σ functional         # fixed ₹ or pct of R per code
         − accessories          # measured triple: box, charger, both
cannot make calls → the model's flat scrap base (800 or 1,200)
round to ₹10; never below the scrap base
```

1. `scripts/pricing-evidence/fit-nothing-calibration.ts` derives every value from `measurements.jsonl`. No hand-typed numbers. For each (model, answer) it decides fixed vs fraction from that model's own storages and records which won.
2. Store the forced-age decomposition explicitly (orig extra, cracked extra, touch extra, panel extra) so the age part is never charged twice.
3. Single answers are `measured`. Any quote with two or more faults is `inferred`. The combination rule above (largest-wins inside the screen group, add across groups, age once) is the structure measured on iPhones; it is a labelled assumption for Nothing until Phase 7 data exists. Do not copy any Apple rupee value.
4. A variant of a known model at an unseen storage uses the model's fractions and fixed values (`inferred`). An unknown Nothing model returns null → existing `calculateNothingPrice`, unchanged.
5. Keep the Phone 3a Lite storage-specific touch value as measured.

### Phase 4 — Wiring

1. `calculateNothingPrice`: try the new model first; on null fall back to the existing code byte for byte. The existing function and its constants stay.
2. `calculateFhoneifyPrice` (age pass-through near the `appleEvidenceAsksAge` line): keep `mobileAge` for Nothing models whose calibration has an age table.
3. `warrantyVoidedByDiagnostics`: return false for Nothing evidence models, as for Apple evidence models. The model decides the age state from the raw answers.
4. `pricingService.ts`: confirm a Nothing quote in hybrid mode keeps the model's value (the legacy fallback path must not re-price it), that `equivalentBasis` is `base`, and that the bonus is applied exactly once by the existing line `applyCompetitorUplift(reference, equivalent)`. Do not change `referenceBonus`, tiers, cap, floor, fees, coupon or token code.
5. Bump `PRICING_ENGINE_VERSION` with `+nothing-reference-rules-v1`.
6. UI: show the charger question exactly for the variants whose data offers it; show fingerprint for all; face sensor may stay for all (₹0 except Phone 3). No browser pricing.

### Phase 5 — Tests

Add under `scripts/test/` and register in the offline runner:

- `pricing.nothing-rules.test.ts`: per profile, single-answer values; fixed stays fixed and fraction scales when `R` changes; age charged once when a forcing condition is combined with an age answer; warranty No = bill No = above 11; accessories not additive; calls No scrap; Phone 1 ignores warranty/age.
- `pricing.nothing-service.test.ts`: through `createPricingService` with an injected read-only repository: quote = equivalent + `min(R × tier, 1000)`, signed token price matches, coupon headroom valid, never above Get Upto.
- Importer fixture test.
- Dataset reconciliation test that skips explicitly when the private data is absent.

### Phase 6 — Validation and acceptance gates

Report all of these, with over-quotes and under-quotes separately and the worst cases named.

| Check | Gate |
|---|---|
| In-sample replay of 1,671 quotes through the production service route (regression, not independent) | ≥ 99% within ₹20; MAE ≤ ₹10; 0 errors over ₹300 |
| Leave-one-storage-out per model (refit without that storage) | ≥ 97% within ₹20; report every miss |
| Leave-one-model-out within its profile | report only; no gate; shows what an unseen Nothing model would get |
| All catalog Nothing variants × every single answer through the service | priced or explained; none silently legacy |
| Reference moved ±10% | fixed values unchanged, fractions scale, bonus recalculated |
| iPhone and all other brands | every pre-existing suite unchanged and passing |
| Offline runner, both `tsc`, `npm run build` | all pass |

Do not widen a gate, drop a row or add an exact-price lookup to pass.

### Phase 7 — Combination evidence (owner's team collects; Codex prepares the list)

Generate `docs/next-quotes/nothing-combinations.md`: about 25 cases per profile on one variant each (Phone 1 8/128, Phone 2a 8/128, Phone 3a 8/128), for example: age above 11 + cracked glass; screen not original + cracked; touch No + cracked; spots + lines; body scratches + dents; panel cracked + bent; cracked glass + panel cracked; two fixed functional faults; Wi-Fi + Bluetooth; fingerprint + Wi-Fi; box missing + age; warranty No + each age bracket; five faults together; calls No + another fault. Score them against the frozen Phase 3 rules **before** refitting, then refit and move those shapes from `inferred` to `measured`.

### Phase 8 — Report and PR

1. `docs/pricing-handbook/NOTHING_RELEASE_2026_11.md`: counts, measured vs inferred, the gate table with actual numbers, remaining errors, what was not verified (live OTP/lead flow, deployed revision, combinations).
2. PR from the `codex/` branch: behaviour change, pricing/catalog/config impact, commands and results, screenshots of the Nothing quote flow. Check the branch contains only your commits.
3. No merge, deploy, reference refresh, production write, auth or schema change. Raw quotes stay local.

## 4. Things Codex must not do

- Change tiers, cap, floor, fees, coupon, signed tokens, admin auth, Cashify refresh or schema.
- Touch `appleCashifyModel` calibration or any other brand's tables.
- Edit a failing golden without showing which approved policy change makes the new value correct.
- Run `pricing.quote-integration` or anything that writes to the production database.
- Commit `Nothing.zip`, `measurements.jsonl` or any quote-level export.
- Call the result perfect. Single faults will be measured; combinations are inferred until Phase 7.
