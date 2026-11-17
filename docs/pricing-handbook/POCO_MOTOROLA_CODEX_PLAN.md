# POCO, Motorola and Nokia 8.1: verified state and Codex work order (17 November 2026)

Written from a read-only investigation of `main` at `415a9a6` and three new owner archives in the Downloads folder: `poco final.zip`, `Motorola.zip` and `used-nokia-8-1.zip`. Read `AGENTS.md`, `docs/HANDOFF_CODEX.md`, `STRICT_RULES.md`, `XIAOMI_OTHERS_CODEX_PLAN.md` and `RUNNER_REVIEW_2026_11_12.md` first; every rule and gate there still applies.

**Extend the shared engine once more.** Add `calibration.poco.json` and `calibration.motorola.json` to `lib/pricing/cashifyRunnerModel/` and refit only the Nokia 8.1 profile. Reuse the existing importer, fitter, model and validator. Every other released price must stay identical.

## 1. What was verified

### 1.1 The archives

All three use the runner format (`results.json`, `checkpoint.json`, a mirror `Cashify_Test_Results.zip`; count once). Arithmetic checks on every priced row.

| Archive | Folders | Variants | Priced | Pending | No-offer | Dates |
|---|---:|---:|---:|---:|---:|---|
| `poco final.zip` | 48 | 114 | 5,569 | 0 | 0 | 15–16 Nov |
| `Motorola.zip` (series subfolders: E, Edge, G, One, Razr, Z) | 91 | 131 unique | 6,420 | 44 | 8 | 15–16 Nov |
| `used-nokia-8-1.zip` | 1 | 2 | 92 | 0 | 0 | 16 Nov |

- **POCO:** 48 models from F1, X2 and M2 to F7, X8 Pro and X8 Pro Max. 65 variants have the warranty/bill/age questions, 49 do not. 23 `diagnostic.json` files and one `.running.lock`: ignore, never commit.
- **Motorola:** 90 models across E, Edge, G, One, Razr and Z series. 68 variants have the age questions, 63 do not. Moto Edge 50 Fusion 8/128 and 12/256 appear in two folders; the repeats agree on all 46 cases each, so count them once. Moto One 4/64 is incomplete (44 pending). No-offers: 3 or more minor spots (3), major discoloration (2), screen not original (2), Razr outer screen (1). 28 `diagnostic.json` files: ignore.
- **Razr flips** (Razr, Razr 5G, 40 Ultra, 50, 50 Ultra, 60, 60 Ultra) have the "Outer screen damaged" and "Hinges stuck/loose or broken" answers, like Samsung Flip and OnePlus Open.
- **Nokia 8.1:** the complete re-run of the model that was incomplete on 11 November (4/64 and 6/128).

### 1.2 Current engine against the data

Replay through `priceDevice` on `main` (reference = observed base):

| | POCO | Motorola | Nokia 8.1 |
|---|---|---|---|
| Rows | 5,569 | 6,328 | 92 |
| Mean absolute error | ₹696 | ₹1,062 | ₹211 |
| Within ₹100 | 7.4% | 5.9% | 52.2% |
| Overpays / underpays Cashify | 4,822 / 668 | 4,982 / 1,259 | 2 / 48 |
| Worst | ₹7,938 (X8 Pro Max, Bluetooth) | ₹15,380 (Razr 50 Ultra, heavy spots) | ₹1,060 (8.1 6/128, faded edges) |

- POCO is priced today by the old Xiaomi calculator; the runner deliberately returns null for POCO (a PR 34 requirement that this work replaces).
- Motorola has no brand calculator and uses the generic Android fallback. The Razr flips are the worst (₹3,100–4,450 average error).
- Nokia 8.1 is already on the runner, but its untested answers were inferred from siblings and now **underpay** (display faults ₹500 below Cashify on average). Its own measurements fix that.

### 1.3 Structure (same as the released brands)

- Warranty No = bill No = age "Above 11 months" on every aged variant (POCO 65/65, Motorola 68/68).
- The age page is skipped for exactly the same answers as before (cracked glass, panel cracked/missing, bent, touch No, screen not original, warranty No, bill No).
- "All accessories missing" equals the largest single item (POCO 114/114, Motorola 130/130).
- Wi-Fi and fingerprint are percentages of R; cameras and display repairs are fixed. Silent button and audio receiver are ₹0 everywhere. Face sensor is non-zero on 16 POCO and 69 Motorola variants only.
- Scrap bases: POCO ₹500, ₹800 or ₹1,200; Motorola ₹200 to ₹1,200.

### 1.4 Catalog

- **POCO:** 113 catalog variants, all tested. 1 tested variant is missing: POCO X8 Pro Max 5G 12/512.
- **Motorola:** only **74 catalog variants for 131 tested**. 58 tested variants are missing, mostly newer Edge 40–70, G04–G96 and extra storages; full list from Step 2. Moto Razr 40 is in the catalog but was not tested.
- **Nokia:** after the 8.1 refit, only Nokia 5.1 remains untested.

### 1.5 Work in flight

PR 37 (`claude/final-audit`, open) changes `app/quote/page.tsx` and `server/modules/quote/service.ts`, which this work also touches. Start from `main` after PR 37 is merged, or rebase onto it before opening the PR. Do not undo its changes.

## 2. Owner decisions (given 17 November)

Same as for the earlier brands:
1. Add missing catalog variants as reference-pending, with their exact Cashify links from the source `checkpoint.json` (PR 36 showed that a missing link stops the refresh from finding the page).
2. Fill incomplete answers (Moto One 4/64) and untested storages from the nearest model of the same brand and series, labelled inferred.
3. POCO moves from the old Xiaomi calculator to its own measured rules. Redmi and Xiaomi prices must not change. Never borrow Redmi values for POCO, or the reverse.
4. After merge and deploy, run a reference refresh for only the newly added variants (as was done for PR 34) so they get prices the same day.

## 3. Work order for Codex

Branch `codex/poco-motorola-rules-20261117` from current `main` (after PR 37, see 1.5). One commit per step. Draft PR at the end; do not merge or deploy.

### Step 1: Import
`import-cashify-runner-data.ts` for each archive (Motorola walks series subfolders). One private, gitignored output per brand. Expected: POCO 114 variants / 5,569 priced; Motorola 131 unique variants / 6,420 priced / 44 pending / 8 no-offer; Nokia 8.1 2 variants / 92 priced. Hash everything; count the duplicate Edge 50 Fusion folder once.

### Step 2: Catalog and references (read-only on production)
Read-only audit of production references and questionnaire profiles for POCO, Motorola and Nokia 8.1. Add missing variants as `pending` **with `cashifyLink`** taken from each variant's source URL in `checkpoint.json`. Add a test that every new pending row has a link.

### Step 3: Fit
`fit-cashify-runner-calibration.ts --brand POCO|Motorola|Nokia`. Same rules (simplest form within ₹10; `affine`/`capped` need three storages; percentage `byStorage` values scale with R; measured no-offers; same-series inference only). For Nokia only the 8.1 profile may change. Razr flips get `hardware:hinge` and `hardware:outer_screen`, as for Samsung Flip.

### Step 4: Wiring
- POCO: route the brand to the runner before `calculateXiaomiPrice`; on null keep the existing code byte for byte. Remove the "POCO returns null" expectation only for models that now have a profile.
- Motorola: a brand branch in `routeBrandCalculator` using the runner, falling through to the generic calculator unchanged.
- The quote page follows each measured profile (age, charger, face sensor, Razr hinge/outer screen).
- One engine version bump.

### Step 5: Gates

| Check | Gate |
|---|---|
| Replay of every primary priced quote through the service, per brand | 100% within ₹20 |
| Measured no-offers (Motorola 8) | all return manual inspection |
| Leave-one-storage-out, per brand | ≥ 95% within ₹20; if a brand fails, list the catalog variants actually estimated and their expected error |
| Nokia 8.1 | 92/92 within ₹20 after refit |
| Protected prices | Apple, Samsung, Google, Nothing, OnePlus, Xiaomi/Redmi, Honor, Asus, Lenovo and Nokia except 8.1 identical to `main` |
| New pending catalog rows | every one has a `cashifyLink` |
| Offline suite, both `tsc`, `npm run build`, browser QA of one POCO, one Motorola and one Razr | all pass |

### Step 6: Report and PR
`docs/pricing-handbook/POCO_MOTOROLA_RELEASE_2026_11.md`: counts, measured versus inferred, gate results, Nokia 8.1 before and after, catalog and reference audit, the list of variants needing the post-merge refresh, and the brands still on old pricing. Add combination cases to `docs/next-quotes/`. Draft PR. Raw quotes, `diagnostic.json` and `.running.lock` stay private.

## 4. After this round

Still without test data: Vivo (324 catalog variants), Realme (262), Oppo (236), iQOO (95), Tecno (68), Infinix (63), Huawei (5), LG (4), plus Redmi 3S, 3S Prime, 4A, Nokia 5.1 and Moto Razr 40.
