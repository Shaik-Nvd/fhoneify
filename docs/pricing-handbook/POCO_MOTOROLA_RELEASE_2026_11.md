# POCO, Motorola and Nokia 8.1 candidate - 18 November 2026

Draft candidate only. No merge, deployment, production refresh, migration, OTP or lead creation was performed. Branch: codex/poco-motorola-rules-20261117. Base: current main cfb6de9, after PR #37 merged on 17 November. Implements [the work order](POCO_MOTOROLA_CODEX_PLAN.md); owner section 2 catalog/inference decisions were explicitly authorized in the task.

## Imported evidence and provenance

| Brand | Models / unique variants | Priced source rows | Unique selected-source priced rows | Distinct primary answer profiles | Pending | No-offer |
|---|---:|---:|---:|---:|---:|---:|
| POCO | 48 / 114 | 5,569 | 5,569 | 5,113 | 0 | 0 |
| Motorola | 90 / 131 | 6,420 | 6,328 | 5,808 | 44 | 8 |
| Nokia 8.1 rerun | 1 / 2 | 92 | 92 | 84 | 0 | 0 |

The 91 Motorola folders include a repeated Edge 50 Fusion folder: both storages and all 92 priced records agree, counted once for replay. POCO has 48 folders; Nokia one. JSON/CSV/text/checkpoint prices and arithmetic reconcile; mirror ZIPs are not additional evidence. Identical healthy controls remain in selected-source service replay but are grouped before fitting/holdout. No disagreeing priced answers. POCO and Motorola observations date 15-16 November, Nokia 16 November. 65 POCO variants and 68 Motorola variants have age questions; 49 and 63 do not. Both Nokia 8.1 variants have no age questions.

The raw archives, every-member SHA-256 inventory, source pointers, mirrors, observation dates and quote-level exports remain under gitignored pricing-inputs/, data/pricing-evidence/*-2026-11-17/ and release-test-logs/poco-motorola/. diagnostic.json and .running.lock were ignored and not published. Archive SHA-256:

- poco final.zip: 7d516b43289ea1d81716a8a3cd19e2508116a98e65e29c99799eb5a5a601fbaa
- Motorola.zip: b5b27e8f55260a43dc35d8c8c9b4cb17c792c87c3d5cfe8f8d3eeb190023d896
- used-nokia-8-1.zip: 2ba5c5113468403176fb81c9d935a1b000aed4bb726ea0396cba36f5c1d89864

## Model and uncertainty

48 POCO and 90 Motorola profiles extend cashifyRunnerModel. Only nokia81 changed within the released Nokia calibration; its other 31 profiles are byte-equivalent as JSON. Fixed repairs, percentages, reference-scaled byStorage exceptions and three-storage-only affine/capped forms reuse the existing fitter. Rules retain dates, measured storage support, no-offers and inference labels. The current reference still drives condition prices and the original-reference tier bonus, applied once with the existing INR 1,000 cap and minimum/fee/token semantics.

Moto One 4 GB/64 GB has just two priced cases (baseline and front camera); 44 remain pending. 39 rules and scrap are inferred from the same-brand One-series Motorola One Action, explicitly marked inferredFrom/scrapInferredFrom. No empirical accuracy is claimed for those unobserved answers. Every POCO profile and both Nokia 8.1 variants have their own measurements; cross-storage extrapolation and unobserved combinations remain inferred behavior.

Razr hinge and outer-screen branches use measured rules. The original Moto Razr outer-screen measurement is a no-offer: it remains visible in questionnaire metadata and returns inspection, rather than disappearing because no numeric rule exists.

## Service replay and holdout gates

| Brand | Selected-source priced service replay within INR 20 | MAE | Over / under | Worst absolute replay error | Storage holdout within INR 20 | Holdout MAE |
|---|---:|---:|---:|---:|---:|---:|
| POCO | 5569/5569 (100%) | INR 0.46 | 99 / 159 | INR 10 | 4951/4977 (99.48%) | INR 2.19 |
| Motorola | 6328/6328 (100%) | INR 0.20 | 30 / 97 | INR 10 | 3269/3337 (97.96%) | INR 5.66 |
| Nokia | 92/92 (100%) | INR 1.09 | 3 / 7 | INR 10 | 84/84 (100.00%) | INR 2.50 |

All eight Motorola no-offers return MANUAL_INSPECTION_REQUIRED and no signed price. No priced source rows were refused. Replay is fitted regression, not independent validation. Holdout is conditional leave-one-storage-out: discovery selected forms on the full corpus, then coefficients, percentage anchors and storage values were refitted using training storage only. Mirrors and identical answer profiles stay together. Refusals count as misses. Motorola has one holdout refusal among 3,337 cases (3,336 numeric predictions). All three brands exceed the unchanged 95% gate. Holdout worst errors: POCO +/-INR300; Motorola +INR 940 (E13 8/128 face sensor), -INR840 (Signature 12/256 touch); Nokia +/-INR20. These worst cases are disclosed even though the aggregate gate passes.

Nokia 8.1 before/after on all 92 rerun rows: within INR 20 improves 42/92 to 92/92; MAE INR 211.20 to INR 1.09; maximum absolute error INR 1,060 to INR 10. Before had 3 overquotes and 50 underquotes; after 3 and 7.

## Protected behavior and verification

26,496 protected catalog scenarios at INR 20,000/INR 50,000 and clean/calls/age/camera/cracked/accessory conditions match main cfb6de9 exactly (SHA-256 7132e1890bc52eacea0d79e2dfef17eac19b26c4dbe9a6af0a8fd8a641d87ddc). Apple, Samsung, Google, Nothing, OnePlus, Xiaomi/Redmi, Honor, Asus, Lenovo and Nokia except 8.1 are included. Their calibration files are unchanged, with only the scoped Nokia profile replacement. Previously released questionnaire metadata is unchanged outside 8.1. Unprofiled POCO and Motorola keep existing calculator fallbacks. Engine version bumped once to cashify-runner-rules-v6.

- Offline suite: 94 passed, 0 failed, 2 intentionally excluded (real DB-writing quote integration and the browser-only agent-z suite). The three browser flows were run separately.
- Both tsc projects and the added strict tooling check: exit 0.
- npm run build: exit 0; existing lint warnings remain. Initial font-fetch attempt was sandbox-blocked; network-enabled build passed with deliberately unreachable database endpoints.
- Browser: three built-frontend flows passed (POCO X7 8/128, Moto G85 8/128, Razr 50 Ultra 12/512), no page errors. Verified Get Upto equals controller response and survives reload, measured accessories, age selection/reload, Wi-Fi answers, signed controller quotes and the login boundary. Razr hinge/outer-screen options verified. Screenshots: [Razr hardware](assets/poco-motorola-local-qa/motorola-razr-fold-fold-options.png), [POCO reload](assets/poco-motorola-local-qa/poco-x7-reload.png), [Motorola reload](assets/poco-motorola-local-qa/motorola-g85-reload.png).

Browser used the production controller/service with injected local reference fixtures and an unreachable database. Real OTP, authenticated final screen, lead creation, Supabase lead persistence and live deployed behavior were not tested. Existing offline signed-quote/lead consistency tests cover the shared machinery; that is separate from real browser persistence evidence.

### Test-scope decisions and historical discrepancy

The older legacy-age test now leaves measured POCO to the new service age tests; it still checks 1,073 legacy catalog variants. The protection fingerprint was recaptured on the actual main base with this round's authorized scope, retaining Xiaomi and other Nokia protections.

The generalization suite applies its existing alternative-display branch treatment to POCO/Motorola: cracked and chipped/scratched answers replace each other and are not an additive fault ladder. In the initial run 24 such comparisons failed. The suite still checks each answer against clean and retains true added-fault monotonicity, finite values, floors, tier/cap and all other comparisons. No pricing rule, evidence amount or tolerance was altered to satisfy a synthetic ordering.

Historical team QA qa-pocof6-display is a material discrepancy: at its old INR 13,720 reference, the current runner condition value is INR 11,030 versus the older INR 8,240 Cashify quote, a +INR 2,790 difference. The current 15-16 November run at INR 10,860 records original-screen-No at INR 8,520 with all accessories present (INR 2,340 repair); it has no age/ownership questions, unlike the historical QA branch. The historical QA suite retains its old-calculator check (as it already did for Samsung), explicitly logs the current-runner discrepancy and does not change old goldens or thresholds. Passing that historical regression does not claim the new runner matches this older observation. The draft requires review of this disagreement before release.

## Read-only production audit and catalog

Audit timestamp 2026-11-17T18:26:26Z; database-enforced transaction_read_only=on, only ReferencePrice and CashifyQuestionnaireProfile read. POCO: 113 references, all FRESH; 48 profiles. Motorola: 74 references, all FRESH; 59 profiles, 32 new-data models lack a crawler profile (measured runner metadata supplies questionnaire semantics). Nokia: 56 references / 33 profiles across the brand; the two 8.1 reference rows are FRESH and its model has a profile.

Catalog now contains 114 POCO variants (all measured), 132 Motorola variants (131 in the evidence, Moto Razr 40 8/256 untested), and 56 Nokia variants (all earlier Nokia rules except 8.1 preserved). The 59 added rows are reference-pending with no basePrice, every one carrying its exact checkpoint Cashify link; the dedicated test checks all 59. No production reference rows were added or refreshed. Pending variants cannot quote until a trusted reference exists.

### Variants needing post-merge reference refresh

Owner release action only; no refresh run in this task. 1 POCO and 58 Motorola additions:

| Brand | Model | Storage | Exact Cashify link |
|---|---|---|---|
| POCO | POCO X8 Pro Max 5G | 12 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-poco-x8-pro-max-5g-12-gb-512-gb) |
| Motorola | Motorola Moto G04 | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g04-4-gb-64-gb) |
| Motorola | Motorola Moto G04 | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g04-8-gb-128-gb) |
| Motorola | Motorola Moto G04s | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g04s-4-gb-64-gb) |
| Motorola | Motorola Moto G05 | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g05-4-gb-64-gb) |
| Motorola | Motorola Moto G06 Power | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g06-power-4-gb-64-gb) |
| Motorola | Motorola Moto G13 | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g13-4-gb-64-gb) |
| Motorola | Motorola Moto G13 | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g13-4-gb-128-gb) |
| Motorola | Motorola Moto G14 | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g14-4-gb-128-gb) |
| Motorola | Motorola Moto G24 Power | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g24-power-4-gb-128-gb) |
| Motorola | Motorola Moto G24 Power | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g24-power-8-gb-128-gb) |
| Motorola | Motorola Moto G34 5G | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g34-5g-4-gb-128-gb) |
| Motorola | Motorola Moto G34 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g34-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G35 5G | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g35-5g-4-gb-128-gb) |
| Motorola | Motorola Moto G35 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g35-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G37 5G | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g37-5g-4-gb-64-gb) |
| Motorola | Motorola Moto G37 Power 5G | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g37-power-5g-4-gb-64-gb) |
| Motorola | Motorola Moto G37 Power 5G | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g37-power-5g-4-gb-128-gb) |
| Motorola | Motorola Moto G37 Power 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g37-power-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G45 5G | 4 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g45-5g-4-gb-128-gb) |
| Motorola | Motorola Moto G45 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g45-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G54 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g54-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G54 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g54-5g-12-gb-256-gb) |
| Motorola | Motorola Moto G57 Power 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g57-power-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G64 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g64-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G64 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g64-5g-12-gb-256-gb) |
| Motorola | Motorola Moto G67 Power 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g67-power-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G67 Power 5G | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g67-power-5g-8-gb-256-gb) |
| Motorola | Motorola Moto G67 Power 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g67-power-5g-12-gb-256-gb) |
| Motorola | Motorola Moto G72 | 6 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g72-6-gb-128-gb) |
| Motorola | Motorola Moto G8 Plus | 4 GB/64 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g8-plus-4-gb-64-gb) |
| Motorola | Motorola Moto G84 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g84-5g-12-gb-256-gb) |
| Motorola | Motorola Moto G85 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g85-5g-12-gb-256-gb) |
| Motorola | Motorola Moto G86 Power 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g86-power-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G96 5G | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g96-5g-8-gb-128-gb) |
| Motorola | Motorola Moto G96 5G | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-g96-5g-8-gb-256-gb) |
| Motorola | Motorola Moto Razr 60 Ultra | 16 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-razr-60-ultra-16-gb-512-gb) |
| Motorola | Motorola Moto Signature | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-signature-12-gb-256-gb) |
| Motorola | Motorola Moto Signature | 16 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-signature-16-gb-512-gb) |
| Motorola | Motorola Moto Signature | 16 GB/1 TB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-signature-16-gb-1-tb) |
| Motorola | Motorola Moto Edge 40 Neo | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-40-neo-8-gb-128-gb) |
| Motorola | Motorola Moto Edge 40 Neo | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-40-neo-12-gb-256-gb) |
| Motorola | Motorola Moto Edge 50 | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-50-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 50 Pro | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-50-pro-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 50 Ultra | 12 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-50-ultra-12-gb-512-gb) |
| Motorola | Motorola Moto Edge 60 | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-12-gb-256-gb) |
| Motorola | Motorola Moto Edge 60 Fusion | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-fusion-8-gb-128-gb) |
| Motorola | Motorola Moto Edge 60 Fusion | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-fusion-12-gb-256-gb) |
| Motorola | Motorola Moto Edge 60 Pro | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-pro-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 60 Pro | 16 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-pro-16-gb-512-gb) |
| Motorola | Motorola Moto Edge 60 Stylus | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-60-stylus-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 Fusion | 8 GB/128 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-fusion-8-gb-128-gb) |
| Motorola | Motorola Moto Edge 70 Fusion | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-fusion-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 Fusion | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-fusion-12-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 Fusion | 12 GB/512 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-fusion-12-gb-512-gb) |
| Motorola | Motorola Moto Edge 70 Pro 5G | 8 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-5g-8-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 Pro 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-pro-5g-12-gb-256-gb) |
| Motorola | Motorola Moto Edge 70 Pro Plus 5G | 12 GB/256 GB | [Cashify](https://www.cashify.in/sell-old-mobile-phone/used-motorola-moto-edge-70-pro-plus-5g-12-gb-256-gb) |

## Remaining coverage and future combinations

Vivo (324), Realme (262), Oppo (236), iQOO (95), Tecno (68), Infinix (63), Huawei (5) and LG (4) remain on their existing pricing without this runner evidence. One pre-existing catalog row has no brand and remains untouched. Still-unmeasured exceptions: Redmi 3S, 3S Prime, 4A, Nokia 5.1 and Moto Razr 40. This work makes no parity claim for them.

[POCO combinations](../next-quotes/poco-poco-motorola-round-combinations.md), [Motorola combinations](../next-quotes/motorola-poco-motorola-round-combinations.md) and [Nokia 8.1 combinations](../next-quotes/nokia-poco-motorola-round-combinations.md) freeze the candidate model/calibration hashes. There are 196 planned rows (18 not applicable), including Razr hinge + outer screen and overlapping display faults. They are uncollected, not accuracy evidence. Score future observations against the frozen rules at the new observed reference before refitting. Multi-fault floors and Moto One inference need owner-collected combination data.

No schema, auth, refresh job, business bonus or deployment configuration changes. Rollback is the previous main revision; do not deploy this draft as a side effect of review.

## Reproduction

Run from this branch after dependency setup. Supply the owner archives locally; raw data is intentionally not shipped.

- Import: node --import tsx scripts/pricing-evidence/import-cashify-runner-data.ts <archive.zip> --brand POCO (or Motorola/Nokia) --out data/pricing-evidence/<brand>-2026-11-17
- Fit POCO/Motorola: node --import tsx scripts/pricing-evidence/fit-cashify-runner-calibration.ts --brand <brand> --input=data/pricing-evidence/<brand-lowercase>-2026-11-17/measurements.jsonl --write
- Fit Nokia rerun: same fitter with --brand Nokia --input=data/pricing-evidence/nokia-2026-11-17/measurements.jsonl "--only-model=Nokia 8.1" --write
- Replay and storage holdout: node --import tsx scripts/pricing-evidence/validate-poco-motorola.ts POCO (repeat Motorola and Nokia)
- Portable suite: node --import tsx scripts/pricing-evidence/run-offline-suites.ts
- Types: node node_modules/typescript/bin/tsc --noEmit -p tsconfig.next.json and tsconfig.server.json
- Local browser fixture controller: RUNNER_QA_PORT=5317 node --import tsx scripts/pricing-evidence/runner-browser-api.ts; build with NEXT_PUBLIC_API_URL=http://127.0.0.1:5317; next start -p 3317; node scripts/pricing-evidence/verify-poco-motorola-browser.cjs

No production refresh or writing integration test is part of these commands.

## Independent branch review

Fresh read-only review of cfb6de9..7a9ca19 found no Critical, Important or Minor issues. The reviewer independently reran service tests, primary fitted replay, all59pending-link checks and26,496protected scenarios, plus35boundary probes covering malformed/missing answers, unknown models/storage, reference moves, inferred storage and combined Razr no-offer conditions. Only nokia81 changed in Nokia; pending URLs match the private checkpoints; affine/capped rules have at least three storages.

The reviewer did not judge live deployment/OTP/authenticated display/lead persistence, or empirical accuracy of unobserved combinations, inferred Moto One answers and future reference changes. Those remain unverified as stated above. The review supports a draft PR, with no merge or deployment approval.
