# Samsung and Google Pixel pricing: verified state and Codex work order (13 November 2026)

Written from a read-only investigation of `main` at `8bcf2fd` (Nothing/OnePlus release, PR 32) and the owner's `SamSung.zip` and `Google Pixel.zip`. Read `AGENTS.md`, `docs/HANDOFF_CODEX.md`, `STRICT_RULES.md`, `ONEPLUS_CODEX_PLAN.md` and `RUNNER_REVIEW_2026_11_12.md` first. Every rule and gate there applies here. This file records what is new for these two brands.

**Extend the shared engine; do not build a new one.** Both brands use the same Cashify questionnaire and the same rule skeleton as Nothing and OnePlus. Add `calibration.samsung.json` and `calibration.google.json` to `lib/pricing/cashifyRunnerModel/` and extend the importer, fitter and model only where this file says so. Nothing and OnePlus prices must not change.

## 1. What was verified

### 1.1 Google Pixel data

- 22 model folders, runner format (`results.json`, `checkpoint.json`, mirror ZIP; count once). **32 variants, 1,536 priced quotes, all complete, all from 11 November 2026.** No pending or no-offer rows. Arithmetic checks on every row.
- 24 variants have the warranty/bill/age questions; 8 do not.
- Models: Pixel 4a, 6a, 7, 7 Pro, 7a, 8, 8 Pro, 8a, 9, 9 Pro, 9 Pro XL, 9 Pro Fold, 9a, 10, 10 Pro, 10 Pro XL, 10 Pro Fold, 10a, 11, 11 Pro, 11 Pro XL, 11 Pro Fold.
- The Fold models have the extra "Outer screen damaged" and "Hinges stuck/loose or broken" answers, like OnePlus Open.
- Most models have only one storage tested, so fixed-versus-percentage can only be decided on 9 models.

### 1.2 Samsung data: three source formats

`SamSung.zip` is organised by series folder (A, C, F, J, M, Note, ON, S, flip, fold). It contains three formats; the importer must read all three and never call an unread file "imported".

**Format A, runner folders (182 folders).** Same layout as Nothing/OnePlus.
- **362 variant records = 358 unique variants** (A35 5G 8/128 and 8/256, F06 5G 4/64 and 4/128 each appear in two folders; the repeats agree on every overlapping case; count once).
- 17,080 rows: **16,785 priced, 266 pending, 29 `no_offer`**. Dates 7–12 November 2026. Arithmetic checks on every priced row.
- 11 variants incomplete (Cashify page failed partway): A05s 4/128, A21s 6/64, A35 5G 8/256, A51 6/128, F06 5G 4/128 and 6/128, M16 5G 6/128, M31 6/128, M42 5G 8/128, M56 5G 8/256, S23 Plus 5G 8/256. 18 folders have a `diagnostic.json`; it can contain the collector's account name; never commit or quote it.
- **`no_offer` is a new status:** Cashify refused to quote. 29 rows, all on old phones (A6, A7 2017, A9 Pro, J7 Duo, J7 Nxt, J7 Pro, Note 8, Note 9, Note 10, Note 10 Plus, On6), for "3 or more minor spots", "Major discoloration", "Back camera not working", "Chipped glass" and "Screen not original". These are measured refusals, not ₹0 and not missing.
- Covers 180 models: A, C, F, J, M, Note, On and S series up to S25 Ultra. **No Fold or Flip, and no S23 FE, S24, S24 FE, S25 Edge, S25 FE or S26 series.**
- S Pen accessory appears on Note and S-Ultra models.

**Format B, "All_Defect_Test_Cases" ZIPs (7 files: S23 FE, S24, S24 FE, S26 Ultra, Z Flip 4, Z Flip 5, Z Flip 7 FE, Z Flip 8, Z Fold 6).** Each has a full-text report plus `verified_observations.json` (a list of quotes per storage in case order, without labels), `baseline_rechecks.json`, and `questionnaire.json` or `case_index.json`. Labels must come from the case index or the text report; never pair quotes with labels by guessing.

**Format C, plain-text reports (about 20 files).** One line per variant per condition, for example `Samsung Galaxy Z Fold5 (12 GB/256 GB): Selling ₹46,720; deduction ₹3,000; Base ₹46,740; …`. Covers Fold, Fold 2–8, Fold 8 Ultra, Flip, Flip 3, Flip 6, S25 5G (partial), S25 Edge, S25 FE, S26, S26 Plus, S25 Ultra (120 of 153), S26 Ultra (153). Some contain "Not applicable", "pending" and no-offer lines, and keep the reference's original case numbers.

Special cases:
- `Cashify_Samsung_Galaxy_Z_Flip_8GB_256GB_All_Test_Cases (1).zip` is byte-identical to the file without `(1)`. Count once.
- **Four older reports dated 26 October 2026** (`Cashify_GalaxyZFold4/7/8/8Ultra_All_Variants_90_Test_Cases`) use a table format (`Case | Selling | Base | …`) and state that warranty, bill and age were not shown. Newer 5–6 November reports exist for the same models. Fit from the newest; use the October set only as a price-drift check and report any questionnaire difference.
- `Samsung_Galaxy_Z_Flip_7_INCOMPLETE_21_Verified_Checkpoint.zip`: 21 quotes, no final control. Use the 21; everything else for Flip 7 is inferred.
- S25 5G and S25 Ultra appear both in runner folders (9–10 Nov) and in text reports (6 Nov). Compare them case by case, report differences, and fit from the newest.
- Some file paths exceed the Windows 260-character limit when extracted (S26 Ultra "All 3 Variants"). Extract to a short path or read inside the ZIP.

### 1.3 Current engine against the data

Replay of runner-format quotes through `priceDevice` on `main` (reference = observed base):

| | Samsung (16,650 priced runner rows) | Pixel (1,536 rows) |
|---|---|---|
| Mean absolute error | **₹920** | **₹3,590** |
| Within ₹20 / ₹100 | 1.8% / 7.6% | 2.3% / 5.7% |
| Errors over ₹1,000 | 4,081 | 1,101 |
| Overpays Cashify / underpays | **13,504** / 2,852 | 791 / 710 |
| Worst | ₹17,433 (S25 Ultra, Bluetooth) | ₹23,318 (Pixel 11 Pro Fold, panel) |

Pixel has no brand calculator: `routeBrandCalculator` sends brand "Google" to the generic Android fallback, which even prices a flawless phone ₹1,864 low on average. Samsung's age answers are off by ₹2,266 on average and the S-Ultra models by ₹4,800–5,200.

### 1.4 What Cashify does (runner data)

Same skeleton as Nothing and OnePlus, confirmed on both brands:
- Warranty No = bill No = age "Above 11 months" on every variant that asks (Samsung 129/129, Pixel 24/24).
- The age page is skipped for exactly: cracked glass, panel cracked/missing, bent panel, touch No, screen not original, warranty No, bill No. Screen-not-original is always at least the above-11 age deduction.
- Wi-Fi, Bluetooth, fingerprint and proximity are percentages of R; cameras, battery, port, buttons, glass and spots/lines/discoloration are fixed rupees per model. Silent button and audio receiver are ₹0 everywhere.
- Pixel fingerprint/Wi-Fi/proximity fractions cluster at 0.20/0.30/0.03 (newest), 0.208/0.312 and 0.21/0.315 (middle) and 0.26/0.39 (oldest), as OnePlus.
- "Cannot make calls" scrap base per model: Samsung ₹200, ₹300, ₹500, ₹800 or ₹1,200; Pixel mostly ₹1,200.

Differences that need code changes:
1. **No-offer.** The model must return manual inspection for a measured no-offer answer on that model, never a price.
2. **Accessories are not always the maximum on Samsung.** "All missing" equals the largest single item on 195 variants, the sum on 12 and neither on 13 (mostly S Pen models). Use the measured "all missing" value. Any other combination of two missing items on an S Pen model is inferred.
3. **Face sensor is ₹0 on 107 Samsung folders** and a percentage on the rest. Fit per model; never borrow a non-zero value.
4. **Cheap-phone caps.** Touch No, cracked glass and heavy spots/lines fit neither fixed nor percentage on many A/M/F/J models, like OnePlus Nord. Use the existing `capped` or `byStorage` forms with the three-storage rule.
5. **Fold/Flip answers** (outer screen, hinge) exist only in formats B and C and in Pixel Fold. Wire them end to end as for OnePlus Open.

### 1.5 Catalog and references

- **Pixel:** catalog has 26 variants; 6 data variants are missing (Pixel 11 12/256 and 12/512, 11 Pro 12/256 and 16/512, 11 Pro Fold 16/512, 11 Pro XL 16/512). Every catalog Pixel has data.
- **Samsung:** catalog has 333 variants. 35 of them store storage without RAM (for example S25 Ultra `"256 GB"` with `ram: "12 GB"`), while the data says `12 GB/256 GB`. The runner model's storage lookup is a plain string match, so **these must be matched on RAM + storage or every S25/S24 Ultra quote silently falls back to inferred values.** After that, list real catalog gaps (A35 5G, F06 5G, Note 8 and others appear absent) and catalog models with no data at all.
- Existing Samsung special cases to reconcile, not silently layer under: `calculateSamsungPrice` (including its charger `!== undefined` semantics), the Samsung entries in `scripts/pricing/fixtures/release-route-evidence-2026-10-02.json` and `-03-expansion.json`, the Samsung paths in `teamWorkbookResearchQuoteService.ts` and `CASHIFY_CALIBRATION`, and the quote page's `hasSPen`.
- Production references and questionnaire profiles were not read. Do the same read-only audit as for OnePlus.

## 2. Owner decisions

1. Add the missing catalog variants (6 Pixel; Samsung list from Step 2) as `referencePriceStatus: "pending"`, as done for OnePlus.
2. For Samsung models whose newest test is incomplete (the 11 runner variants, Flip 7, S25 Ultra 120/153, Fold 8 Ultra 66/153): price untested answers from the nearest model of the same series, labelled inferred (recommended), or send them to inspection until re-tested.
3. Confirm the new rules replace the October Samsung release routes for covered models.

## 3. Work order for Codex

Branch `codex/samsung-pixel-rules-20261113` from current `main`. One commit per step. Do not merge or deploy.

### Step 1: Importer

Extend `import-cashify-runner-data.ts` (or add sibling readers it calls) for formats B and C. One output per brand: `data/pricing-evidence/samsung-2026-11-12/` and `google-2026-11-11/`, gitignored.
- Walk series subfolders recursively. Hash every source; count byte-identical files and duplicate variant folders once and record that.
- Keep statuses distinct: `quoted`, `pending`, `no_offer`, `not_applicable`. A no-offer becomes a measured refusal; pending and not-applicable are never prices.
- Map every Format B/C label to diagnostics; fail on an unknown label. Keep the original case number and source line.
- Record observation date per quote. When the same model/storage/answer appears in several sources, keep all, mark the newest as primary, and report disagreements.
- Expected minimums: Pixel 32 variants / 1,536 priced. Samsung runner 358 unique variants / 16,785 priced / 266 pending / 29 no-offer, plus every priced line in formats B and C (report the counts).

### Step 2: Catalog identity and references (read-only on production)

- Match data to catalog on brand + model + RAM + storage, handling storage-only catalog rows. Make the runner model's storage lookup use the same identity, with a test on S25 Ultra 12 GB/256 GB.
- Read-only audit of production `ReferencePrice` and questionnaire profiles for both brands, as in `ONEPLUS_REFERENCE_AUDIT_2026_11_11.md`.
- Add owner-approved missing variants as `pending`.

### Step 3: Fit

`fit-cashify-runner-calibration.ts --brand Samsung|Google`. Same rules as now: simplest form within ₹10, `affine`/`capped` only with three or more storages, percentage `byStorage` values scale with R. Add:
- `noOffer` per model and answer, from measured refusals.
- Measured "all accessories missing" for S Pen models.
- Fold/Flip `hardware:hinge` and `hardware:outer_screen`.
- Sibling inference for incomplete models only within the same series (S Ultra from S Ultra, Fold from Fold, Flip from Flip, A from A), labelled inferred. Never borrow across brands.

### Step 4: Wiring

- Samsung: `calculateSamsungPrice` tries the runner model first and keeps the existing code byte for byte on null.
- Pixel: add a Google branch to `routeBrandCalculator` that uses the runner model and otherwise falls back to the current generic calculator unchanged.
- No-offer → `MANUAL_INSPECTION_REQUIRED`. Unknown answer → inspection, as now.
- Quote page: S Pen and charger questions follow the measured profile; Fold/Flip/Pixel Fold show hinge and outer-screen questions.
- Bump the engine version once (`+cashify-runner-rules-v4` or the next free number).

### Step 5: Tests and gates

| Check | Gate |
|---|---|
| Replay of every primary priced quote, both brands, through the service | 100% within ₹20 (each brand reported separately, and Samsung by source format) |
| Measured no-offer answers | 29/29 return manual inspection |
| Leave-one-storage-out | ≥ 95% within ₹20 per brand; list every miss over ₹300 |
| Older or duplicate observations of the same case | report the difference; do not fit to them |
| Reference ±10% move | percentage rules scale; fixed stay fixed |
| S25 Ultra 12/256 (storage-only catalog row) | priced as measured, not inferred |
| Nothing, OnePlus, iPhone, every other brand | prices unchanged; full offline suite, both `tsc`, `npm run build` pass |

Add Samsung and Pixel combination cases to `docs/next-quotes/` (about 25 each on one A-series, one S-Ultra with S Pen, one Fold, one Pixel and one Pixel Fold).

### Step 6: Report and PR

`docs/pricing-handbook/SAMSUNG_PIXEL_RELEASE_2026_11.md` with counts per source format, measured versus inferred, gate results, disagreements between sources, the catalog and reference audit, and what was not checked. Draft PR, owner decisions listed. Raw quotes and `diagnostic.json` stay private.
