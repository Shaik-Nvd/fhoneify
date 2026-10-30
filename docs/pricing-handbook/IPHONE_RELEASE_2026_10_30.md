# Final iPhone data integration — 30 October 2026

This report records the completed implementation and local verification. It supersedes the analysis-only status in FINAL_DATA_REPORT.md and the original IMPLEMENTATION_HANDOFF.md. GitHub publication and the actual serving commit must be verified separately; the presence of this report alone does not prove production deployment.

## What changed

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
