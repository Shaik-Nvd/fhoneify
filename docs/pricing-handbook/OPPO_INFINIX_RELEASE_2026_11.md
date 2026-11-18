# Oppo and Infinix measured rules (18 November 2026)

Work order: `OPPO_INFINIX_CODEX_PLAN.md`. Branch `claude/oppo-infinix-rules-20261118`, built on `main` a9c1c8e. Extends the shared `cashifyRunnerModel` with `calibration.oppo.json` and `calibration.infinix.json`; engine version `cashify-runner-rules-v7`.

## What changed

- Oppo: 141 measured model profiles. `calculateOppoPrice` now tries the runner first; for a model without a profile (Oppo A76, Reno15 Pro Mini) the old bespoke Find X9 / Reno16 code runs unchanged.
- Infinix: 64 measured model profiles through a brand branch in `routeBrandCalculator`; models without a profile fall through to the generic Android calculator unchanged.
- The quote page follows each measured profile (age, charger, face sensor; fold phones keep outer-screen and hinge answers).
- 30 missing variants added to the catalog as reference-pending, each with its exact Cashify link.
- No other brand's price changed (see protected prices).

## Source data (private, not committed)

| | Oppo | Infinix |
|---|---:|---:|
| Folders | 150 | 64 |
| Unique variants | 239 | 83 |
| Priced quotes | 11,876 | 3,954 |
| Pending (not prices) | 132 | 0 |
| No-offer | 4 | 1 |
| Primary (de-duplicated) priced rows used for fitting | 10,566 | 3,622 |

Source quirks and how each was handled:

- **Duplicate Oppo folders (8 variants).** Where several folders hold the same variant, the newest complete copy is primary. Repeats that were priced agree to the rupee (0 disagreements).
- **Incomplete runs, no complete copy:** F31 5G 8/128, F31 Pro 5G 8/128, F31 Pro Plus 5G 8/256 (and the F1 Plus partly). Pending rows are never used as prices. Their untested answers are inferred, labelled `inferredFrom`: F31 Pro from F29 5G, F31 from F31 Pro, F31 Pro Plus from F31.
- **Oppo F19 6/128 folder is empty.** Treated as untested.
- **"(2)" copies.** Infinix Note 40X and 50X hold an older complete run (`checkpoint (2).json`, 17 Nov) beside a later re-run `checkpoint.json` (18 Nov), while `results.json` and the mirror ZIP belong to the older run. The importer reads the consistent older pair and records that the re-run changed 0 of 102 prices per folder. Oppo `results (2).json`, Infinix `Smart 5 Cashify_Test_Results (2).zip` and `full_test_results (2).txt` are older runs and are ignored.
- **Mirror ZIP differences.** Three folders (Oppo F19 6/128, Infinix Note 40X, Note 50X) differ from their ZIP only in `checkpoint.json`; recorded in the inventory, the folder copy is used.
- 40 Oppo and 8 Infinix `diagnostic.json` files and 4 `.running.lock` files are ignored and never committed.
- Brand spelling: the data and catalog use both `OPPO` and `Oppo`; matching is case-insensitive and the raw string is kept.

## Gates

| Gate | Oppo | Infinix |
|---|---|---|
| Replay of every primary priced quote through the service, within ₹20 | **99.98%** (11,513 of 11,515; **2 disclosed exceptions**, below) | 100% (3,954 of 3,954, worst ₹10) |
| Measured no-offers return manual inspection | 4 of 4 | 1 of 1 |
| Leave-one-storage-out within ₹20 (gate 95%) | 97.5% (7,862 rows; mean error ₹5.6; 85 above ₹100, 3 above ₹1,000) | 98.2% (1,676 rows; mean error ₹4.8; 16 above ₹100, none above ₹1,000) |
| Protected prices (every other brand) | 25,884 prices identical to `main` | same |
| New pending rows carry a `cashifyLink` | 30 of 30 | |
| Offline suite | see Verification | |
| `tsc` (both projects) | pass | |

### Disclosed exception (Oppo)

OPPO A5 5G (6/128 and 8/128), case "6 months to 11 months": Cashify charges ₹210 / ₹220, less than its ₹1,160 / ₹1,250 for "3 to 6 months". The shared engine rule "an older age bracket never pays less than a younger one" keeps the higher amount, so those two quotes are about ₹950 and ₹1,030 **below** Cashify (safe direction, 2 of 11,515 rows). It was left alone because the rule is shared by every brand and a change would need its own review. If the owner wants it matched, the rule can be skipped for a profile whose measured rules are non-monotonic.

## Before and after on the same data

| | Mean absolute error before (main) | After |
|---|---:|---:|
| Oppo | ₹930 (overpaid 8,989 of 11,502 quotes) | ₹0.5 on measured rows |
| Infinix | ₹690 (overpaid 3,685 of 3,954 quotes) | ₹0.3 |

Largest Oppo corrections: Find X9 Ultra (was ₹5,281 average error), Find X9 Pro, Find X8 Pro, Reno15 Pro, Find N3 Flip.

## Catalog and production-reference audit (read-only)

Production holds 236 Oppo and 63 Infinix references, all fresh; 139 and 49 questionnaire profiles. The audit ran in a read-only transaction; nothing was written.

**Added as pending (30), refresh needed after deploy:**

- Oppo (10): Find X8 5G 12/256 and 16/512, A53 6/128, A6c 4/64 and 4/128, Reno16 5G 8/256 and 12/256, Reno16c 5G 8/128, 8/256, 12/256.
- Infinix (20): GT 20 Pro 8/256, Hot 40i 8/256, Hot 50 5G 4/128 and 8/128, Hot 60 5G Plus 6/128, Hot 60i 5G 4/128, Note 40 5G 8/256, Note 40 Pro 5G 8/256, Note 40 Pro Plus 5G 12/256, Note 40X 5G 8/256 and 12/256, Note 50X 5G 6/128 and 8/128, Smart 10 4/64, Smart 8 4/64, Smart 8 HD 3/64, Smart 9 HD 3/64, Zero 40 5G 12/256 and 12/512, Zero Flip 5G 8/512.

**Catalog models with no data (stay on old pricing):** Oppo A76 6/128, F31 5G 8/256, F31 Pro 5G 8/256 and 12/256, F31 Pro Plus 5G 12/256, Reno15 Pro Mini 5G 12/256 and 12/512. (Their sibling storages are measured, so the F31 family still gets measured rules for the tested storage.)

One catalog id, `xiaomi_redmi_turbo_5_8_256`, is duplicated on `main`; not touched.

## Measured versus inferred

Measured rules cover every tested model and storage. Inferred (labelled in the calibration): the F31, F31 Pro and F31 Pro Plus untested answers (donor chain above); untested storages of any model use the model's own percentage or the `byStorage` fallback scaled by the reference. Each fitted rule keeps its observation dates (12 to 18 November).

## Still on old pricing

Vivo (324 catalog variants), Realme (262), iQOO (95), Tecno (68), Huawei (5), LG (4), plus Redmi 3S, 3S Prime, 4A, Nokia 5.1, Moto Razr 40, Oppo A76, Reno15 Pro Mini and Oppo F19 6/128.

## After merge and deploy

1. Run the weekly-style refresh for only the 30 added variants (workflow `reference-price-refresh.yml` with the `devices` input), as for POCO and Motorola.
2. Live-check one Oppo and one Infinix quote read-only.

## Verification

Run commands from the repository root:

- Importer: `node --import tsx scripts/pricing-evidence/import-cashify-runner-data.ts "<Oppo Final.zip>" --brand Oppo --out data/pricing-evidence/oppo-2026-11-18` (same for Infinix; output is gitignored).
- Fit: `node --import tsx scripts/pricing-evidence/fit-cashify-runner-calibration.ts --brand Oppo --input=data/pricing-evidence/oppo-2026-11-18/measurements.jsonl --write` (same for Infinix).
- Validation: `node --import tsx scripts/pricing-evidence/validate-oppo-infinix.ts Oppo` (and `Infinix`).
- Protected prices: `node --import tsx scripts/pricing-evidence/check-oppo-infinix-isolation.ts` (baseline captured on `main` a9c1c8e).
- Tests: `pricing.oppo-infinix-{catalog,importer,fit,service}.test.ts` and the updated `pricing.samsung-pixel-isolation.test.ts`.
- Local browser QA: `RUNNER_QA_PORT=5317 node --import tsx scripts/pricing-evidence/runner-browser-api.ts`, build with `NEXT_PUBLIC_API_URL=http://127.0.0.1:5317`, `next start -p 3317`, then `node scripts/pricing-evidence/verify-oppo-infinix-browser.cjs`.

Combination cases (inferred, never observed) are in `docs/next-quotes/oppo-oppo-infinix-round-combinations.md` and `infinix-oppo-infinix-round-combinations.md`.

Raw quotes, `diagnostic.json`, `.running.lock` and `(2)` copies stay private.
