# Final iPhone data integration — 30 October 2026

This report records the completed implementation and local verification. It supersedes the analysis-only status in FINAL_DATA_REPORT.md and the original IMPLEMENTATION_HANDOFF.md. GitHub publication and the actual serving commit must be verified separately; the presence of this report alone does not prove production deployment.

## Second engine pass (branch `claude/final-iphone-engine-20261030`)

The first pass below reproduced on re-check: all 47 ZIPs in `last_data` are inventoried with matching SHA-256, and a refit with its code reproduces its committed calibration exactly. In-sample it was strong (final intake MAE ₹8.11), but its own held-out numbers showed weak generalization: unmeasured codes were filled from the three models with the closest reference, ignoring generation and scaling fixed repair costs by phone value. This pass uses the same evidence to fix that. Engine version: `...+apple-reference-rules-v5-final-intake-sibling-inference+...`.

### What the evidence established

- **Fixed rupees versus fraction of reference.** 920 model × single-change groups with two or more storages were checked. Fixed won 665, a fraction won 163, and 92 were ties. The calibration matches the decisive winner in 803 of 808 cases. By code:
  - Repairs are fixed rupees: cameras, buttons, port, speaker/earpiece/microphone, battery, glass and display spots/lines.
  - These are proportional: Wi-Fi/Bluetooth (F05/F14), Face ID (F08), Touch ID (F04) and proximity (F16).
  - Body, panel and touch vary by generation.
  - The 5 disagreements fit neither form, for example 6S Plus 16 GB D01 at ₹1,610 against ₹2,120 elsewhere. They were left unchanged.
  - The per-storage functional fractions (13 Pro, 13 Pro Max, 15) are Wi-Fi/Bluetooth/Face ID fractions that vary by at most 3% between capacities. They remain fractions of the current reference.
- **Report baseline B versus database reference R.** 71 of the 80 final variants have a verified database reference (read-only snapshot, refreshed 2026-10-25). For 65 of them, B equals R exactly. This includes iPhone 11, 11 Pro Max, 7, 8 and 8 Plus, where the 28 October data had shown a ₹150–400 gap. No clean offset is applied. Six variants have B ₹170–330 above R, consistent with market movement after the refresh: 12 Pro 128, 12 Pro Max 128, 13 256/512 and SE 2020 128/256. Nine variants have no database row: iPhone 15 and 15 Plus (all capacities) and 12 Mini (all capacities).

### Engine changes

1. **Nearest-sibling inference for unmeasured codes.** A code a model never quoted is now taken from the single nearest model that measured it. Distance is |ln(reference ratio)| + 0.1 × |launch-year gap|. A fraction is carried unchanged; a fixed repair is carried as rupees × (reference ratio)^0.25. The rule was chosen by hiding each of 1,493 measured (model, code) values and predicting it from the other models:

   | Models | Previous rule MAE | New rule MAE | Worst error, previous → new |
   |---|---:|---:|---:|
   | All | ₹653 | ₹297 | ₹25,197 → ₹7,467 |
   | 2022 and later | ₹1,254 | ₹412 | |
   | 2019 and earlier | ₹160 | ₹134 | |

   For camera and the two minor-fault groups the sibling is now tried first, because it beat the model's own same-class codes: ₹160 vs ₹331, ₹57 vs ₹373 and ₹32 vs ₹163. Display, battery, body, panel and Wi-Fi keep the model's own codes first, which won there (₹0–253 vs ₹116–588). Every such value stays `inferred` and records its source.
2. **Combination-only codes are solved from their combinations.** A code quoted only together with codes that have isolating quotes is now solved directly by bisection on those combinations. The old prior sat in a flat largest-wins region that the optimizer never left.
   - iPhone 11 Pro and 11 Pro Max major discoloration (D06): ₹3,123 → ₹5,500 / ₹6,600, matching the observed D05+D06 quotes.
   - iPhone 6 and 6S major discoloration: ₹0 (the answer was ignored) → ₹990 / ₹1,320.
3. **Tested and rejected.** Starting the joint fit of combination-only codes from the sibling value improved unseen shapes (p1 MAE ₹167) but worsened unseen storage (p2 errors over ₹300 rose from 262 to 284). It also carried the iPhone 15 Pro's fixed body-scratch form into the iPhone 17, which broke a live Cashify quote check. It was not shipped.

Production effect: 82 calibrated code values moved, 66 of them newly inferred from the nearest sibling. One measured value moved by ₹101 (iPhone 17 touch). These mostly affect models where most codes are still inferred: iPhone 12, 14 Plus, 14 Pro Max, 17, 17 Pro, 17 Pro Max, 17e, Air and XR. Examples: XR earpiece ₹200 → ₹2,444 (from the XS); 17 Pro charging port ₹1,500 → ₹2,626 (from the 16 Pro Max).

### Accuracy (same evidence, same gates; no threshold changed)

In-sample replay through the production quote service, with the recorded-final-price cache disabled:

| Cohort | Before | After |
|---|---|---|
| All usable evidence (10,390 numeric, 10,345 priced, 45 inspection) | MAE ₹16; 96.3% within ₹20; 98.2% within ₹100 | MAE ₹16; 96.5% within ₹20; 98.3% within ₹100 |
| Original cohort (6,882 cases) | MAE ₹20.24; 96.49% / 98.32%; 62 errors over ₹300 | MAE ₹20.10; 96.53% / 98.33%; 61 errors over ₹300 (limit 80) |
| Final intake, report-proxy R (3,700) | MAE ₹8.11; 98.16% within ₹100; worst ₹970 | MAE ₹7.88; 98.27% within ₹100; worst ₹970 |
| Final intake, unique new IDs (3,508) | MAE ₹8.55; 32 errors over ₹300 | MAE ₹8.32; 32 errors over ₹300 (limit 40) |
| Final intake at verified database R (3,291 cases, 71 variants) | not measured | MAE ₹25.13; 88.8% within ₹20; 90.7% within ₹100 |

No model's in-sample error got worse. The database-R cohort is worse than the proxy cohort only because of the six drifted variants. That is reference drift picked up by the weekly refresh, not rule error.

Held-out validation: every fold refits on training rows only.

| Protocol | Before: MAE / p95 / >₹300 / >₹1,000 / worst | After: MAE / p95 / >₹300 / >₹1,000 / worst |
|---|---|---|
| p1 unseen condition shapes (10,344 priced of 10,390) | ₹219.5 / ₹1,000 / 1,498 / 485 / ₹24,190 | ₹173.0 / ₹850 / 1,120 / 382 / ₹24,190 |
| p2 unseen storage (10,013 priced of 10,057) | ₹47.4 / ₹40 / 262 / 110 / ₹9,080 | ₹32.0 / ₹40 / 240 / 88 / ₹8,050 |

### Remaining gaps

- **Touch-failure combinations on 16e, 17 and 17 Pro when touch is held out.** Cashify pays about 23% of R; for example 16e 512 GB touch-only is ₹9,670 at R ₹41,220. No prior predicts this, so it is the p1 worst-case tail. In production those touch values are measured.
- **Multi-defect Air quotes** (9 simultaneous conditions) still err by ₹11,000–15,000 when held out.
- **Display-spot cases on the 6S Plus 16 GB** (D01/D04) stop at ₹660, against ₹210 predicted. A minimum quote may apply; it is not modelled, because that would be an invented rule.
- **No numeric quotes** for 17, 17 Pro, 17 Pro Max, 17e or Air in this intake: those reports are pending templates. Most of their codes remain inferred.
- **Reference measurement.** 9 final variants have no verified database reference; their error is measured only against the report proxy.

### Verification run for this pass

- 64 offline suites passed, 0 failed, 2 deliberately skipped (production-writing integration, browser-only). These include the new `pricing.final-iphone-rules.test.ts`, which covers the inference rule, combination-solved D06, fixed versus proportional behaviour when R changes, and the served bonus formula.
- `tsc` passed for `tsconfig.next.json`, `tsconfig.server.json` and the changed scripts. `next build` passed.
- No database write, reference refresh, auth change or deployment.
- Quote corpus and validation rows stay local and gitignored.

## What changed (first pass)

- Integrated the final team-supplied Cashify folder: 47 ZIPs, 37 byte-distinct archive contents, 4,334 priced report records across 25 models and 80 model/storage pairs. Pending and unavailable rows remain separate.
- Recovered 5,220 explicit compact answer fields, including Available/Selected accessories, positional answer arrays, physical details and actual age selections. No missing core answers remain among priced final-intake records. Source numbering systems stay separate.
- Imported 3,700 normalized measurements after repeat/export deduplication. Four supplemental iPhone 6 records lack a same-report baseline and remain explicitly excluded from fitting. Of the 3,700, 192 existing 15 Pro measurement IDs are already in the previous intake; the combined loader counts them once and unions their provenance flags.
- Fitted the existing reference-driven rule engine, now containing 46 iPhone profiles. The 12 Mini uses its own 64/128/256 GB observations rather than an iPhone 12 fallback.
- Protected controlled accessory costs from drifting during mixed-fault fitting. For proportional functional costs that one shared fraction cannot reproduce within the existing ₹60 single-fault gate, fitted capacity-specific fractions from training rows. They still multiply the current reference; an unseen capacity falls back to the shared model rule. Fixed component costs remain fixed.
- Preserved the pending Air microphone correction in the source branch, protected age-answer handling, and bumped the signed engine version to `fhoneify-pricing/2026-10-28-reference-bonus-v2+repair-safety-v1+apple-age-answer-v1+apple-reference-rules-v4-final-intake+legacy-physical-v1+payout-ceiling-v3`.
- Added the portable handbook, Mi/Xiaomi starter prompt, root AGENTS instructions and cross-platform offline suite runner. Xiaomi and other brands' calibration tables were not changed.

## Price rule remains unchanged

Calculate the Cashify condition-equivalent C using the current exact-variant reference R and the calibrated deductions. Add `min(R × tier(R), ₹2,000)` once, with the approved 8%/6%/4% thresholds and existing ₹100 final-engine-price floor. Preserve existing fees, coupon headroom, signed tokens and server authority. There is no production lookup of recorded final phone prices.

Imported reference values are labelled **flawless-base proxies**, not verified historical database Get Upto values. Runtime still reads current references through the existing repository. Accuracy against these controlled proxies does not prove that every live database reference equals the source session's flawless value.

## Reconciliation against observed quotes

These are in-sample checks after fitting, through the production-configured quote service with an injected read-only reference repository and recorded-final-price cache disabled.

| Cohort | Priced / cases | Mean absolute error | Within ₹20 | Within ₹100 | Errors above ₹300 |
|---|---:|---:|---:|---:|---:|
| Original complete cohort | 6,837 / 6,882 | ₹20.24 | 96.49% | 98.32% | 62 / original limit 80 |
| Final intake, including overlap with earlier source | 3,700 / 3,700 | ₹8.11 | 96.27% | 98.16% | see unique cohort below |
| New measurements after removing existing IDs | 3,508 / 3,508 | ₹8.55 | 96.07% | 98.06% | 32 / size-scaled limit 40 |

Before this refit, final-intake mean error was ₹226.22, with 4 inspections. Afterwards every normalized final-intake observation is priced; p95 error is ₹20, and the worst error is ₹970. The source-linked worst cases remain in service-after.json. Original inspection outcomes remain 45; no ordinary quote was hidden to improve the accuracy percentage.

The original cohort's release thresholds were kept unchanged: at least 95% within ₹20, 97.5% within ₹100, MAE ≤₹30 and at most 80 errors above ₹300. The added cohort has the same percentage/MAE limits, with the absolute residual budget scaled by its case count. This avoids applying an original fixed-sample count to a larger sample while continuing to test every complete observation.

## Held-out checks

Every fold refits on training rows only. Repeated condition shapes are grouped together, and held-out capacities cannot obtain their own capacity coefficient from the test data.

| Protocol | Quotes priced / numeric test cases | Mean absolute error | p95 | Worst error |
|---|---:|---:|---:|---:|
| Unseen condition shapes (5 folds) | 10,344 / 10,390 | ₹219 | ₹1000 | ₹24,190 |
| Unseen storage variants | 10,013 / 10,057 | ₹47 | ₹40 | ₹9,080 |

The structure was explored using the full evidence, so these evaluate fitted parameters conditional on that structure. They are not fresh independent live-quote validation or a three-year guarantee. The held-out tails show that uncommon combinations can still be wrong despite a good average. Full per-model, coverage, no-offer and worst-case records are in data/pricing-evidence/validation-2026-10-30; do not substitute the in-sample ₹8.11 figure for these held-out results.

## Verification actually completed

- 63 offline suites passed, 0 failed; 2 explicitly skipped: production-writing quote integration and browser-only agent suite.
- Next and server typechecks passed. Production Next build passed.
- 1,517,834 synthetic quotes checked across 2,242 priced catalog devices, 48 families and 31 invariants. This establishes engineering consistency, not independent Cashify accuracy.
- 18 intake parser checks plus 9 compact-input checks passed. Original source hashes, 285 JSON prices, 287 JSON input fields, 1,101 summary prices, 1,438 storage-matrix amounts and 1,977 complete fee equations verified. No unresolved selected-input or known fee-amount conflicts.
- A fresh read-only code review found no critical/important issue. Its two minor findings were corrected: preserve duplicate provenance and remove a stale startup-script warning.
- Existing HTTP/controller flow tests verify signed quote, payout and saved-lead agreement using an in-memory repository/lead spy. They do not establish real WhatsApp OTP delivery or production database persistence. No new production lead, auth change, schema migration, reference refresh or production data write was performed by these checks.

## Teammate handoff

Start at [README.md](README.md). The owner can give a teammate the same method on another computer by cloning this repository and using [XIAOMI_START_HERE.md](XIAOMI_START_HERE.md). The teammate supplies their own data folder. Apple's deductions are protected; Mi/Xiaomi gets its own questionnaire mapping, measured parameters and validation.


## Publication scope

The complete final quote corpus and quote-level audit/validation outputs are retained locally on the owner's machine and in an unpushed local evidence branch. They are excluded from this public branch and its history. This public release contains the fitted engine, import/analysis code, regression checks and handbook, plus aggregate results above. The full-data tests above were run locally with the complete evidence before publication. On another computer without that private corpus, original public-cohort tests and code regressions still run; the final dataset reconciliation explicitly skips. Supplying authorized local final measurements enables it. A full `fit-calibration.ts --write` refuses to run without those measurements so it cannot accidentally erase the Mini's measured profile.
