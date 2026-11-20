# Tecno measured rules and the missing-models catalog (21 November 2026)

Branch `claude/tecno-rules-20261121`, built on `main` a7c0554. Extends the shared `cashifyRunnerModel` with `calibration.tecno.json`; engine version `cashify-runner-rules-v8`. Same importer, fitter, model and validator as Oppo and Infinix (`OPPO_INFINIX_RELEASE_2026_11.md`).

## What changed

- **Tecno:** 59 measured model profiles. A brand branch in `routeBrandCalculator` uses the runner; a model without a profile falls through to the generic Android calculator unchanged. Every Tecno phone in the catalog now has a profile.
- **Quote page:** follows each measured Tecno profile (age, charger, face sensor; the Phantom V Fold, Fold2, Flip and Flip2 keep the outer-screen and hinge answers).
- **Catalog:** 15 tested Tecno variants added as reference-pending with their exact Cashify links. Missing models from the owner's 20 November catalogue audit were added the same way (see *Missing models*).
- **Ai+:** added to the brand list; its phones use the generic Android calculator until test data exists.
- No other brand's price changed (see *Protected prices*).

## Source data (private, not committed)

| | Tecno |
|---|---:|
| Archives | `Tecno.zip` (59 folders, 13 to 19 Nov) and `TechnoLast5.zip` (5 re-runs) |
| Unique variants | 83 (92 with re-runs) |
| Priced quotes | 4,424 |
| Pending (not prices) | 46 |
| No-offer | 1 (Pova Neo 6/128, 3 or more minor spots) |
| Primary (de-duplicated) priced rows used for fitting | 3,695 |

- `TechnoLast5.zip` re-runs the three incomplete runs in `Tecno.zip` (Phantom V Fold 12/512, Spark Power 2 4/64, Spark Power 2 Air 3/32) and two complete ones (Camon 19 Pro 5G, Spark 10 5G). The newest run is primary.
- The 397 cases that appear in both archives agree to the rupee (0 disagreements).
- `diagnostic.json` files and the batch reports are ignored and never committed.

## Gates

| Gate | Result |
|---|---|
| Replay of every primary priced quote through the service, within ₹20 | **100%** (4,027 of 4,027; worst ₹10) |
| Measured no-offer returns manual inspection | 1 of 1 |
| Leave-one-storage-out within ₹20 (gate 95%) | **99.1%** (2,024 rows; mean error ₹2.8; 8 above ₹100, none above ₹1,000) |
| Protected prices | identical to `main` for every non-Tecno catalog row (row-by-row diff) |
| New pending rows carry a `cashifyLink` | all |

## Missing models (owner audit, 20 November)

The owner's PDF listed 100 Cashify models absent from Fhoneify. Each Cashify page was read over plain HTTP on 21 November (read-only, about one request every 1.2 seconds), and every storage page that showed a single "Get Upto" price was added as a reference-pending row with that exact page as its `cashifyLink`. No reference price was invented; the refresh prices them.

| Brand | Models | Variants added |
|---|---:|---:|
| Realme | 63 | 152 |
| Vivo | 8 | 22 |
| Ai+ (new brand) | 8 | 17 |
| iQOO | 3 | 9 |
| Samsung | 4 | 4 |
| OnePlus | 1 | 1 (7T Pro McLaren, restored as its original priced row `oneplus_7030`) |
| Tecno | 11 | covered by the 15 tested variants above |

Not added:

- **Apple iPhone Duo:** Cashify lists it at ₹2.1 to 3 lakh (12 GB with 256 GB to 2 TB). It looks like a placeholder for an unreleased phone; quoting it needs the owner's decision.
- **Vivo V50 Elite 12/512:** the page shows no price.

Galaxy S10e, Galaxy Z Flip and OnePlus 7T Pro McLaren had been removed on 19 November as unpriced. They are priced at Cashify's own addresses, which differ from the guessed ones (the Z Flip 8/256 page is `...-z-flip-8-gb-128-gb`, the McLaren page `...-7tpro-mclaren-...`), so they are back.

New models are priced by their brand's existing calculator (Realme, Vivo and iQOO legacy; Samsung's calculator for the unmeasured S26 FE; generic Android for Ai+) until test data exists. Their quote pages use the hand rules until the questionnaire walk reaches them.

## Hinge question

Cashify asks "Hinges Condition" on the body-defects page (inside "Device panel missing/broken") for every fold and flip that was checked: the four Tecno Phantom V models (measured), and Vivo X Fold 3 Pro and X Fold 5 (walked read-only on 21 November). The earlier note that Cashify never asks it was wrong: the question walk only reads the top-level tiles, not the options behind them.

- Tecno Phantom V Fold: Cashify takes 20% off for a broken hinge (₹4,120 of ₹20,600 on 12/512), measured on both storages. The runner now uses that measured rule.
- Vivo X Fold 3 Pro and X Fold 5 stay on the legacy 20% hinge deduction. It matches the Tecno measurement, but no Vivo price data exists yet.

## Verification

Run from the repository root:

- Importer: `node --import tsx scripts/pricing-evidence/import-cashify-runner-data.ts pricing-inputs/tecno-2026-11-21 --brand Tecno --out data/pricing-evidence/tecno-2026-11-21` (the input folder holds both archives' runs, prefixed `Tecno__` and `TechnoLast5__`; output is gitignored).
- Fit: `node --import tsx scripts/pricing-evidence/fit-cashify-runner-calibration.ts --brand Tecno --input=data/pricing-evidence/tecno-2026-11-21/measurements.jsonl --write`.
- Validation: `node --import tsx scripts/pricing-evidence/validate-tecno.ts`.
- Catalog and read-only reference audit: `audit-tecno-references.ts <env file>` then `audit-tecno-catalog.ts`.
- Tests: `pricing.tecno-{catalog,fit,service}.test.ts`, `pricing.missing-models-catalog.test.ts` and the updated `pricing.samsung-pixel-isolation.test.ts`.
- Results on this branch: offline suite 105 of 105 pass, both `tsc` projects pass, `npm run build` passes.
- Local browser QA (`verify-tecno-browser.cjs`, same setup as Oppo/Infinix): Camon 20, POVA 3 and Phantom V Fold pass Get Upto/reload, measured accessories, age persistence, API quote and login boundary; the Fold shows its outer-screen and hinge tiles; the Ai+ brand tile shows. Screenshots in `assets/tecno-local-qa/`. OTP, leads and the signed-in final screen were not tested.

## After merge and deploy

1. Refresh only the added variants (15 Tecno, 204 others and the restored McLaren) with the `devices` input of `reference-price-refresh.yml`, as for earlier brands, so they get prices the same day. Until then they return "reference unavailable".
2. Live-check one Tecno quote read-only.

## Still on old pricing

Vivo, Realme, iQOO, LG and Ai+, plus Moto Razr 40, Oppo A76 and Reno15 Pro Mini.
