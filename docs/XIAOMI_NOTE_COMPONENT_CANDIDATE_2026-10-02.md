# Note component correction and local quote-service preview

Continued the existing locked pricing worktree, branch `fix/xiaomi-inr-deductions`, from clean `f074abb86efd9bf3017cd0fae25b79cc4415bbbd`. Read the deployable-input report and its actual local evidence first. Fetched origin; main remains `37d7d97b577d98789ff744808295c4a70af31072`. No new Cashify collection, production query, SQL execution, production-writing test, push, merge or deployment occurred.

## Implemented correction

`lib/pricing/xiaomiNoteEvidenceCandidate.ts` implements a separate, opt-in Note candidate for **Xiaomi Redmi Note 15 Pro Plus 5G, 12 GB/512 GB**. It subtracts individually verified component deductions from an explicitly selected baseline. It does not contain a lookup for the final severe price or its combined deduction.

The candidate supports only clean, the six measured single faults, and the five observed combinations listed below: 12 distinct profiles. It refuses the other 52 subsets of those six faults, other variants/models, unknown faults, warranty/bill/age/eSIM extensions, no calls, failed touch, non-original display, physical screen/body damage, display-plus-functional interactions and other accessories. Duplicate fault IDs are deduplicated rather than charged twice. Failed/no-price observations are not converted into zero or scrap values.

Candidate aggregation is **the full sum of verified components**, without the legacy aggregate cap or inherited dead-phone floor. This exception exists only in this research module and only for its observed profiles. It is justified by the four independently preregistered additive contrasts and the valid positive severe quote below. Nonpositive calculated outcomes return explicit unsupported. The existing engine, nine-model tables, cap regression and default quote service remain unchanged.

The protected uplift, Rs2,000 uplift cap, minimum bonus, Rs99 fee, displayed-payout logic, weekly refresh and other brands are unchanged. The 15 pending Redmi catalog variants remain unpriced and without INR rules. The original two-variant v1 source and frozen predictions are byte-for-byte unchanged.

## Evidence reconstruction: observations versus derivation

Existing observation block `xiaomi-severe-followup-2026-10-01`: 19 accepted final prices / 19 attempts, zero failures. **This implementation collected zero new prices.** The Note clean controls are both 21,780, Get Upto 29,250, at 17:36:43.623 and 17:41:57.542 UTC on October 1.

Every compared Note capture has calls/touch/original-screen Yes, warranty No, GST-valid bill with same IMEI Yes, original box present, original charger absent, age/eSIM NOT_ASKED, no physical damage, and only the stated hardware cards selected. The six labels are Charging Port not working, Speaker Faulty, Front Camera not working, Back Camera not working, WiFi not working and Finger Touch not working. Battery and other hardware options are unselected. NOT_ASKED is explicit trace evidence, not an interpretation of a null answer as No.

Re-audited the actual 36-factor vectors and 41 captured question/parent-card records against their plans and controls. Nonchanged questions, statuses and answer selections match; reference and clean controls are stable. Recomputed all 19 screenshot hashes. The accepted collector path checks exact variant, final details URL and Selling label twice, then again after screenshot. The old raw observations, ledger and plans were not changed.

The following prices are **observations**. Each deduction is **derived** as clean 21,780 minus the corresponding single-fault observation. These seven observations are **development data**, not independent validation of fitted costs or baseline.

| Development case | Observed Selling | Derived component loss | Observed UTC |
|---|---:|---:|---|
| N-OPEN clean | 21,780 | - | 17:36:43.623 |
| N-PORT charging | 20,780 | 1,000 | 17:37:07.807 |
| N-SPEAKER | 21,380 | 400 | 17:37:32.134 |
| N-FRONT camera | 19,780 | 2,000 | 17:37:56.373 |
| N-BACK camera | 18,580 | 3,200 | 17:38:20.599 |
| N-WIFI | 13,010 | 8,770 | 17:38:44.950 |
| N-FINGERPRINT | 15,930 | 5,850 | 17:39:32.256 |

The plan was registered at 17:32:06.111 UTC. The additive diagnostic was frozen at **17:39:32.261 UTC**, after the singles and **before any combination in that follow-up**. Its four new contrasts independently tested `clean - sum(component losses)`; no parameter was adjusted using those combination prices. The earlier severe observation was already known; its follow-up is a repeat, not a holdout.

| Supported combination | Frozen prediction | Observed Selling | Observed UTC | Classification |
|---|---:|---:|---|---|
| Front + back camera | 16,580 | 16,580 | 17:39:56.389 | Prior independent additive holdout |
| Speaker + charging | 20,380 | 20,380 | 17:40:20.533 | Prior independent additive holdout |
| Front + back + Wi-Fi + speaker | 7,410 | 7,410 | 17:40:44.785 | Prior independent additive holdout |
| Those four + charging | 6,410 | 6,410 | 17:41:09.159 | Prior independent additive holdout |
| Those five + fingerprint | 560 | 560 | 17:41:33.496 | Established-profile severe repeat |
| N-CLOSE clean | 21,780 | 21,780 | 17:41:57.542 | Closing control |

The implemented rule reproduces all four frozen holdouts: MAPE 0%, maximum APE 0%, MAE Rs0, 4/4 within 3%, no overpayment/underpayment. This reproduces the **previously independent additive diagnostic**, not new independent validation of code written today or a universal baseline rule. The repeat and development/control rows are excluded from that holdout score.

**Model assumptions** are separate: addition beyond the tested profiles is not assumed; no repair anchor is inferred; conditional clean retention proportional to Get Upto is learned from the development clean control; the inherited Rs380 box term is retained without claiming it was isolated experimentally. At the captured reference the Get Upto baseline is algebraically equivalent to the development clean baseline. Its time/reference generalization is unverified.

## Baseline inputs and their accuracy

The existing quote service resolves exact catalog identity, parses diagnostics, looks up ReferencePrice, computes freshness, and returns questionnaire modes. Its internal audit supplies `cashifyGetUptoReference`, `baseSource` and `referenceSource`; public metadata supplies referenceStatus and referenceLastVerifiedAt. It supplies **no measured clean Selling price**, no eSIM question mode and no condition-calibration refresh.

The application-baseline candidate is:

`round10(Get Upto * conditionalRetention + existingBoxTerm - sum(verified component costs))`.

Note retention is `(development clean 21,780 - existing box 380) / 29,250`, represented as a dimensionless coefficient. Existing 17/Turbo retentions remain their original learned values. No permanent runtime clean-price record is added. The Note module's separately named `measured_clean_control` input is a pure diagnostic option; it is never read by the application adapter. Historical prices in the sanitized fixture remain evidence, not live baseline storage.

| Baseline scenario for the four Note holdouts | MAPE | Max APE | MAE | Within 3% |
|---|---:|---:|---:|---:|
| Measured same-block clean control | 0% | 0% | 0 | 4/4 |
| Captured Get Upto 29,250 with development-learned retention | 0% | 0% | 0 | 4/4 |
| Available local repository reference 28,500 with that retention | 5.50% | 8.58% | 550 | 1/4 |

The available Note reference is a legacy-migrated, approaching-stale record verified September 9, not a newly verified Cashify reference. The numerical offline scenario assumes the research-verified route; actual production questionnaire/reference availability is unqueried.

| Note case | Cashify | Raw candidate at local reference 28,500 | Signed error | APE |
|---|---:|---:|---:|---:|
| Camera pair | 16,580 | 16,030 | -550 | 3.32% |
| Speaker + charging | 20,380 | 19,830 | -550 | 2.70% |
| Four faults | 7,410 | 6,860 | -550 | 7.42% |
| Five faults | 6,410 | 5,860 | -550 | 8.58% |
| Severe repeat, excluded from holdout score | 560 | 10 | -550 | 98.21% |

All four holdout offline errors are underpayments, with maximum rupee error 550. The severe sensitivity is material: small baseline drift dominates a low residual price. **The readiness guard rejects every one of these local-reference scenarios.** Operational numeric coverage is 0/4, with no meaningful gated MAPE; it is not zero error.

For existing 17/Turbo combined cases, captured-reference reproductions remain 32,220 / 14,640. Available local references are 58,500 (legacy repository, approaching stale) / 26,080 (undated snapshot), yielding 32,770 / 14,160: +550 / -480, MAPE 2.49%, maximum 3.28%, MAE 515, 1/2 within 3%. The same guard rejects both. No observed clean controls were substituted into these application-reference numbers. The original failed nine-case holdout remains MAPE 5.51%, maximum 14.45%, 3/9 for the INR engine's own baseline; the observed-clean-substituted frozen formulas remain 4.62%, maximum 8.07%, 3/9.

## Readiness and local quote-service integration

Retained and extended `xiaomiApplicationCandidate.ts`: exact three-variant domain, matching questionnaire regime, explicit eSIM NOT_ASKED, fresh Cashify repository reference at the tested value (57,750 / 26,750 / 29,250). It rechecks date parsing, future timestamps and freshness instead of trusting a supplied fresh label. The calibrated condition evidence has a separate timestamp; it must also remain fresh under the **existing** freshness policy. A new Get Upto timestamp does not renew condition calibration. No new business percentage or refresh schedule was introduced.

`createXiaomiResearchQuoteService(existingService, options)` uses the current quote input shape and existing service's identity, diagnostics, reference resolution and questionnaire output. **Default options leave the active quote unchanged.** Explicit local `enabled: true` produces research previews only; no server route/environment flag activates it. It requires injected fresh exact-variant route evidence, with hash, matching warranty/bill/age semantics and eSIM mode. No client-submitted field supplies this evidence.

The preview returns the candidate equivalent, the existing protected uplift, unchanged Get Upto and the existing payout function's result. It does **not** reuse the legacy token for a changed price and exposes **no candidate quote token or lead-verification method**. Other brands still return the original quote. The application server continues to use its original service directly.

In-memory fixture integration succeeds for all 13 Note observations (including controls), both existing 17/Turbo combined predictions, Get Upto, uplift and payout. Disabled mode returns the identical original signed quote, including severe INR 16,630; enabled Note preview returns component-derived 560, protected offer 660 and existing no-coupon displayed payout 561. Fixture references/profiles are explicitly simulations, not claimed production rows. Stale, changed, legacy, missing or incompatible inputs are refused; no silent legacy fallback is presented as a candidate result.

Before any later production integration/activation, verify these precise stored inputs with separately approved read-only access:

* **ReferencePrice:** exact deviceKey/brand/model/storage for all three variants, currentPrice representing Get Upto, source `cashify`, matchConfidence and variant/sourceUrl evidence, lastVerifiedAt, consecutiveFailures and failure/status metadata. Freshness must be recomputed; no snapshot-only or clean-price substitution is acceptable. Changed Get Upto requires new condition/baseline validation.
* **CashifyQuestionnaireProfile:** exact modelKey/brand/model, status OK, warrantyMode/billMode/ageMode, questionLabels, variantsChecked, parserVersion, sourceUrl, observedAt/updatedAt. Confirm the modes apply to the **warranty-No, bill-Yes route for this exact variant**, rather than assuming a model-level age mode describes conditional routing. The quote service currently exposes modes/source, not the profile's status or observation timestamp.
* **Route metadata absent from the existing profile schema:** explicit eSIM NOT_ASKED, conditional final age NOT_ASKED, exact variant and answer-regime evidence with an observed timestamp/hash. Current null answers do not establish these. Only local fixtures currently provide the adapter dependency; production availability is unverified.
* **Condition calibration:** version, independent evidence identifiers, observed timestamp and validated reference domain. The weekly reference-refresh interface refreshes Get Upto, not clean retention or these repair costs. Existing profile/reference records alone cannot establish this calibration's continued accuracy.

No schema, stored questionnaire data or production record was changed. The previously prepared read-only production SQL remains **unexecuted**.

## All relevant outcomes, including failures and exclusions

The sanitized fixture contains all 19 observations from the component block, original INR/main predictions, frozen additive predictions, roles and timestamps, plus all ten prior Note outcomes. It keeps failed prices null. Alongside the 13 Note rows detailed above, the six other rows are 17/Turbo opening/closing clean controls and their two unseen defect profiles; no observation was silently discarded from the fixture.

The 17 non-original-screen + speaker observation is 33,320 (old INR 34,920); Turbo charging + front camera is 16,640 (old INR 17,360). They remain unsupported, since combined increments do not isolate new component costs. 17 clean remains 42,720, Turbo clean 19,640, with stable opening/closing references 57,750 / 26,750. Unchanged INR across the six genuinely new profiles in that prior block still has MAPE 58.55%, max 174.88%; main code 14.31%, max 31.23%. No failed result was replaced by the new candidate's selected exact score.

Prior Note outcomes preserved:

| Job/case | Accepted Selling or outcome | Candidate status |
|---|---|---|
| Original V6 / CLOSE-V6 | 21,780 / 21,780 | Earlier clean stability evidence |
| Original V8 cracked glass, working touch | 19,100 | Unsupported display condition |
| Original NOTE-TOUCH | 17,280 | Unsupported failed touch |
| Original NOTE-CAP eight faults | FAILED, final price missing/masked, null | Unsupported; never zero |
| Prior candidate NOTE-W-OPEN / NOTE-W-CLOSE | Both FAILED, question label unverified, null | Warranty-Yes remains unsupported |
| Prior candidate NOTE-N-OPEN at 15:26:43.629 | FAILED, Selling label absent, null | Preserved failure; not retroactively accepted |
| Later NOTE-N-OPEN at 15:49:34.845 | Accepted 21,780 | Distinct reviewed later control |
| Prior NOTE-SEVERE at 15:49:59.126 | Accepted 560 | Established-profile observation, not new holdout |
| NOTE-W-ROUTE attempts 15 and 18 | Routing only, no extracted price | Warranty-Yes cracked route; no forced age state or warranty claim |

Thus there are four prior Note final-quote failures, two prior routing-only attempts, and zero failures in the 19-quote component block. Warranty-Yes clean final-price evidence remains missing. Known failed calibration/generalization outcomes remain in their original reports. No new collection was authorized or performed.

## Verification and review state

Passed, with DATABASE_URL and DIRECT_URL set to unreachable localhost: Note candidate 75 assertions; local service integration 34; existing readiness/cap-mechanism 20; preserved two-variant v1 31; INR/cap 22; cross-brand regression 27; condition matrix 20; calibration 9; mocked production service 37; quote consistency 10; Get Upto 5; exact variant matching 39; 15 pending Redmi variant checks. The fitted calibration harness remains 20/20, mean 0.71%, max 1.78%; it is still calibration, not independent validation. Large catalog/generalization property sweeps were not repeated because production paths and tables are unchanged.

Pricing Next TypeScript passes, including the candidate, adapter, evaluation harness and fixtures/tests. Server TypeScript has the same six existing admin/inventory/generated-client/missing-puppeteer/random-test errors and no errors in new code. Collector code was neither changed nor run in this task.

Original frozen register, failed reports, v1 source, additive registration, raw observations and attempt-ledger hashes were rechecked unchanged. Latest plan SHA-256 `fc0af11db030ca18abe9ef9cc0dd70177ef50335d94eb254becf68cfacd8c6f0`; additive registration `a7edb27e47b8b432759456600b669fde59ec1ef42d49ba7af9144be38a5239c0`; observations `e4870dd77517ad168f22dfff37915729cc98d8a659522550b7dc2b7834124a56`. Raw traces/screenshots/SQLite/session material stay ignored in the separate collector. Only sanitized numeric fixtures belong to this pricing change.

Reproduce the file-only analysis with `node ../../../node_modules/tsx/dist/cli.mjs scripts/pricing/evaluate-xiaomi-note-candidate.ts` from this worktree, using sentinel DB URLs. It prints all 19 rows, separate baseline scenarios and prior failures. Local evaluation and targeted-check logs are ignored under root `scratch/xiaomi-severe-followup-2026-10-01/`; raw evidence remains in the existing separate collector's `research-evidence/xiaomi-severe-followup-2026-10-01/`.

The component correction and disabled local preview integration are ready for research review. Production activation remains blocked: stored input availability is unverified, conditional route metadata is absent from the current interface, changed-reference/time baseline generalization is unverified, and unsupported profiles must remain explicit refusals. No new independent-success claim is made for today's implementation.
