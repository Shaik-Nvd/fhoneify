# Workbook pricing correction and application-input audit

The original workbook has 66 supplied prices on 22 Apple/Samsung variants. This implementation fits only the 48 prices on 16 development variants. All 18 prices on six whole-device holdouts were excluded from fitting. The coordinator's initially proposed every-third split was superseded before fitting because its outcomes had been previewed; the actual six unexposed devices were reserved explicitly, with the supersession preserved by the data agent. No new Cashify outcomes were used to change these parameters.

The workbook entries are tester reports, not browser-verified evidence. Dates, city/PIN, routing, exact answer traces and screenshots are missing. The common intent is warranty No, bill Yes, box/charger Yes and age Above 11 months **only if asked**. Unknown visibility remains unknown. Older Xiaomi charger-No observations are not pooled with these charger-Yes reports. No import/file-modification date is treated as an observation timestamp.

## Concrete local correction

`teamWorkbookCandidate.ts` implements a separate research calculation: round-to-10 of Get Upto multiplied by an exact-variant conditional retention, minus selected supported rupee components. Retention is learned from development clean Selling divided by reported Get Upto; runtime calculation does not need a current clean quotation or permanently store a clean price. A measured-clean-control diagnostic is an explicitly different baseline mode.

Component costs are clean minus single-fault Selling. For screen-plus-body profiles the incremental body cost is `(clean - C) - (clean - B)`, then calculated as screen cost plus body cost; the combined final price is not a lookup. Only the exact observed profiles are allowlisted. No arbitrary multi-fault, display-plus-hardware or severe eligibility rule is invented. Legacy engine caps/floors remain intact and are not applied or removed globally by this pure research candidate.

Four development devices support a shared glass-to-heavy-scratch repair-anchor hypothesis: Apple iPhone 8 and 14 Pro Max, Samsung S26 Ultra and Fold5. Their heavy-scratch losses sum to 25,190 and glass losses to 50,980, giving `glassLoss = round10(heavyScratchLoss * 50980 / 25190)`. This is a ratio between observed repair losses, not a universal percentage of Get Upto. It reproduces these four development glass losses after rounding. A separate preregistered helper tests this ratio on wholly held-out devices using their measured clean and scratch anchors; that test is deduction transport, not full application-input accuracy.

Apple 16 and 17 Pro Max both have reported charging loss 2,500, while camera losses are 6,000 and 6,200. The cost tables preserve this common charging amount without declaring it an all-iPhone or cross-brand rule. Samsung Note 10 Lite's charging 1,000 and camera 2,500 remain exceptions supported only by its reports. Display lines and heavy spots agree within XS Max, 15 Pro Max and A72, but absolute losses are 6,970, 19,550 and 4,190; they are not pooled into one family cost. Different baseline retention (0.7192 to 1.0384 Apple; 0.7604 to 0.9988 Samsung) does not justify one shared clean coefficient under unknown age routing.

| Development variant | Conditional retention | Supported damage rupee components |
|---|---:|---|
| Apple iPhone 8 128 GB | 0.9965812 | Heavy screen 940; glass from shared anchor 1,900 |
| Apple iPhone XS Max 256 GB | 0.9984177 | Lines 6,970; heavy spots 6,970 |
| Apple iPhone 11 Pro Max 256 GB | 1.0384205 | Local screen 12,000; touch 11,310; **preview blocked: baseline/reference inconsistency** |
| Apple iPhone 14 256 GB | 0.9992965 | Heavy screen 5,290; incremental body 880, only observed combined profile |
| Apple iPhone 14 Pro Max 256 GB | 0.9689974 | Heavy screen 6,320; glass from shared anchor 12,790 |
| Apple iPhone 15 Pro Max 512 GB | 0.7879415 | Lines 19,550; heavy spots 19,550 |
| Apple iPhone 16 256 GB | 0.8114035 | Charging 2,500; back camera 6,000 |
| Apple iPhone 17 256 GB | 0.7192308 | Heavy screen 8,820; incremental body 2,750, only observed combined profile |
| Apple iPhone 17 Pro Max 512 GB | 0.7355556 | Charging 2,500; back camera 6,200 |
| Samsung M32 4/64 | 0.9943978 | Body scratches 210; dents 370 |
| Samsung A72 8/128 | 0.996875 | Lines 4,190; heavy spots 4,190 |
| Samsung S21 Ultra 12/256 | 0.9988325 | Local screen 5,850; touch 11,700 |
| Samsung S25 Edge 12/256 | 0.7937734 | Heavy screen 5,290; incremental body 1,400, only observed combined profile |
| Samsung S26 Ultra 12/512 | 0.7772754 | Heavy screen 6,170; glass from shared anchor 12,490 |
| Samsung Fold5 12/256 | 0.7603538 | Heavy screen 11,760; glass from shared anchor 23,800 |
| Samsung Note 10 Lite 6/128 | 0.9964286 | Charging 1,000; back camera 2,500 |

## Accuracy and error decomposition

The 48 development quotations reproduce exactly at their supplied references with the learned conditional baseline. This is fitting accuracy, not independent validation. No failed earlier Xiaomi holdout is replaced or reclassified.

Legacy-engine comparisons assume all relevant questions asked, age Above11, box/charger Yes and eSIM NOT_ASKED, solely to isolate formula/reference effects. These assumptions are explicit scenarios, not facts established by the workbook. Every row in local `development-analysis.json` retains observed price, exact reference, source, signed error, APE, baseline error, deduction error and cancellation flag. Identity uses exact model/capacity; only capacity-unit whitespace is normalized (`256 GB` equals catalog `256GB`). RAM/capacity numbers, units and separators are preserved; no nearby variant is substituted.

| Scenario, development only | Apple n=27 MAPE/max | Samsung n=21 MAPE/max | Overall n=48 MAPE/max |
|---|---:|---:|---:|
| Existing engine at reported Get Upto | 17.50% / 64.97% | 21.91% / 97.49% | 19.43% / 97.49% |
| Existing engine at available local reference | 18.56% / 82.39% | 21.66% / 96.35% | 19.92% / 96.35% |
| Raw learned candidate at available local reference, including preserved FM003 anomaly | 19.70% / 64.75% | 2.31% / 7.13% | 12.09% / 64.75% |

The candidate is worse on the Apple local-reference scenario, so improved fitting is not evidence that available-reference inputs solve Apple pricing. Local Apple14 reference 42,844 versus reported 28,430 and Apple15 Pro Max 92,956 versus reported 72,480 create large baseline displacement when conditional retention is applied. Observation dates are unknown; drift, tester-reference error and regime mismatch cannot be distinguished from these records alone.

Excluding the three FM003 anomaly rows that the preview rejects gives 45 numeric counterfactuals: Apple n=24 MAPE 19.44%, max 64.75%, MAE 5,412.50; Samsung n=21 MAPE 2.31%, max 7.13%, MAE 621.43; overall 11.45%, max 64.75%, MAE 3,176.67. There are 30 overpayment and 15 underpayment scenarios, 22/45 within 3%. These calculations deliberately expose changed-reference sensitivity; the readiness guard does not serve them as supported quotes.

App-ready coverage is **zero**, because production-stored inputs remain unverified and the historical calibration dates/traces are unknown. Zero coverage is not zero error. Local data consists primarily of legacy-migration references last verified Sep9 and now approaching stale; Fold5 uses an undated snapshot. No production query was executed.

For any defect, `price error = predictedClean - observedClean + observedDeduction - predictedDeduction`. Existing-engine FM008_B (iPhone15 Pro Max lines) appears accurate at -75 / 0.20% only because -2,398 baseline error cancels +2,323 insufficient deduction. Samsung S21 Ultra local-screen case similarly gives -112 / 0.99% from -3,436 baseline plus +3,324 deduction error. Neither confirms either submodel. All such cancellation is retained in the analysis JSON.

## Local quote-service integration and activation requirements

`createTeamWorkbookResearchQuoteService` wraps the existing authoritative service without changing it. Default is disabled, returning the original signed quote unchanged. Enabled Xiaomi handling delegates to the preserved Xiaomi research adapter. Other unhandled brands preserve the existing path. Candidate results are provisional previews without quote tokens or `verifyLeadPrice`; existing starting-price/uplift, payout fee and rounding functions are reused unchanged.

Enabled previews require exact variant routing, profile source, fresh route evidence and hash, verified warranty/bill/age modes, accessory/eSIM visibility, fresh Cashify repository Get Upto, and the observed reference domain. Ready mode always refuses undated/unverified tester calibration. A separate explicitly named `allowUnverifiedDevelopmentCalibration` fixture switch permits labelled provisional research outputs only; it does not turn import time or new reference time into an observation date. iPhone11 Pro Max additionally returns `REFERENCE_BASELINE_INCONSISTENT` because clean 19,460 exceeds its reported Get Upto 18,740. That anomaly is preserved; no price is clamped or silently corrected.

Production verification requires read-only checks of ReferencePrice's exact deviceKey/brand/model/storage, currentPrice, source/sourceUrl, matchConfidence/matchEvidence, lastVerifiedAt and consecutiveFailures; and CashifyQuestionnaireProfile's warrantyMode/billMode/ageMode, status, observedAt, questionLabels, sourceUrl, variantsChecked and parserVersion. Current schema has **no** exact-variant conditional accessory/eSIM routing fields or condition-calibration timestamps/hashes. Those cannot be inferred from null answers or a model-level first-page profile. Production checks remain prepared, unexecuted and subject to owner approval. The weekly reference interface can refresh Get Upto but cannot renew the learned condition calibration.

Unit assertions: 87 pass. Local quote-service integration: 67 pass, including 45 provisional accepted development profiles, three FM003 refusals, strict undated-calibration refusal, storage formatting, stale/future source/route records, unsupported conditions and default/cross-brand preservation. Standalone strict TypeScript for both added modules and tests passes. Coordinator runs the integrated repository checks. No millions-of-quotes suite is required by these opt-in modules.

Initial frozen source/fixture hashes and timestamps live in `candidate-preregistration.json`. Original source is preserved in `frozen-v1/`; append-only manifests record unit-whitespace/FM003 guards and the strict Partial<Record> typing correction. None changes numeric parameters or the frozen glass hypothesis after held-out outcomes. The destination manifest lists only new modules, fixtures and tests; active engine, Xiaomi candidate files, cap regression, pending Redmi entries, refresh and schemas remain untouched.
