# Xiaomi research candidate and new validation, 2026-10-01

Research-only. Started from clean fix/xiaomi-inr-deductions at 01bef040063477a14657d2c3879639f4e55f49a8. The existing functional cap fix and all 15 pending Redmi variants remain intact. The pricing worktree remains locked and has not been removed or unlocked. Origin was fetched; no push, merge or deployment occurred.

## Concrete outcome

A deliberately opt-in candidate, lib/pricing/xiaomiEvidenceCandidate.ts, reuses calculateXiaomiPrice's existing optional INR config. It changes conditional clean retention and two individually measured defect costs for only Xiaomi 17 12 GB/512 GB and Xiaomi Redmi Turbo 5 12 GB/256 GB. It refuses other variants, warranty/bill/age/eSIM routes, accessories, touch failure, screen/body damage and other hardware faults. Clean, non-original display, failed charging and their combination are its experimental scope. No production caller imports it and the active nine-model tables are unchanged.

The two NEW, preregistered combined-fault cases both match exactly: MAPE 0%, maximum 0%, MAE Rs0, 2/2 within 3%. This is two cases in one observation block, not broad independent success. Repeated clean controls also match, but are excluded from this independent score. The six older development prices fit exactly by construction and are not validation.

The Note 15 Pro+ severe case instead exposes a critical active-model risk: verified Cashify Selling price Rs560 versus INR Rs16,630 and old percentage Rs4,313. Do not activate this model based on the fitted benchmark.

## Original failed holdout reproduced and preserved

Error is prediction minus Cashify final Selling price; positive means overpayment. APE denominator is Cashify's price. These comparisons are before Fhoneify uplift and the unchanged Rs99 fee, not customer displayed payout.

- Frozen formulas substituting same-day observed clean controls: MAPE 4.62%, maximum 8.07%, MAE Rs1270, maximum Rs2720, 3/9 within 3%.
- Actual cap-corrected INR engine using its OWN baseline from same-day Get Upto: MAPE 5.51%, maximum 14.45%, MAE Rs1340, maximum Rs4500, 3/9 within 3%.
- The fitted benchmark remains 20/20, mean 0.71%, maximum 1.78%; it is calibration evidence.

The original immutable register is now also preserved as scripts/pricing/fixtures/xiaomi-independent-frozen-2026-10-01.json, with the same SHA-256 dc4ac529ea3c6cfcd052d506f579a114df544651a72f7fbb4261478276480dc2. Original errors and development comparisons are separate summary fixtures. The original local observations, attempt ledger, report and predictions were hash-checked unchanged. V10's unspecified alternate variant remains preserved, not guessed or collected in this job.

Error decomposes as: (predicted clean - observed clean) + (observed defect deduction - predicted defect deduction). Thus a negative second term means an excessive deduction, and opposite signs can cancel.

| Case | Cashify | Frozen same-day | Own-baseline INR | Baseline error | Deduction contribution | Total error | APE | Cancellation |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| V1 | 33720 | 36440 | 38220 | +1780 | +2720 | +4500 | 13.35% | No |
| V2 | 15640 | 16720 | 17900 | +1180 | +1080 | +2260 | 14.45% | No |
| V3 | 41220 | 39420 | 41200 | +1780 | -1800 | -20 | 0.05% | Yes |
| V4 | 18640 | 18100 | 19280 | +1180 | -540 | +640 | 3.43% | Yes |
| V5 | 29840 | 31510 | 31510 | +1670 | 0 | +1670 | 5.60% | No |
| V6 | 21780 | 22030 | 22030 | +250 | 0 | +250 | 1.15% | No |
| V7 | 19640 | 20820 | 20820 | +1180 | 0 | +1180 | 6.01% | No |
| V8 | 19100 | 19470 | 19720 | +250 | +370 | +620 | 3.25% | No |
| V9 | 39250 | 37430 | 38330 | +900 | -1820 | -920 | 2.34% | Yes |

V3's apparently excellent Rs20 error is Rs1,780 baseline overestimate cancelling Rs1,800 excess charging deduction. V4 and V9 also cancel. The two 3/9 pass sets differ: frozen passes V4/V6/V8; actual engine passes V3/V6/V9. The actual maximum 14.45% is Turbo 5 non-original display, not Xiaomi 17.

## Comparability and verified causes

All original and new accepted comparisons use exact RAM/storage identity, calls/touch working except the original touch-failure case, GST bill Yes, box present and charger absent. Warranty No is actually selected; mobileAge and eSIM are verified NOT_ASKED, never silently mapped to No. Thirty-six factor states, exact question/option text, selected/unselected cards and screenshot hashes were checked. Unselected unknown hardware cards do not substitute another battery option.

The original pairs differ only in originalScreen, charging, screenCondition or touch as declared. Xiaomi 17, Turbo 5, Note and Ultra original opening/closing controls have identical traces and identical Selling/Get Upto. 17T had no completed closing control, so only its baseline error is established.

Verified original measurements:

- Xiaomi 17 12/512: Get Upto 57,750; clean 42,720, versus predicted 44,500. Non-original display deducts 9,000 versus 6,280; charging deducts 1,500 versus 3,300.
- Turbo 5 12/256: Get Upto 26,750; clean 19,640, versus predicted 20,820. Non-original display deducts 4,000 versus 2,920; charging deducts 1,000 versus 1,540.
- Other clean errors: 17T +1,670; Note +250; Ultra +900. These are uncorrected outside candidate scope.

The baseline retentions are conditional on bill/box/charger/warranty routing. Keeping the existing Rs380 box term, they are (42,720 - 380)/57,750 = 0.7331601731601731 and (19,640 - 380)/26,750 = 0.72. This does not separately identify a universal box bonus or warranty/age curve.

One anchor cannot explain both faults: the inherited 0.19 display share would require anchors about 47,368 and 21,053; the inherited 0.10 charging share would require 15,000 and 10,000. Existing anchors/caps remain 33,040 and 15,350. Measured defect-specific amounts, not an invented anchor, supply the research exceptions.

## Candidate selection, development only

The six comparable clean/display/charging development cases were explicitly reclassified after preserving their failed holdout results. Shared normalized retention and repair-cost shares were compared with model exceptions.

| Development candidate | MAPE | Maximum APE |
|---|---:|---:|
| active | 6.91% | 14.45% |
| baseline-only | 3.71% | 8.07% |
| defect-only | 5.61% | 7.54% |
| model-specific-both | 0.00% | 0.00% |
| pooled-shares | 1.07% | 1.77% |

The selected narrow candidate pins both baseline and measured defect amounts. The pooled hypothesis (retention 0.7265800865800865, display share 0.26649170682461687, charging share 0.055273047771529527) was separately preregistered for Xiaomi 15; it was not activated or fitted on that model's new values.

## New collection and independent results

20 budgeted attempts: 14 accepted final quotations, four failed attempts, two routing-only attempts. No authentication challenge or contact/pickup submission occurred. There were no retry loops: one reviewed opening-control replacement used the planned spare; final attempts were explicitly amended after collector defects. Every failure remains charged. No quote beyond attempt 20 ran.

Original new-job plan hash: 7ba6e47cd169800554ec58c365033f40fb06fc3298b31bfeb920614571af6d63. The last-three amendment hash is acfabf1f5a33ddb9923d1b606926301fdf4f1d6bb4acbebf088f85d0b3e2177c. Exact complete answers, diagnoses, candidate code hash and formula predictions were frozen before final quotations. Original reference prices and prices evaluated at new Get Upto are retained separately. Xiaomi 15's Get Upto changed from the illustrative 37,100 to 37,350; frozen formulas were evaluated at 37,350 without refitting.

New independent conditions (control duplicates excluded):

| Case | Cashify | Own-baseline INR | Narrow candidate | Pooled hypothesis | INR error | INR APE |
|---|---:|---:|---:|---:|---:|---:|
| 17-COMBINED | 32220 | 34920 | 32220 | - | +2700 | 8.38% |
| 17-SCRATCH | 37420 | 39540 | Unsupported | - | +2120 | 5.67% |
| T5-COMBINED | 14640 | 16360 | 14640 | - | +1720 | 11.75% |
| T5-SCRATCH | 17290 | 18520 | Unsupported | - | +1230 | 7.11% |
| 15-OPEN | 27470 | 28920 | Unsupported | 27520 | +1450 | 5.28% |
| 15-LOCAL | 18720 | 22640 | Unsupported | 18720 | +3920 | 20.94% |
| 15-PORT | 25970 | 25620 | Unsupported | 25690 | -350 | 1.35% |
| NOTE-SEVERE | 560 | 16630 | Unsupported | - | +16070 | 2869.64% |

17/T5 COMBINED = non-original display plus failed charging port. SCRATCH = More than 2 scratches on screen. Xiaomi 15 12/512 OPEN/LOCAL/PORT = clean, non-original display alone, charging alone. NOTE-SEVERE = Note 15 Pro+ 12/512 with fingerprint, front camera, back camera, Wi-Fi, speaker and charging faults, all actual selectable answers; no battery substitution.

- Narrow candidate NEW independent: 2 cases, MAPE 0%, max 0%, MAE Rs0, no overpayment/underpayment, 2/2 within 3%.
- Pooled Xiaomi 15 probe: 3 new cases, MAPE 0.42%, max 1.08%, MAE Rs110, max Rs280; one Rs50 overpayment, one exact, one Rs280 underpayment; 3/3 within 3%.
- Unchanged INR across ALL eight new conditions: MAPE 366.26%, max 2869.64%, MAE Rs3,695, max Rs16,070; seven overpayments and one underpayment; 1/8 within 3%.
- Explicitly excluding the severe case, unchanged INR still has MAPE 8.64%, max 20.94%, 1/7 within 3%. The large severe percentage uses a low Rs560 denominator; its Rs16,070 error is independently material.

No candidate coefficient was changed after these observations. The new scratch deductions are 5,300 (17) and 2,350 (Turbo), versus inherited 4,960 and 2,300. They remain outside candidate scope. The Rs33,040 anchor with its inherited shares does not generalize across individual faults. Similar observed 17/15 display repair costs (9,000 / 8,750) support further family investigation but do not validate every flagship, every variant or the aggregate functional cap.

Xiaomi 15's pooled exact display prediction contains cancellation: predicted clean 27,520 versus observed 27,470 (+50), predicted display deduction 8,800 versus observed 8,750 (-50 contribution). Charging's 1,830 predicted versus 1,500 observed partly cancels the baseline, leaving -280. Passing total prices do not establish exact repair costs.

## Controls, Note routing and severe payout risk

New opening/closing Selling prices and Get Upto are identical for 17 (42,720 / 57,750), Turbo (19,640 / 26,750) and 15 (27,470 / 37,350), with equal answer traces. Note's new clean control is 21,780 at 29,250, matching earlier same-day controls. No new closing Note control fits the exhausted budget; this stability gap is explicit.

Routing was checked before price extraction. P1 displays warranty and records Yes; with cracked glass selected and touch working, the age question is absent. An initial trace was suspect because final-page readiness had not been awaited; the confirmation after that repair again records NOT_ASKED. Neither routing attempt extracted a final price. No explicit warranty-void message was observed, so manufacturer warranty validity is not legally established. The registered warranty-Yes + Below 3 months cracked state was rejected rather than forced, and no such quote is counted. Clean warranty-Yes prices remain missing because both attempts failed the age-label check before final acceptance; the later exact-visible-heading repair has synthetic coverage, not a successful new warranty-Yes live quote.

Earlier matched warranty-No Note measurements remain: clean 21,780, cracked glass 19,100 (deduction 2,680), failed touch 17,280 (deduction 4,500). At Get Upto 29,250, cracked Selling retains 65.30%, not about 93%. Own-baseline INR predicted 19,720 cracked and 18,060 touch; old percentage predictions were about 14,449 and 9,038. Neither formula is chosen because it happens to fit a benchmark.

The new valid six-fault Cashify price is 560, visually checked against its cropped exact-model/variant screenshot and the double final-price gate. INR predicts 16,630 (+16,070; 2,869.64% APE); old percentage predicts 4,313 (+3,753; 670.18%). The observed clean-to-defect loss is 21,220 versus INR's 5,400. This six-fault sum is below the 6,610 cap: restoring cap semantics did not solve its economic validity. The earlier eight-fault missing/masked-price outcome remains null, never zero. No threshold or new coefficient is inferred from this single severe observation.

Recommend a documented fail-closed activation gate for Note 15 Pro+ and severe multi-fault states: no production activation of these INR rules until valid routing, priced/declined boundaries and matched independently validated fault combinations are established. Do not issue the candidate for Note; it already returns unsupported for that model. Keep the existing production engine untouched until a separately approved implementation/activation review.

## Collector repairs kept separate

Separate branch fix/xiaomi-validation-collector, based on existing PR #8 components, commits 0366868, 4b3d597, 3675357. No PR #8 merge or rebuilt collector/auth/storage component.

The failed 17 control captured P2 cards as P3 before navigation completed; destination-grid waits now precede captures. Age options were mistaken for question labels; an exact visible heading is now required, including nested spans. Accessory-to-age/final rendering is awaited before classifying a question as absent. Rejected final cards are saved locally as diagnostic evidence without promoting them to numeric quotes. A rejected Note control screenshot rendered 21,780 after the failed gate, confirming the timing issue; it remains a failed/null observation, not retroactively accepted.

Raw traces, sessions, SQLite, plans and all 14 hash-verified accepted screenshots remain in ignored research-evidence/xiaomi-candidate-2026-10-01 in the collector worktree. The new session was local and untracked; historical committed sessions were not used. No new credentials/session/evidence files are tracked. Inherited tracked historical session files remain an existing hygiene issue outside these changes and must never be used for this job.

## Database-safe verification and remaining scope

Sentinel DATABASE_URL and DIRECT_URL pointed to unreachable localhost for every executable check. No production SQL, production query or production-writing integration test ran. The prepared questionnaire SQL remains unexecuted.

Passed: candidate 31 checks; INR unit/cap 22; regression 27; condition matrix 20; calibration 9; team QA 7; questionnaire coverage 3; quote consistency 10; Get Upto 5; mocked production suite 37; file-only reference data 28; variant matching 39; pending Redmi catalog checks; catalog properties 2,242 priced devices / 35,872 quotes; generalization 1,517,834 quotes / 30 invariants plus all 15 pending entries verified unpriced. Calibration harness remains 20/20 at 0.71% mean / 1.78% maximum.

Two existing tests initially failed because they required a price for intentionally pending catalog entries. Commit dd50f2c now explicitly proves those entries have no base price, snapshot or fallback; it still fails for an unexpectedly unpriced active entry. The catalog INR-exclusion assertion now normalizes keys correctly. No pending entries were assigned prices or INR rules.

Pricing Next TypeScript passes. Server TypeScript still has six existing errors (admin rejected status, inventory generated-client fields, missing puppeteer, random-test union field). Collector TypeScript reports five existing hosted-test ProcessEnv/NODE_ENV errors, none in the changed collector helpers. Collector hardware, matrix, quote-evidence, question-component and store tests pass; synthetic browser transition/age/readiness suite passes nine checks. These results establish scoped code safety, not market-wide parity.

The active calculator, nine-model tables, cap, seed entries, uplift tiers/minimum/cap, Rs99 fee, payout rounding, reference refresh and other brands were unchanged from 01bef04. The 15 pending variants across the eight requested Redmi identities remain unchanged and unpriced.

The narrow two-variant candidate is ready for research-only review with its two new combination observations. Xiaomi 15's pooled hypothesis is promising but not part of supported candidate scope. All-nine activation, Note, the other original models/variants/faults, warranty/age/bill/accessory extensions and all eight pending Redmi identities remain blocked.

Smallest useful next observations, obtainable by the existing collector automatically with a new authorized budget: Xiaomi 15 non-original display + charging with matched opening/closing clean controls (three quotations) to test pooled combination generalization; Note clean warranty Yes/GST bill Yes/Below 3 months to live-verify the repaired age label (one quotation), then an opening/closing-controlled repeat of the six-fault low price (three quotations) before exploring a single-fault-to-severe ladder. None are silently substituted into this finished job or manually delegated to the owner.

Production stays blocked unless later explicit approval authorizes activation.
