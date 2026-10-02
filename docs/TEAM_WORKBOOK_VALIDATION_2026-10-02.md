# Completed workbook collection and guarded pricing corrections

The authorized collection is complete at **120 charged attempts**, with **99 verified numeric final quotations**. The unchanged workbook supplies 66 tester-reported prices; 78 newly collected target prices bring coverage to **144/150 A/B/C cases**. Local pricing corrections are implemented behind disabled research adapters. No production activation, query, write, push, merge or deployment occurred.

## Source, collection and comparability

The source is `Fhoneify_Cashify_Team_Testing_Clear_Instructions.xlsx`, SHA256 `57f7b74f16e9d95ec1a17ba3f0b8ddc891cca3fe35a06bc983513ca0ec3bc0aa`. Its 66 entries cover 12 iPhones and 10 Samsung devices. Dates, location, selected traces and screenshots are unknown for those original entries; they remain useful tester reports, separately labelled from verified observations. Workbook metadata is not a quote date.

New observations comprise 78 previously missing A/B/C cases, 15 closing clean controls and six remeasurements of tester cases. Remeasurements do not overwrite originals. The remaining 21 charged attempts are 11 routing-blocked, seven failed, two interrupted/unknown and one routing-only diagnostic. Constructed-page 404s do not establish unsupported devices. All 99 accepted screenshot hashes match, with no mismatched planned answers or duplicate attempt IDs. All completed original predictions precede final Selling extraction. Fifteen paired blocks have exactly stable opening/closing Get Upto and clean Selling values.

Charger/box/S Pen Yes means **Yes if actually asked**. An absent question remains NOT_ASKED, never No. Warranty, bill, age, eSIM and conditional accessory routes are preserved per observation. Earlier Xiaomi charger-No evidence is not pooled with these workbook routes. Only 44 fresh non-control observations have matching stable controls for deduction decomposition. FM029's late charging retry follows its original closing control: preserve its prediction error, exclude matched deduction inference.

| Budget-blocked case | Exact variant | Missing condition |
|---|---|---|
| FM024_C | OnePlus 9 5G 8/128 | Cracked glass, touch working |
| FM032_C | Oneplus Open 16/512 | Heavy spots only |
| FM039_C | Redmi Note 15 Pro 5G 8/128 | Back camera only |
| FM040_C | Redmi 5 3/32 | Major body dents, no scratches |
| FM042_C | Xiaomi 14 12/512 | Charging only |
| FM045_C | Xiaomi 15 Ultra 16/512 | Charging only |

These exact devices' A/B quotations succeeded on verified routes. The existing repaired collector can attempt these six automatically under a later authorization; no manual screenshot workflow is required. No attempts remain in this authorization.

## Original engine accuracy

All errors compare the internal Cashify-equivalent against final Selling, before protected Fhoneify uplift. Signed error is prediction minus observed price; positive is overpayment. Get Upto, measured clean Selling and application references are separate inputs.

| Evaluation | Cases | MAPE | Maximum APE | MAE | Within 3% | Over / under / exact |
|---|---:|---:|---:|---:|---:|---|
| Original tester reports, supplied reference and hypothetical guide route | 66 | 21.90% | 150.91% | 3,557.58 | 6 | See case register |
| Same tester reports, available local references | 66 | 23.28% | 149.31% | 4,036.92 | 9 | 27 / 39 / 0 |
| New non-controls, captured same-day Get Upto and observed route | 84 | 12.17% | 154.68% | 1,405.02 | 28 | 57 / 26 / 1 |
| New non-controls, available local references and observed route | 84 | **12.55%** | **167.68%** | **1,594.65** | **27** | **52 / 32 / 0** |

| Brand | Fresh non-controls | Captured-reference MAPE | Available-local-reference MAPE |
|---|---:|---:|---:|
| Apple | 3 | 6.17% | 19.70% |
| Samsung | 3 | 3.74% | 1.34% |
| OnePlus | 28 | 16.23% | 18.03% |
| Xiaomi | 50 | 10.76% | 9.72% |

The local reference resolver supplied 65 approaching-stale legacy file references, 14 undated snapshot values and five catalog fallbacks for the fresh cases. These are actual **local** application inputs, not verified production inputs. Production values remain unqueried. The original reserved 18 tester prices have MAPE 28.47%, 1/18 within 3%; the 33 reserved fresh observations have captured-reference original-engine MAPE 9.70%. The previous fitted +/-3% benchmark does not generalize.

The largest fresh error is OnePlus Open 16/512 with display lines: Selling 11,700 versus original 29,798 at captured Get Upto, overpayment 18,098 (154.68%). Available local reference produces 31,319, overpayment 19,619 (167.68%). Nord display damage and Note 10 Pro Max display faults also have insufficient deductions. No guessed repair coefficients were introduced for these failures.

For comparable controls, final error = clean-baseline error + (observed deduction minus predicted deduction). Thirty-one original tester cases have opposing components. Examples: iPhone 15 Pro Max lines, -2,398 baseline plus +2,323 deduction error gives -75; S21 Ultra, -3,436 plus +3,324 gives -112. These apparent matches are cancellation. All signed components, model/condition metrics and exclusions are retained locally.

## Implemented corrections and their evidence

### Undated workbook development candidate

`teamWorkbookCandidate.ts` derives conditional clean retention and rupee components for 16 exact development variants, with a disabled quote-service preview. The 48 development entries reproduce; 45 pass the provisional preview and three iPhone 11 Pro Max entries remain conservatively quarantined pending provenance. Body increments derived from C-minus-B are fitting data, not additive holdouts. Operational readiness is zero because original calibration dates/traces are absent. Its forced 45-case local-reference diagnostic has MAPE 11.45%, maximum 64.75%, MAE 3,176.67; Apple MAPE 19.44% and Samsung 2.31%. It does not establish an Apple application-input improvement.

The final whole-device holdout split (48 development / 18 validation prices) was reserved before fitting. An earlier overlapping proposed split was explicitly discarded, not silently reused. The reservation hash is `5d59c796402a12e3e95b118b53879d1bf1d3d879692d728f8dd1eddf15bd575a`.

### Four verified Xiaomi variants

`xiaomiWorkbookEvidenceCandidate.ts` supports only Mi A2 4/64, Redmi Note 9 Pro 4/128, Redmi Note 10 Pro Max 6/128 and Xiaomi 14 CIVI 8/256, in their verified routes. It calculates clean baseline and measured single-fault repair deductions. Three NOT_ASKED warranty/bill variants use the measured shared Get Upto-minus-20 baseline; CIVI uses its separate measured retention 14,590/18,900. This offset's cause is unproven and is not a new fee or all-Xiaomi rule.

Verified rupee losses are Mi A2 scratches 150/dents 250; Note 9 heavy scratches 700/glass 1,430; Note 10 Pro Max lines/spots 3,060 each; CIVI heavy scratches 2,820/glass 5,710. Twelve A/B/C prices are development fits, with four stable closing controls. Combinations and unmeasured faults/regimes return unsupported.

Using available local references, forced candidate MAPE is **5.71%**, maximum 19.03%, MAE 220, 6/12 within 3%, all underpayments, versus original 13.91% on the same local inputs. These are development/input-sensitivity results, not independent condition success. Readiness rejects all 12 with current local sources.

The baseline-only held-out Redmi 11 Prime result is a stable exact match in a blind retrospective test. Note 12 Pro Plus is excluded for different warranty/bill routing. The later preregistered K50i baseline matches prospectively but lacks a closing control and remains a separate secondary result. Held-out device deductions were not fitted or activated.

### Fresh Apple/Samsung glass candidate

`freshGlassEvidenceCandidate.ts` adds only iPhone 12 Pro 256GB and Samsung S23 FE 5G 8/128. Runtime baseline is Get Upto times A/Get Upto retention; the heavy-scratch repair anchor is A-minus-B. Glass loss uses the unchanged preregistered shared ratio **50980/25190**, rounded to tens. Runtime requires no measured clean Selling input and contains no C-derived parameter.

| Exact variant | Get Upto / A / B | Frozen C prediction / observed C | Local-reference candidate C / signed error |
|---|---|---|---|
| iPhone 12 Pro 256GB | 24,460 / 24,760 / 20,790 | 16,730 / 16,730 | 19,940 / +3,210 |
| S23 FE 5G 8/128 | 18,060 / 18,040 / 14,950 | 11,790 / 11,790 | 10,990 / -800 |

These two prospective **conditional deduction** holdouts were frozen before their final C extractions and are 2/2 exact, MAPE/MAE zero, with matching routes and stable controls. The original engine overpaid 1,261 and 417 (glass MAPE 5.54%). The new runtime representation and learned baseline were implemented after C became known: reproduction is retrospective implementation, not a new independent full-engine success.

At available local references 27,632 and 17,260, candidate glass MAPE is **12.99%**, maximum 19.19%, MAE 2,005, 0/2 within 3%. Across six A/B/C profiles it is 10.69% versus original 10.52%; no overall local percentage improvement is claimed. The reference mismatch, not a refitted glass rule, shifts every Apple result +3,210 and every Samsung result -800. Readiness rejects all six local inputs.

Verified Apple clean Selling exceeds its captured Get Upto by 300. This is preserved and explicitly flags headline compatibility for later approval; no universal ceiling is invented. The undated iPhone 11 Pro Max guard is a provenance precaution, not proof its tester values are invalid.

## Integration and activation decision

All additions use the existing quote-service interface as **disabled-by-default research previews**, with no candidate quote-token signing or lead-price acceptance. Strict route, exact variant, reference source/domain/freshness and calibration freshness guards return unsupported. Fresh reference refresh cannot renew clean-retention/condition calibration. Measured clean values are dated calibration evidence, not permanent runtime quotation inputs. Changed reference domains require revalidation.

The existing Xiaomi two-variant and Note additive candidates, original failed/frozen predictions, functional aggregate cap regression and 15 pending unpriced Redmi variants remain intact. No new INR tables are assigned to pending variants. Xiaomi 15 remains outside the added candidates. Uplift tiers, 2,000 cap, minimum bonus, 99 fee, payout rounding, weekly refresh, active calculator and other brand engines are unchanged.

Six newly traced exact variants are eligible for **later research review**, only within measured single-fault/clean routes. Unsupported: other capacities/models, unmeasured defects/combinations, display-plus-functional interactions, changed warranty/bill/accessory regimes, no-price outcomes and severe conditions without validated rules. None is approved for production. Previously supported Note additive conditions retain their prior narrow scope; broader severe-fault handling remains unsupported.

Activation needs approved read-only verification of exact variant identity, fresh Cashify reference amount/source/date/status/failure count, matching questionnaire profile modes and separately evidenced conditional warranty/bill/age/eSIM/accessory visibility, dated calibration and independent new-condition/reference/time results. Existing model-level profiles do not prove exact-variant conditional routes. The schema lacks a complete persistent calibration/conditional-route store. `TEAM_WORKBOOK_PRODUCTION_INPUTS_READ_ONLY.sql` prepares the exact 50-variant checks, **unexecuted**. A later explicit activation approval and Apple headline-compatibility decision are required.

## Verification and local evidence

The four new suites pass **283 assertions** (87 candidate, 67 service, 72 Xiaomi, 57 glass). Targeted database-safe existing suites cover old Xiaomi/Note service behavior, readiness, cap, calibration, cross-brand goldens, conditions, pending variants, quote consistency, Get Upto, variant matching and mock production pricing. Executable checks use an unreachable localhost database sentinel; no production-writing integration or million-quote property campaign ran. Integrated Next TypeScript passes. Collector's focused suites and scoped TypeScript pass. Server TypeScript still has six pre-existing errors in admin status typing, Inventory fields and old server test scripts; unrelated hosted-collector ProcessEnv errors remain outside the passing scoped check.

Collector repairs are committed separately: conditional NOT_ASKED accessory handling and exact question-plan verification, pre-final prediction checkpoint, and legitimate model-page readiness waiting with authentication guards. No CAPTCHA bypass, contact submission or historical tracked session reuse occurred. The base contains two legacy tracked session files; neither was opened or used, and no new session/evidence files are committed.

Local ignored evidence root: `../../../scratch/xiaomi-severe-followup-2026-10-01/team-workbook-2026-10-02/` from this worktree. See `data/FINAL_COVERAGE.md`, `data/case-register150.csv`, `data/all-attempts.json`, `validation/REVIEW.md`, `validation/metrics.json`, `validation/collected-audit.json`, `validation/collected-local-input-metrics.json` and dedicated fresh-glass/Xiaomi JSON analyses. Raw collector screenshots/traces remain under the separate collector worktree's ignored `research-evidence/team-workbook-2026-10-02/`.

Final ledger SHA256: `b77deb782f5a7120903e9682e32989603ce68ce0b0b7421dbd9bbf997ca41248`. Observation JSON SHA256: `189e73bab37e940792c919f2bacdbc1b4aecc365c81a32ca9eed109b792bcc8a`. Original records, failed outcomes and prospective registers are preserved; only now-observed development data define new scoped parameters.

Pricing commits preceding this report: `56bcc33` (workbook preview/guards), `e0e2e53` (four Xiaomi candidates). Separate collector commit: `21b3633`. This report and fresh glass implementation are committed together; Git log supplies their final commit identifier.
