# Xiaomi/Redmi, Honor, Asus, Lenovo and gap-fill: verified state and Codex work order (16 November 2026)

Written from a read-only investigation of `main` at `b027422` (Samsung/Pixel release, PR 33) and the owner's archive `WhatsApp Unknown 2026-11-15 at 4.54.39 PM.zip`. Read `AGENTS.md`, `docs/HANDOFF_CODEX.md`, `STRICT_RULES.md`, `SAMSUNG_PIXEL_CODEX_PLAN.md` and `RUNNER_REVIEW_2026_11_12.md` first; every rule and gate there applies.

**Extend the shared engine again.** Add calibration files for Xiaomi, Honor, Asus and Lenovo to `lib/pricing/cashifyRunnerModel/`, refit OnePlus and Google with the gap-fill data, and reuse the existing importers. Prices of every already-released variant must not change, except the OnePlus 9RT (section 1.3).

## 1. What was verified

### 1.1 The archive

It contains six inner ZIPs: `Xiaomi Redmi.zip`, `Honor.zip`, `Asus.zip`, `Lenovo.zip`, `One plus Missed.zip`, `pixel missed.zip`. **There is no Realme and no POCO data in it.**

| Brand | Runner folders | Variants | Priced | Pending | No-offer | Dates |
|---|---:|---:|---:|---:|---:|---|
| Xiaomi / Redmi / Mi | 84 | 188 | 8,776 | 0 | 0 | 12–15 Nov |
| Honor | 16 | 26 | 1,136 | 74 | 1 | 11–12 Nov |
| Asus | 3 | 6 | 275 | 0 | 1 | 11 Nov |
| Lenovo | 5 | 6 | 264 | 0 | 12 | 11–12 Nov |
| OnePlus (9RT 5G) | 1 | 2 | 92 | 0 | 0 | 9 Nov |
| Google (Pixel 11 Pro Fold, 11 Pro XL) | 2 | 2 | 98 | 0 | 0 | 9 Nov |

Arithmetic checks on every priced row. Inner mirror ZIPs are byte-identical. Honor 20i 4/128, 8C 4/32 and 9 Lite 4/64 are incomplete. 40 folders have a `diagnostic.json` (35 Xiaomi, 4 Honor, 1 Pixel): never commit or quote them.

### 1.2 Xiaomi also has about 50 older text-report archives

`Xiaomi Redmi.zip` holds, beside the 84 runner folders, about 50 loose ZIPs of text reports (the Samsung "Format C" style; a few with JSON side files).

- **They are dated 29 October to 5 November**, two to three weeks older than the runner folders.
- **They cover about 40 newer models the runner folders do not**: Redmi 12, 12C, 12 5G, 13 5G, 13C, 13C 5G, 14C 5G, 15 5G, 15C 5G, 17 5G, A1, A2, A3x, A4 5G, A5, A7, A7 Pro; Redmi Note 13 5G, 13 Pro, 13 Pro Plus, 14 5G, 14 Pro, 14 Pro Plus, 15 5G, 15 Pro, 15 Pro Plus, 15 SE, 17 Pro, 17 Pro Max; Redmi Turbo 5; Xiaomi 14, 14 CIVI, 14 Ultra, 15, 15 Ultra, 17 Ultra, 17T.
- Four are byte-identical duplicates (`(1)` copies). Several models have both a `PARTIAL` report and a later complete one; use the complete one and keep the partial only as a cross-check.
- Three archives (Redmi A2, Note 13 Pro, Note 13 Pro Plus "All_Defect") contain no priced text lines in the main file; read their side files or report them as unreadable. One archive (`Xiaomi 15 Ultra`) has a nested `Partial/` folder with five more ZIPs for other models (Redmi A3, Note 13 Pro, Note 13 Pro Plus).
- Because these are older, each deduction is taken against that report's own baseline of that day. Fixed-rupee repairs carry over; percentages are fractions of that day's base. Do not use their baseline as today's reference.

### 1.3 Gap-fill results (useful as independent validation)

- **OnePlus 9RT 5G:** now fully tested at 8/128 and 12/256 (92 priced). The live engine, which was filling 9RT gaps from the 9R, scores 93.5% within ₹20 on these, with 6 misses and a worst of ₹600. Refit OnePlus so the 9RT uses its own values; this is the only released model whose prices may change. Report before and after.
- **Pixel 11 Pro Fold 16/512 and 11 Pro XL:** 98 quotes, all already within ₹10 of the live engine. No change expected; record it as a confirmation.

### 1.4 Current engine against the new brands

Replay through `priceDevice` on `main` (reference = observed base):

| | Xiaomi | Honor | Asus | Lenovo |
|---|---|---|---|---|
| Rows | 8,776 | 1,136 | 275 | 264 |
| Mean absolute error | ₹599 | ₹810 | ₹1,530 | ₹653 |
| Within ₹100 | 8.2% | 6.1% | 2.5% | 6.8% |
| Overpays Cashify | 7,821 | 1,061 | 268 | 258 |

Xiaomi's worst models: Xiaomi 17 (₹3,525 average), 13 Pro, Redmi Note 17 5G, Mi 10, 12 Pro, Mi 11 Ultra. Honor, Asus and Lenovo have no brand calculator and use the generic Android fallback.

### 1.5 Structure

Xiaomi follows the same Cashify skeleton as the released brands: warranty No = bill No = above-11 on 26/26 aged variants; the same answers skip the age page; "all accessories missing" equals the largest single item on 187 variants; Wi-Fi and fingerprint are percentages; display and camera repairs are fixed. 162 of 188 runner variants have no age questions. Scrap bases are ₹200, ₹300, ₹500, ₹800 or ₹1,200 per model. Face sensor is ₹0 on most models.

### 1.6 Catalog

- **Xiaomi brand:** 281 catalog variants (232 Redmi, 49 Xiaomi/Mi). 3 runner variants are missing (Black Shark 2 6/128, Redmi Note 10s 6/128, Redmi Note 11 6/64). After the text reports are imported, list what is still without data.
- **POCO: 113 catalog variants, no data at all.** Leave POCO on its current pricing; do not borrow Redmi values for it.
- **Honor:** 27 catalog variants, all in the data (8C partly). **Asus** 6/6. **Lenovo** 6/6.
- One catalog row has no brand (`undefined`). Report it; do not guess.
- Existing Xiaomi special cases to reconcile, not silently layer under: `calculateXiaomiPrice`, the disabled `inrDeductionTables.ts`/`inrDeductions.ts`, `xiaomiEvidenceCandidate.ts`, `xiaomiNoteEvidenceCandidate.ts`, `xiaomiWorkbookEvidenceCandidate.ts`, `xiaomiApplicationCandidate.ts`, the `xiaomi-workbook` entries in `releaseCandidate.ts`, and the Xiaomi rows in the release-route fixtures.

## 2. Owner decisions (already given on 16 November unless noted)

The owner asked for this work to be planned, decided and released. These are decided:

1. Add missing catalog variants as reference-pending, as for earlier brands.
2. Fill incomplete or untested answers from the nearest model of the same brand and series, labelled inferred.
3. The new rules replace the October Xiaomi special cases for covered models. Keep the old code and its tests; gate it off for covered models.
4. Xiaomi models that exist only in the older text reports are priced from them, labelled with their observation date.

Still for the owner, not for Codex: POCO, Realme and the other untested brands need their own Cashify test runs.

## 3. Work order for Codex

Branch `codex/xiaomi-others-rules-20261116` from current `main`. One commit per step. Draft PR at the end; do not merge or deploy.

### Step 1: Import

Use `import-cashify-runner-data.ts` and `import-samsung-pixel-archives.ts`; generalise the text-report reader to Xiaomi (rename if needed). One private, gitignored output per brand under `data/pricing-evidence/`.
- Open the outer archive, then each inner ZIP, then nested ZIPs (including `Partial/`). Hash everything; count byte-identical files once.
- Statuses stay distinct: `quoted`, `pending`, `no_offer`, `not_applicable`, and "not yet verified" lines in partial reports are `pending`.
- Per quote: observation date, source, original case number. When a model/storage/answer appears in several sources, the newest complete source is primary; report disagreements.
- Expected runner minimums are the table in 1.1. Report text-report counts per archive, and name any archive that yields no quotes.

### Step 2: Catalog and references (read-only on production)

Same audit as before for all four brands: production references, questionnaire profiles, catalog gaps. Add missing variants as `pending`.

### Step 3: Fit

`fit-cashify-runner-calibration.ts --brand Xiaomi|Honor|Asus|Lenovo|OnePlus|Google`.
- Same rules as now (simplest form within ₹10; `affine`/`capped` need three storages; percentage `byStorage` values scale with R; measured no-offers; same-series sibling inference only).
- Text-report-only Xiaomi models: fit deductions against each report's own baseline; mark every rule with the observation date.
- OnePlus: only the 9RT profile may change. Google: no price may change.

### Step 4: Wiring

- Xiaomi: `calculateXiaomiPrice` tries the runner model first; existing code unchanged on null. POCO must keep returning null from the runner model.
- Honor, Asus, Lenovo: brand branches in `routeBrandCalculator` that use the runner model and otherwise fall through to the generic calculator unchanged.
- Quote page follows each measured profile (age, charger, face sensor).
- One engine version bump.

### Step 5: Gates

| Check | Gate |
|---|---|
| Replay of every primary priced quote through the service, per brand | 100% within ₹20 |
| Measured no-offers (Honor 1, Asus 1, Lenovo 12) | all return manual inspection |
| Leave-one-storage-out, per brand | ≥ 95% within ₹20; if a brand fails, report which catalog variants are actually inferred and their expected error, as PR 33 did |
| OnePlus 9RT | 92/92 within ₹20 after refit |
| Pixel gap-fill | 98/98 within ₹20, calibration unchanged |
| Protected prices | Nothing, Samsung, Pixel, iPhone, POCO and all OnePlus except 9RT unchanged |
| Offline suite, both `tsc`, `npm run build`, browser QA of one phone per new brand | all pass |

### Step 6: Report and PR

`docs/pricing-handbook/XIAOMI_OTHERS_RELEASE_2026_11.md`: counts per source, measured versus inferred, text-report-only models with dates, gate results, 9RT before/after, catalog and reference audit, and a list of every catalog brand and variant count still on old pricing. Add combination cases to `docs/next-quotes/`. Draft PR. Raw quotes and `diagnostic.json` stay private.
