# OnePlus pricing: verified state and Codex work order (10 November 2026)

Companion to [NOTHING_CODEX_PLAN.md](NOTHING_CODEX_PLAN.md). Read that file first: Phase 0 (get `main` green), the protected rules, the gates and the "must not do" list there apply here unchanged. This file records what the OnePlus data shows and what differs. It was written from a read-only investigation of `main` at `e55e14c` and the owner's `OnePlus.zip`.

**Build one engine for both brands.** The OnePlus and Nothing files come from the same collection tool (runner 1.1.2), have the same layout and show the same Cashify rule structure. Codex builds one importer and one rule model with a calibration file per brand, not two parallel engines. Section 3 says how.

## 1. What was verified

### 1.1 The data

`OnePlus.zip` → 53 model folders, same five files each (inner ZIP is a byte-identical mirror; count once).

- **115 model/storage variants, 5,567 rows: 5,539 priced, 28 pending.** Dated 8–9 November 2026.
- Every priced row passes arithmetic (`base − selling = 20`, `selling − fee = total`, deduction against the same variant's baseline).
- **OnePlus 9RT 5G (8 GB/128 GB) is incomplete:** 18 of 46 cases priced, 28 `pending` with null prices, no final control. The folder has a `diagnostic.json` showing the Cashify page failed to load. Use the 18 priced rows; the 28 are not ₹0 deductions.
- `diagnostic.json` contains a page-text snapshot that includes the collector's logged-in account name. Never commit or quote it.
- The OnePlus 11 folder's top-level `status` says `incomplete`, but both variants are 51/51 with matching controls. Trust the per-variant flags.
- Model names in the data are inconsistently cased (`Oneplus 3T`, `Oneplus Open`, `Oneplus 15R`). Normalise on import; keep the raw string.
- 60 variants are asked 3 initial questions (no warranty, bill or age); 55 are asked 5 and get the age page.
- All 115 variants are offered box and charger.
- OnePlus Open has two extra cases: "Outer screen damaged/line/broken or spot" and "Hinges stuck/loose or broken".
- **Single-fault data only**, like Nothing. No quote has two faults.

### 1.2 Current engine against it

Replaying the 5,537 standard priced rows through `priceDevice` (current `calculateOnePlusPrice`, reference = observed base):

| | Current engine |
|---|---|
| Mean absolute error | **₹1,288** |
| Within ₹20 / within ₹100 | 1.9% / 7.2% |
| Errors over ₹300 / over ₹1,000 | 4,476 / 1,990 |
| Overpays Cashify / underpays | **4,224** / 1,208 rows |
| Worst | ₹27,255 (Open, heavy spots) |

Worst models by mean error: Open ₹6,163, 15 ₹3,333, 13 ₹2,941, 13s ₹2,409, 15R ₹2,228, 12 ₹2,227. Worst groups: panel damage (₹1,995), age (₹1,920), initial "No" answers (₹1,658), display (₹1,647), functional (₹1,370). The engine overpays far more often than it underpays.

### 1.3 What Cashify does for OnePlus

Same skeleton as Nothing, with more variety between models.

**Three generations by fraction of R:**

| | Older, no age page (60 variants: 3 to 10 series, Nord, Nord 2, CE, CE 2) | 11 / 11R / 12 / 12R, Nord 3–5, CE 3–5, N6 family | 13 / 13R / 13s / 15 / 15R, Nord 6, CE 6, Open |
|---|---:|---:|---:|
| Fingerprint | 0.264 | 0.210 | 0.200 |
| Wi-Fi, Bluetooth (each) | 0.396 | 0.315 | 0.300 |
| Proximity | 0.030 | 0.030 | 0.030 |
| Face sensor | same as fingerprint (₹0 on OnePlus 3, 3T, 5) | 0.210 | 0.200 |

The exact split of the Nord/CE/N6 models between the two newer columns must come from the fit, not from this table.

**Fixed rupees per model, on all 46 multi-storage folders:** back camera, charging port, chipped glass, heavy and light screen scratches, 3+ minor spots, faded edges, major discoloration. Fixed on nearly all: front camera, battery, camera glass, buttons, speaker, microphone, vibrator, minor spots, minor discoloration. **Silent button and audio receiver are ₹0 everywhere.**

**Forced age state.** On the 55 variants with an age page, Cashify skips it (forces above-11) for exactly the same answers as Nothing: cracked glass, panel cracked/missing, bent panel, touch No, screen not original, warranty No, bill No. Warranty No = bill No = above 11 months on all 55. The decomposition holds per model:

- screen not original = age-above-11 + a fixed amount (₹2,250 to ₹11,000; ₹25,000 on Open)
- cracked glass = screen-not-original + a fixed amount (₹430 to ₹2,090)
- touch No = screen-not-original + a fixed amount, usually equal to the screen-not-original fixed amount
- panel cracked/missing/bent = age-above-11 + an amount that is fixed on the numbered flagships and grows with R on Nord models

**Differences from Nothing that the model must handle:**

1. **Age is not a clean fraction.** It is constant as a fraction within some models and drifts in others; one line per generation leaves errors of ₹300–1,100. Fit age per model from its own storages (fraction, or `a + b × R` where two or more storages show it), with the per-storage value kept as measured.
2. **Body scratches and dents switch form by generation.** Older models: scratches are fixed rupees, dents are a fraction. Newer flagships: the reverse tendency. Decide per model and answer from that model's storages.
3. **Display faults are capped on cheap phones.** Heavy spots, visible lines, touch No and cracked glass are a fixed amount on higher storages but smaller on the cheapest storage of the same model (for example OnePlus 8: ₹5,920 at R ₹9,600, ₹5,950 at ₹10,380 and ₹10,600; OnePlus 3: every display fault gives ₹1,020 on R ₹1,620). 23–28 folders fit neither fixed nor fraction for these answers. The form looks like `min(fixed, k × R)`. Fit `k` from the data; if it does not fit, keep per-storage measured values and label other storages inferred. Do not invent a cap.
4. **Cannot make calls** gives a base of ₹300, ₹500, ₹800 or ₹1,200 depending on the model, and Nord 4 changes between storages (₹800 at R ₹18,260, ₹1,200 at ₹20,170). Store per variant.
5. **Accessories:** box and charger on every variant; "both missing" equals the larger of the two on all 114 complete variants (for example ₹500 / ₹400 / ₹500). Never add them.
6. **Open** needs its own profile, including the two fold-only answers. One variant, so everything at another storage would be inferred.

### 1.4 Gaps around the data

- **Catalog (`lib/seed_devices.ts`, 106 OnePlus variants):** 10 data variants are missing: 13s 16/512, N6 4/128 and 6/128, N6 Lite 4/64, N6x 4/64, Nord CE 6 5G 8/128 and 8/256, Nord CE 6 Lite 5G 6/128, 8/128 and 8/256. One catalog variant has no data and no Cashify link: 9RT 5G 12/256.
- **References:** committed snapshot against the 8–9 November bases: median ₹240 lower, range −₹290 to +₹1,880, equal on 1 of 104. Production `ReferencePrice` rows were not read.
- **Existing OnePlus special cases** that the new model must be reconciled with, not silently layered under: `lib/pricing/onePlusDisplayEvidenceCandidate.ts` and its `RC_ALLOWLIST` entries in `releaseCandidate.ts`; the bill overrides for Nord 5, 15 and 15R and the `CASHIFY_CALIBRATION.onePlus` constants in `calculateOnePlusPrice`; the box-included accessory routes in `pricingService.ts`; the OnePlus route-evidence fixtures under `scripts/pricing/fixtures/`.

## 2. Owner decisions for OnePlus

1. **Catalog:** add the 10 missing variants (needs matching reference rows).
2. **9RT 5G 8/128:** price its 28 untested answers from the nearest OnePlus model, labelled inferred (recommended), or ask the team to re-run that one variant first. And 9RT 12/256, which has no data at all.
3. **Multi-fault quotes:** same choice as Nothing decision 3; one answer should cover both brands.
4. **Older release-candidate routes for OnePlus:** confirm the new measured rules replace the October display candidates and accessory routes for the models this data covers.

## 3. Work order for Codex

Branch `codex/android-cashify-rules-20261110` from `main` after Phase 0 of the Nothing plan has merged. Do Nothing and OnePlus on this one branch, in this order, one commit per step.

### Step 1 — One importer for both brands

`scripts/pricing-evidence/import-cashify-runner-data.ts <folder> --brand <name> --out <dir>` replaces the Nothing-only importer named in the Nothing plan. Same hard failures. Additional rules found here:

- `pending` rows are imported as status `pending` with no price and are excluded from fitting; a variant with pending rows is flagged incomplete.
- Ignore `diagnostic.json` content except to record that it exists; never copy its text.
- Trust per-variant `complete` / `final_control_matches` / `healthy_controls_match`, not the folder-level `status`.
- Unknown case labels (the two Open answers) must map to explicit diagnostics or fail; never drop them silently.
- Expected counts: Nothing 34 variants / 1,671 priced. OnePlus 115 variants / 5,539 priced / 28 pending. Output folders `data/pricing-evidence/nothing-2026-11-08/` and `data/pricing-evidence/oneplus-2026-11-09/`, both gitignored.

### Step 2 — One rule model, one calibration per brand

`lib/pricing/cashifyRunnerModel/` (`model.ts`, `index.ts`, `calibration.nothing.json`, `calibration.oneplus.json`). This replaces the `nothingCashifyModel` folder named in the Nothing plan. Same rule skeleton as Nothing Phase 3, extended so each (model, answer) value is one of:

- `fixed` rupees
- `pct` of R
- `affine` (`a + b × R`), only where two or more storages of that model support it
- `capped` (`min(fixed, k × R)`), only where the data shows it
- `byStorage` measured values, when none of the above reproduces the model's own quotes within ₹10

The fitter (`fit-cashify-runner-calibration.ts --brand`) picks the simplest form that reproduces all of the model's storages within ₹10 and records the choice and the residual. Forced-age decomposition, accessories-as-maximum and per-variant calls scrap are stored as described above. No hand-typed values.

### Step 3 — Wire Nothing, validate, then wire OnePlus

1. Nothing first (Nothing plan Phases 4–6). It is the simpler brand and proves the engine.
2. OnePlus: `calculateOnePlusPrice` tries the model first and falls back to the existing code unchanged on null. Apply the same age pass-through and `warrantyVoidedByDiagnostics` exemption.
3. Reconcile the four existing OnePlus special cases in 1.4. For every model this data covers, state in the report which path now prices it and show that no quote is priced twice or by a stale route. Do not delete the older code or fixtures; gate them off for covered models and keep their tests passing.
4. Open: wire the hinge and outer-screen answers end to end (UI id → diagnostics → model).
5. Version suffix: `+cashify-runner-rules-v1` (one bump covering both brands).

### Step 4 — Gates for OnePlus

Same table as Nothing Phase 6, with these numbers:

| Check | Gate |
|---|---|
| In-sample replay of 5,539 priced rows through the service route | ≥ 99% within ₹20; MAE ≤ ₹10; 0 errors over ₹300 |
| Leave-one-storage-out on the 46 multi-storage folders | ≥ 95% within ₹20; report every miss by answer (display-cap and age misses are expected and must be listed, not hidden) |
| Leave-one-model-out within its generation | report only |
| 9RT 8/128 | its 18 priced rows within ₹20; its 28 pending answers reported as inferred with their source model |
| Catalog OnePlus variants × every single answer through the service | priced or explained |
| Nothing, iPhone and every other brand | unchanged and passing |

### Step 5 — Combination quotes and report

Add OnePlus to the Phase 7 collection list: about 25 combination cases each on OnePlus 8 8/128 (old, no age), 12R 8/128 and 13 12/256. Include a cheap-phone display case (OnePlus 6 6/64 with cracked glass plus spots) to test the cap. Score against frozen rules before refitting.

Report file `docs/pricing-handbook/ANDROID_RUNNER_RELEASE_2026_11.md` covering both brands, with separate tables per brand. One PR. No merge or deploy.
