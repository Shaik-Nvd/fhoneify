# Two-variant fresh glass runtime candidate

Implemented a separate disabled research candidate for **Apple iPhone 12 Pro 256 GB** and **Samsung Galaxy S23 FE 5G 8 GB/128 GB**. It converts the preserved prospectively frozen conditional glass rule into a Get Upto runtime representation. The new baseline parameters use fresh A/B controls only; no C price or C-derived coefficient is a parameter. Original registers, failed holdouts and the independent conditional validation report remain intact.

| Calibration input | iPhone 12 Pro | S23 FE |
|---|---:|---:|
| Captured exact-variant Get Upto | 24,460 | 18,060 |
| Fresh A clean Selling, development control | 24,760 | 18,040 |
| Fresh B heavy-scratch Selling, development control | 20,790 | 14,950 |
| Learned conditional clean retention A/Get Upto | 1.0122649223221587 | 0.9988925802879292 |
| Heavy-scratch repair anchor A minus B | 3,970 | 3,090 |
| Shared glass loss, rounded anchor times **unchanged 50980/25190** | 8,030 | 6,250 |
| Runtime glass at captured Get Upto | 16,730 | 11,790 |

Runtime inputs are exact brand/model/storage, Get Upto and diagnostics plus server-side conditional routing evidence. There is **no measured clean Selling runtime argument**. Baseline is Get Upto times the learned A/Get Upto retention. Heavy damage deducts the A-minus-B anchor; glass deducts `estimateWorkbookGlassLoss(anchor)` from the pre-existing frozen helper. Only clean, heavy scratches and cracked glass with working touch/original screen are supported; any other defect, hardware failure, interaction or combination is unsupported.

The six A/B/closing controls were exported separately by validation; all six screenshots were rehashed locally and match. Closing clean equals opening clean, and all Get Upto values are stable. Both exact variants have warranty, bill, age, eSIM, charger and S Pen **NOT_ASKED**, and box **ASKED/select present**. The workbook's charger-Yes-if-asked intent does not become charger No, or a fabricated Yes, where the actual question is absent. The service rejects non-null warranty/bill/age/charger answers in this regime.

The prior conditional numeric predictions were registered **before C observation**: iPhone at 11:46:03.506 UTC, final C at 11:46:04.806; Samsung at 11:47:04.519, C at 11:47:05.840. That original two-device conditional holdout result remains 2/2 exact, MAPE/maximum/MAE zero, based on measured A/B controls. The new code and Get Upto retention representation were implemented **after C was known**. Its reproduction is therefore retrospective implementation of the prospective conditional rule, **not** new independent success of an application-input baseline. A/B are explicitly calibration/development; closing controls prove stability and do not count as extra holdouts. Future independent observations are needed for retention/reference/time generalization.

## Application inputs and error decomposition

The actual checked-in repository resolves iPhone reference **27,632** and Samsung **17,260**, both legacy-migration values last verified Sep9, approaching stale on Oct2. Production references and profiles remain unqueried. Counterfactual raw runtime values below use those available local references and the freshly verified research route; the readiness adapter rejects the references as unverified/stale and outside the calibrated domain.

| Glass case | Observed | Candidate at available local Get Upto | Signed error | APE |
|---|---:|---:|---:|---:|
| iPhone 12 Pro 256 GB | 16,730 | 19,940 | +3,210 | 19.19% |
| S23 FE 8/128 | 11,790 | 10,990 | -800 | 6.79% |

Local-reference glass-only MAPE **12.99%**, maximum **19.19%**, MAE **2,005**, one overpayment/one underpayment, 0/2 within 3%. Across all six A/B/C profiles, raw runtime MAPE is **10.69%**, maximum **19.19%**, MAE **2,005**, three overpayments/three underpayments, 0/6 within 3%. The original engine at these available references gives MAPE **10.52%**, maximum **24.77%**, MAE **2,098.33**, four overpayments/two underpayments, 3/6 within 3%. The new candidate therefore does not establish better overall available-reference percentage accuracy; its evidence-supported improvement is the repair deduction at the calibrated reference/regime.

At captured references, existing engine all-six MAPE is **4.96%**, maximum **10.66%**, MAE **865.50**, six overpayments, 2/6 within 3%. For the original two glass holdouts it was **5.54% MAPE**, maximum **7.54%**, MAE **839**, both overpayments. Error for iPhone glass is +80 baseline plus +1,181 insufficient deduction = +1,261; Samsung is +400 baseline plus +17 insufficient deduction = +417. The new representation corrects those separately at the captured Get Upto, without fitting to C.

At local Samsung reference the existing engine appears accurate on glass (-106 / 0.90%) because baseline error -400 cancels deduction error +294. The new fixed repair anchor separates that cancellation, but the stale Get Upto displaces its calibrated baseline by -800. Every row and signed decomposition is preserved in local `fresh-glass-application-analysis.json`. No observed clean control is substituted into an application-reference accuracy result.

Operational numeric coverage under readiness is **zero**: neither local reference qualifies, and production values/conditional metadata remain unverified. Zero coverage is not zero error. Reference refresh can supply Get Upto but cannot remeasure clean retention or renew its calibration date.

## Integration, headline compatibility and scope

The new preview adapter sits over the existing quote-service interface, disabled by default. It requires a fresh exact-variant route/hash matching a stored profile, fresh Cashify repository Get Upto in the exact observed domain, and separately fresh dated calibration using the existing freshness policy. Stale/future/unknown inputs return explicit unsupported. Enabled outputs reuse the protected uplift, starting-price and payout functions but carry no candidate quote token and expose no lead-price acceptance. Other supported research candidates delegate to their existing adapters; none of their sources or coefficients is rewritten.

Fresh iPhone clean Selling 24,760 legitimately exceeds captured Get Upto 24,460 by 300 in the verified box-present/charger-NOT_ASKED regime. This is preserved as evidence rather than clamped or rejected by an invented global ceiling. Preview output includes `cleanMayExceedGetUpto: true` and `headlineCompatibility: REQUIRES_EXPLICIT_PRODUCTION_REVIEW`. Fhoneify clean preview can consequently exceed its unchanged Get Upto headline. Production activation needs an explicit decision on that compatibility plus validated server reference/routing inputs; this task changes neither headline nor uplift. The separate undated tester iPhone11 Pro Max anomaly still remains blocked by its existing provenance guard.

Only the two exact variants and three profiles are in this fresh candidate. Warranty/bill/age ASKED regimes, charger-present/absent ASKED routes, different storage/RAM, local screens, failed touch, lines/spots/discoloration, body defects, hardware faults, combinations and no-price outcomes remain unsupported. Existing cap behavior, nine-model INR tables, pending unpriced Redmi catalog entries, weekly refresh, other brand engines and original Xiaomi candidates remain unchanged.

Tests: **57 assertions pass**, covering all six supported profile reproductions, A/B-only parameters, preserved C outcomes, unsupported condition combinations and route answers, exact unit-whitespace aliases without variant guessing, stale/future reference/route/calibration, invalid clock, verified above-Get-Upto Apple baseline/headline warning, disabled default, no token/lead interface, protected uplift/payout and prior-candidate fallback. Standalone strict TypeScript for both added modules and tests passes. The coordinator runs integrated Next TypeScript and targeted database-safe checks; no production database query, collection attempt, push, merge or deployment was performed by this pricing agent.
