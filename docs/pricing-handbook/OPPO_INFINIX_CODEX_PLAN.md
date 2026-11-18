# Oppo and Infinix: verified state and Codex work order (18 November 2026)

Written from a read-only investigation of `main` at `a9c1c8e` (PR 38 merged on top of the POCO/Motorola release) and two owner archives in the Downloads folder: `Oppo Final.zip` and `Infinix.zip`. Read `AGENTS.md`, `docs/HANDOFF_CODEX.md`, `STRICT_RULES.md`, `POCO_MOTOROLA_CODEX_PLAN.md` and `RUNNER_REVIEW_2026_11_12.md` first; every rule and gate there still applies.

**Extend the shared engine once more.** Add `calibration.oppo.json` and `calibration.infinix.json` to `lib/pricing/cashifyRunnerModel/`. Reuse the existing importer, fitter, model and validator. Every other released price must stay identical.

## 1. What was verified

### 1.1 The archives

Both use the runner format. Arithmetic checks on every priced row.

| Archive | Folders | Unique variants | Priced | Pending | No-offer | Dates |
|---|---:|---:|---:|---:|---:|---|
| `Oppo Final.zip` (series subfolders: A, F, Find, K, Reno, R and others) | 150 | 239 | 11,876 | 132 | 4 | 12–16 Nov |
| `Infinix.zip` | 64 | 83 | 3,954 | 0 | 1 | 17–18 Nov |

Source quirks the importer must handle, all checked:
- **Duplicate Oppo folders.** 8 variants appear in two or three folders (F27 Pro Plus 8/128, F29 Pro 8/128, F33 6/128, F33 Pro 8/128 and 8/256, R11 4/64, Reno12 Pro 12/256 and 12/512). Where both copies are priced they agree to the rupee. Where one copy is partial, use the complete one.
- **Incomplete Oppo runs with no complete copy:** F31 5G 8/128 (32 of 51 priced), F31 Pro 5G 8/128 (49/51), F31 Pro Plus 5G 8/256 (28/51), F33 5G 6/128 (27/51 in the partial copy) and R11 4/64 (33/46 in the partial copy). Pending rows are not prices.
- **OPPO F19 6/128 folder is empty** (no quotes). Treat it as untested.
- **"(2)" copies are older runs; use the main file.** `Find N3 Flip 12/256/results (2).json` is an earlier partial run (11 priced, 42 pending); the main `results.json` has all 53 priced. Infinix `Note 40X` and `Note 50X` `checkpoint (2).json` are earlier runs of the same complete test (17 Nov vs 18 Nov); the results are identical. Infinix `Smart 5 2/32` has identical `(2)` copies.
- **Three mirror ZIPs differ from their folder** (Oppo F19 6/128, Infinix Note 40X, Note 50X). In each case only `checkpoint.json` differs and `results.json` is identical. Use the folder files and record the mismatch.
- 40 Oppo and 8 Infinix `diagnostic.json` files and 4 `.running.lock` files: ignore, never commit.
- **Fold/flip answers:** Oppo Find N3 Flip and Infinix Zero Flip have "Outer screen damaged" and "Hinges stuck/loose or broken", as for Razr and Galaxy Flip.
- Model names use "OPPO" in the data and "OPPO" or "Oppo" in the catalog (for example `Oppo A76`). Normalise case when matching; keep the raw string.

### 1.2 Current engine against the data

Replay through `priceDevice` on `main` (reference = observed base):

| | Oppo | Infinix |
|---|---|---|
| Rows | 11,502 | 3,954 |
| Mean absolute error | ₹930 | ₹690 |
| Within ₹100 | 8.4% | 5.3% |
| Overpays / underpays Cashify | 8,989 / 2,312 | 3,685 / 251 |
| Worst | ₹19,339 (Find X9 Ultra, Bluetooth) | ₹7,351 (Zero Flip, cracked glass) |

Oppo's worst models: Find X9 Ultra (₹5,281 average), Find X9 Pro, Find X8 Pro, Reno15 Pro, Find N3 Flip, Find X9, Reno16. Oppo is priced today by `calculateOppoPrice`, which has bespoke bill penalties for Find X9s, X9 Ultra, X9 Pro, Reno16 and Reno16c. Infinix has no brand calculator and uses the generic Android fallback.

### 1.3 Structure (same as the released brands)

- Warranty No = bill No = age "Above 11 months" on every aged variant (Oppo 110/110, Infinix 27/27).
- The age page is skipped for exactly the same answers as before.
- "All accessories missing" equals the largest single item (Oppo 237/237, Infinix 83/83).
- Silent button and audio receiver are ₹0. Face sensor is non-zero on 46 Oppo and 2 Infinix variants only.
- Scrap bases: Oppo ₹200 to ₹1,200; Infinix ₹300, ₹500 or ₹800.

### 1.4 Catalog

- **Oppo:** 236 catalog variants. 10 tested variants are missing: Find X8 5G 12/256 and 16/512, A53 6/128, A6c 4/64 and 4/128, Reno16 5G 8/256 and 12/256, Reno16c 5G 8/128, 8/256 and 12/256. Catalog models with no complete data: Oppo A76, F31 5G, F31 Pro 5G, F31 Pro Plus 5G, Reno15 Pro Mini 5G.
- **Infinix:** 63 catalog variants, all tested. 20 tested variants are missing (GT 20 Pro 8/256, Hot 40i 8/256, Hot 50 5G 4/128 and 8/128, Hot 60 5G Plus 6/128, Hot 60i 5G 4/128, Note 40 5G 8/256, Note 40 Pro 5G 8/256, Note 40 Pro Plus 5G 12/256, Note 40X 5G 8/256 and 12/256, Note 50X 5G 6/128 and 8/128, Smart 10 4/64, Smart 8 4/64, Smart 8 HD 3/64, Smart 9 HD 3/64, Zero 40 5G 12/256 and 12/512, Zero Flip 5G 8/512).

## 2. Owner decisions (given 18 November)

Same as the previous rounds:
1. Add missing catalog variants as reference-pending, each with its exact Cashify link from the source `checkpoint.json`.
2. Fill incomplete answers (the F31 family, F33 6/128, R11 4/64) from the nearest Oppo model of the same series, labelled inferred.
3. The new rules replace `calculateOppoPrice`'s bespoke Find X9 / Reno16 rules for covered models. Keep the old code and its tests; gate it off for covered models.
4. After merge and deploy, refresh only the newly added variants the same day.

## 3. Work order for Codex

Branch `codex/oppo-infinix-rules-20261118` from current `main`. One commit per step. Draft PR at the end; do not merge or deploy.

### Step 1: Import
`import-cashify-runner-data.ts` for both archives (Oppo walks series subfolders). Ignore `(2)` copies except to record that they are older runs; prefer the complete copy when a variant appears in several folders; record the empty F19 6/128 folder and the three mirror mismatches. Expected: Oppo 239 unique variants / 11,876 priced / 132 pending / 4 no-offer; Infinix 83 variants / 3,954 priced / 1 no-offer. Report any difference.

### Step 2: Catalog and references (read-only on production)
Read-only audit of production references and questionnaire profiles for Oppo and Infinix. Add the 30 missing variants as `pending` with `cashifyLink`. Match brand case-insensitively (`Oppo` / `OPPO`).

### Step 3: Fit
`fit-cashify-runner-calibration.ts --brand Oppo|Infinix`. Same rules as before (simplest form within ₹10; `affine`/`capped` need three storages; percentage `byStorage` values scale with R; measured no-offers; same-series inference only). Find N3 Flip and Zero Flip get `hardware:hinge` and `hardware:outer_screen`.

### Step 4: Wiring
- Oppo: `calculateOppoPrice` tries the runner first; on null the existing code runs byte for byte.
- Infinix: a brand branch in `routeBrandCalculator` that uses the runner and falls through to the generic calculator unchanged.
- The quote page follows each measured profile (age, charger, face sensor, flip answers).
- One engine version bump.

### Step 5: Gates

| Check | Gate |
|---|---|
| Replay of every primary priced quote through the service, per brand | 100% within ₹20 |
| Measured no-offers (Oppo 4, Infinix 1) | all return manual inspection |
| Leave-one-storage-out, per brand | ≥ 95% within ₹20; if a brand fails, list the catalog variants actually estimated and their expected error |
| Protected prices | every other brand identical to `main` |
| New pending catalog rows | every one has a `cashifyLink` |
| Offline suite, both `tsc`, `npm run build`, browser QA of one Oppo, one Infinix and the Find N3 Flip | all pass |

### Step 6: Report and PR
`docs/pricing-handbook/OPPO_INFINIX_RELEASE_2026_11.md`: counts, source quirks and how each was handled, measured versus inferred, gate results, catalog and reference audit, the list of variants for the post-merge refresh, and the brands still on old pricing. Add combination cases to `docs/next-quotes/`. Draft PR. Raw quotes, `diagnostic.json`, `.running.lock` and `(2)` files stay private.

## 4. After this round

Still without test data: Vivo (324 catalog variants), Realme (262), iQOO (95), Tecno (68), Huawei (5), LG (4), plus Redmi 3S, 3S Prime, 4A, Nokia 5.1, Moto Razr 40, Oppo A76, Reno15 Pro Mini and F19 6/128.
