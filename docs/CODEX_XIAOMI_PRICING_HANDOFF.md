# Codex handoff: Xiaomi / Redmi fixed-₹ (repair-cost) pricing

| | |
|---|---|
| Branch | `fix/xiaomi-inr-deductions` (local only, **not pushed**) |
| Worktree | `C:\Users\shoae\OneDrive\projects\fhoneify\.claude\worktrees\xiaomi-inr-deductions` |
| Base | `origin/main` @ `37d7d97` |
| Commits on branch | **8** (an earlier summary said five; the list below is authoritative) |
| Status | Committed and tested. **Not merged, not pushed, not deployed.** No production DB changes are needed or were made. |
| Prepared | 2026-10-01 by Claude Code, for Codex |

Read with `docs/PRICING_INR_DEDUCTIONS.md` (design note and iteration log). The repo rules in `AGENTS.md` (parent folder) and `docs/HANDOFF_CODEX.md` still apply. Every changed pricing number needs owner approval.

---

## 1. The problem

The `/quote` "Estimated value" for Xiaomi/Redmi phones should track Cashify's **Selling price** (Cashify base − ₹20) for the same variant and answers. The owner captured a benchmark on 2026-10-01: 9 variants × 2 condition sets (below). Fhoneify's errors ranged from **−35.7% to +38.6%**. Only the 17T matched, and only by coincidence: the competitor uplift (+4–8%) offset an engine that under-estimated.

**Owner decision (2026-10-01).** The **internal Cashify-equivalent** (`cashifyConditionEquivalent`) must be within ±3% of Cashify Selling. The uplift and the ₹99 fee stay as they are, so the displayed value sits about 4–8% above Cashify by design. Scope is Xiaomi/Redmi/POCO only.

### Benchmark condition sets (exact `DiagnosticsType` in `scripts/pricing/benchmark-combos.ts`)

Every set has calls Yes, touch Yes, warranty **No**, GST bill Yes, original box with the same IMEI, and no age answer.

| Set | Screen original | Defects | Functional |
|---|---|---|---|
| **C0** clean | yes | none | none |
| **C1** heavy screen | **no (local)** | large/heavy spots + visible lines + major discoloration | none |
| **C2** minor + port | yes | more than 2 screen scratches | **charging port** |

## 2. Why the old formula was wrong

Old call chain: `app/quote/page.tsx` → `POST /api/quote/price` → `lib/pricing/pricingService.ts quote()` → `lib/pricing/engine.ts resolveReference + priceDevice` → `lib/pricingCalculator.ts calculateFhoneifyPrice` → `calculateXiaomiPrice`.

```
R         = Cashify Get Upto (ReferencePrice → lib/cashify_prices.json → catalog basePrice)
retention = 1 − [ local display 0.19 + worst(spots .25, lines .30, discol .25, scratches .15) + Σ functional (charging .10) + body … ]
cashifyEq = round( R × age (warranty No → 0.75; Redmi Note 0.74) × retention + ₹380 box )
quote     = applyCompetitorUplift(R, cashifyEq)      (8/6/4% by R, extra capped ₹2,000)
displayed = quote − ₹99                              (lib/pricing/payout.ts)
```

- Every condition deduction is a **share of R × age**. C1 keeps 0.51 and C2 keeps 0.75 of the age-adjusted price on every phone, so C2/C1 ≈ 1.47 for all models. The ₹380 box causes the slight drift.
- Cashify's C2/C1 ranges from 1.08 to 1.77. Its rupee gap C2 − C1 is flat at about ₹8,500 for 15 Ultra, 17 and 17 Ultra, even though their Get Upto runs from ₹57k to ₹75k.
- So the old model over-deducts expensive phones and under-deducts cheap ones.

## 3. The finding, and why repair-cost amounts

- **Deductions.** Take each model's out-of-warranty clean value as C0 = R × retention + 380. Then D1 = C0 − C1 and D2 = C0 − C2.
- **The old relative weights hold.** They predict D2 / D1 = (0.15 + 0.10) / (0.19 + 0.30) = **0.510**. Cashify's ratio is **0.469–0.538** on all 9 models (table in §6).
- **The base was wrong.** What does *not* hold is that the deductions scale with R × age. They scale with a per-model **repair-cost anchor A**, which does not follow price: four flagships with Get Upto from ₹37k to ₹75k share one A.

That is consistent with Cashify charging repair or part cost, which depends on the phone's components. Because the old weights were right, the fix **keeps every old percentage and every combination rule** and changes only what they multiply.

## 4. Exact formula change

New code: `lib/pricing/inrDeductions.ts` (engine) and `lib/pricing/inrDeductionTables.ts` (data). It is wired in `calculateXiaomiPrice` (`lib/pricingCalculator.ts`).

```
table(A)  = tableFromPercentRules(A): every GRANULAR_CONDITION_PENALTIES / COMMON_FUNCTIONAL_PENALTIES
            share × A, rounded to ₹10; localDisplay = (1 − 0.81) A; localDisplayNotAsked = (1 − 0.656) A;
            touchFailure = (1 − 0.4) A                      (0.4 = Xiaomi touch retention)
deduction = rawConditionAdjustments' own rules, applied in ₹:
            worst(physical screen, display defect)            cracked glass supersedes the local display
            + overlap(localDisplay, body)                     larger + 0.327 × smaller (CASHIFY_CALIBRATION.damageOverlap)
            + Σ functional                                    unrecognized hardware strings cost 0, as before
            touch failure supersedes every screen charge; touch failure or cracked glass is never charged
            less than the same phone without it (same guard as calculateConditionAdjustments)
cashifyEq = max( round10( R × ageFactor − deduction + box ), deadPhonePrice )
ageFactor = as before, except out of warranty: warrantyRetention[model] ?? (Redmi Note ? 0.74 : 0.764)
            (questionnaire NOT_ASKED still → 1, as before)
```

- The new path runs **only** when `resolveInrGroup()` finds the catalog model name, lowercased and exact, in `modelGroups`.
- `tierGroups` is empty, so there is no price-tier fallback. Any model not listed runs the old code unchanged.
- `PRICING_ENGINE_VERSION` is now `fhoneify-pricing/2026-10-01-xiaomi-inr-deductions`.

## 5. What did not change (verified by `git diff origin/main...HEAD`)

- `applyCompetitorUplift`: the 4/6/8% tiers and the ₹2,000 cap. `computeFhoneifyGetUpto` is also unchanged.
- `lib/pricing/payout.ts`: the ₹99 display deduction, the ₹299 coupon and the customer payout rounding. The displayed value is still uplift(eq) − 99, **not** rounded to ₹10.
- `priceDevice` guardrails, `resolveReference` and the reference resolution order.
- Every other brand calculator. Xiaomi/Redmi/POCO models not listed in `modelGroups` (for example Redmi Note 13 Pro and every POCO) are unchanged.
- `lib/referencePricing/**`, `.github/**` (the weekly Cashify refresh), `server/**`, `app/**` and `components/**` are untouched.
- In-warranty age brackets (below 3 / 3–6 / 6–11 months) and the no-bill −0.08 are unchanged.
- The dead-phone rule (`calls === false` → ₹200 / ₹1,200).
- **No Prisma schema change, no data migration and no production DB writes.** No Render or Vercel deployment was performed.

## 6. Calibration evidence

### 6.1 Sources

| Value | Kind | Source |
|---|---|---|
| C1 and C2 Cashify Selling for the 9 variants (18 values) | **Genuine Cashify measurement** | Owner capture 2026-10-01, in the original prompt; fixture `scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json` |
| C0 for Xiaomi 14 (₹21,380) and 14 Ultra (₹29,330) | **Genuine Cashify measurement** | Owner message 2026-10-01 ("final quote"). Treated as the clean / warranty No / bill / box capture and compared like Selling. Whether it is base or Selling is unconfirmed; the effect is ≤ ₹20 (0.1%). |
| Get Upto: 17 Ultra 75,370; 14 27,400; 14 Ultra 37,980 | **Genuine, same day** | Owner 2026-10-01 |
| Get Upto: 17T, Note 15 Pro+, Turbo 5, 15, 15 Ultra, 17 | **Measured 11 days earlier** | `lib/cashify_prices.json` (Cashify-verified 2026-09-20). Not re-confirmed on 10-01 (the live DB was unreachable from this session). |
| "Old Fhoneify" displayed values | Genuine Fhoneify output | Owner capture 2026-10-01 (`fhoneifyNow` in the fixture). The harness reproduces 7 of 9 models to the rupee; 14 / 14 Ultra are explained in §8. |

### 6.2 Per-model results (harness output at HEAD; "eq" = internal Cashify-equivalent, the gated quantity)

| Model (variant) | Get Upto R | Set | Cashify target | Old displayed (captured) | New eq | New displayed | eq err ₹ | eq err % |
|---|---|---|---|---|---|---|---|---|
| Xiaomi 17T (12 GB/512 GB) | 39,360 † | C1 | 16,240 | 16,262 | 16,340 | 17,221 | +100 | +0.6% |
| | | C2 | 23,640 | 23,772 | 23,250 | 24,546 | −390 | −1.6% |
| Xiaomi Redmi Note 15 Pro Plus 5G (12 GB/512 GB) | 28,100 † | C1 | 17,960 | 11,545 | 17,930 | 18,907 | −30 | −0.2% |
| | | C2 | 19,460 | 16,836 | 19,520 | 20,592 | +60 | +0.3% |
| Xiaomi Redmi Turbo 5 (12 GB/256 GB) | 26,080 † | C1 | 12,840 | 10,878 | 12,780 | 13,448 | −60 | −0.5% |
| | | C2 | 16,290 | 15,854 | 16,470 | 17,359 | +180 | +1.1% |
| Xiaomi 14 (12 GB/512 GB) | 27,400 | C0 | 21,380 | – | 21,380 | 22,564 | 0 | 0.0% ‡ |
| | | C1 | 8,180 | 11,336 | 8,150 | 8,540 | −30 | −0.4% |
| | | C2 | 14,460 | 16,528 | 14,630 | 15,409 | +170 | +1.2% |
| Xiaomi 14 Ultra (16 GB/512 GB) | 37,980 | C0 | 29,330 | – | 29,330 | 30,991 | 0 | 0.0% ‡ |
| | | C1 | 14,000 | 15,622 | 14,010 | 14,752 | +10 | +0.1% |
| | | C2 | 21,580 | 22,830 | 21,510 | 22,702 | −70 | −0.3% |
| Xiaomi 15 (12 GB/512 GB) | 37,100 † | C1 | 12,590 | 15,346 | 12,530 | 13,183 | −60 | −0.5% |
| | | C2 | 20,820 | 22,425 | 20,460 | 21,589 | −360 | −1.7% |
| Xiaomi 15 Ultra (16 GB/512 GB) | 59,580 † | C1 | 29,190 | 23,997 | 29,710 | 30,799 | +520 | +1.8% |
| | | C2 | 37,700 | 35,151 | 37,640 | 39,047 | −60 | −0.2% |
| Xiaomi 17 (12 GB/512 GB) | 57,070 † | C1 | 27,420 | 22,998 | 27,790 | 28,803 | +370 | +1.3% |
| | | C2 | 35,920 | 33,682 | 35,720 | 37,050 | −200 | −0.6% |
| Xiaomi 17 Ultra (16 GB/512 GB) | 75,370 | C1 | 41,950 | 30,278 | 41,770 | 43,342 | −180 | −0.4% |
| | | C2 | 50,460 | 44,388 | 49,700 | 51,589 | −760 | −1.5% |

- † Get Upto from the 2026-09-20 snapshot, not re-measured on the benchmark day.
- ‡ Matches by construction: the model's retention is computed from this same capture.
- Summary over the 20 cases: max |err| 1.78%, mean |err| 0.71%. **These are in-sample fit figures, not validation.**

### 6.3 Parameters and their status

| Parameter | Value | Applies to | Status |
|---|---|---|---|
| Anchor A, `xiaomi-flagship` | ₹33,040 | 15, 15 Ultra, 17, 17 Ultra (all storage variants) | **Fitted** (least squares on 8 cases; 7 residual degrees of freedom). The only parameter with real cross-model support. |
| Anchor A, `xiaomi-14-ultra` | ₹31,260 | 14 Ultra | **Fitted** from that model's own C1 and C2 (1 residual degree of freedom) |
| Anchor A, `xiaomi-17t` | ₹28,810 | 17T | **Fitted**, own 2 cases |
| Anchor A, `xiaomi-14` | ₹27,000 | 14 | **Fitted**, own 2 cases |
| Anchor A, `redmi-turbo-5` | ₹15,350 | Redmi Turbo 5 | **Fitted**, own 2 cases |
| Anchor A, `redmi-note-15-pro-plus` | ₹6,610 | Redmi Note 15 Pro Plus 5G | **Fitted**, own 2 cases, on a stale Get Upto and an unmeasured retention: **weakest** |
| Out-of-warranty retention, Xiaomi 14 | 0.7664 | 14 | **Observed** (C0 capture) |
| Out-of-warranty retention, 14 Ultra | 0.7622 | 14 Ultra | **Observed** (C0 capture) |
| `defaultWarrantyRetention` | 0.764 | 17T, Turbo 5, 15, 15 Ultra, 17, 17 Ultra | **Extrapolated** (mean of the two above). Also benchmark-informed: 0.75 gave 2.9% max error, 0.764 gave 1.8%. |
| Redmi Note out-of-warranty retention | 0.74 | Note 15 Pro+ | **Assumed** (old age table, never measured) |
| Relative weights: local display 0.19, lines 0.30, spots/discoloration 0.25, scratches 0.15, charging 0.10 | old values | all groups | **Assumed**. Only the sums are observed: D1 = local + worst display defect, D2 = scratches + charging. Their ratio is consistent (0.47–0.54 vs 0.51). |
| Cracked glass 0.35 A, touch failure 0.60 A, chipped 0.20 A, body, cameras, battery, Wi-Fi, … | old shares × A | all groups | **Extrapolated**: never observed against Cashify for any Xiaomi model |
| Box bonus | ₹380 | all | **Assumed** (old constant) |

**Degrees of freedom.** The 18 non-tautological cases are fitted by 6 anchors, leaving 12 residual degrees of freedom. Of those, 7 come from the flagship group; each single-model group leaves 1, which tests only the D2/D1 ratio. **There is no holdout set.** Treat the 20/20 as evidence that the structure fits, not as validation.

### 6.4 The 18-case fixture vs the 20 cases

- **18 cases:** the owner's original fixture, 9 variants × C1/C2.
- **20 cases:** those same 18, plus **two C0 rows** (Xiaomi 14 and 14 Ultra) from the owner's later message. The C0 rows match by construction (‡), so they add no validation. They only pin the retention for those two models.

Other differences:
- **Variant strings.** The original fixture spells variants as `12GB/512GB`; the harness uses the catalog spelling `12 GB/512 GB`.
- **Xiaomi 14 / 14 Ultra in the original 18.** Before the variant fix (§8) these two models could not be priced through the real quote path (`DEVICE_NOT_FOUND`), and they had no Get Upto. In the baseline run only 14 of the 18 cases were priceable; max error 38.8%, mean 15.4%, 17 cases failing.

## 7. Risks (none of these is hidden by the passing benchmark)

The probe values below are computed by the engine at HEAD. **No Cashify quotation exists for any probe.**

| Probe | Old eq | New eq | New ÷ R |
|---|---|---|---|
| Note 15 Pro+ (R 28,100), in warranty, cracked glass | 18,645 | 26,170 | 0.93 |
| Note 15 Pro+, in warranty, touch failure | 11,620 | 24,510 | 0.87 |
| Note 15 Pro+, in warranty, cracked + back camera + charging + bent | 2,544 | 22,390 | 0.80 |
| Note 15 Pro+, out of warranty, cracked glass | 13,896 | 18,860 | 0.67 |
| 17 Ultra (R 75,370), in warranty, cracked glass | 49,371 | 64,190 | 0.85 |
| 17 Ultra, in warranty, touch failure | 30,528 | 55,930 | 0.74 |
| 17 Ultra, in warranty, cracked + camera + charging + bent | 6,183 | 45,260 | 0.60 |
| Xiaomi 14 (R 27,400), in warranty, cracked glass | 18,190 | 18,330 | 0.67 |

1. **Redmi Note 15 Pro+ (highest risk).**
   - **Why it's weak:** A = ₹6,610 (≈ 0.24 R) comes from a single ₹1,500 gap between two quotes, on a 09-20 Get Upto and an assumed 0.74 retention. Every damage answer outside the benchmark is therefore cheap. Cracked glass costs about ₹2.3k, so the phone keeps about 93% of Get Upto in warranty. That may well over-pay.
   - **Old-model risk:** the benchmark shows the old model under-pays this phone by 36–39% (C1) and 14–18% (C2).
   - **Current state on the branch:** it **is listed in `modelGroups` (active)**. Per the owner's instruction it is left as is. Codex must not change it without owner approval.
   - **Options to put to the owner:**
     - Keep it.
     - Remove it from `modelGroups`. It then fails the benchmark, because the old model is at −38.8%.
     - Keep it, but gate the answers outside the benchmark on new captures.
2. **Single-model anchors** (14, 14 Ultra, 17T, Turbo 5, Note 15 Pro+). Each is fitted from that model's own 2 cases. Their benchmark fit is near-exact by construction.
3. **Retention 0.764** is extrapolated from two older flagships (14, 14 Ultra) to newer models (17T, 17 / 17 Ultra, Turbo 5). Cashify's warranty cut may differ for newly launched phones. Every unmeasured anchor inherits that error: a 0.01 retention error is 0.01 × R ≈ ₹400–750.
4. **Questionnaire semantics are unverified in production.**
   - The harness prices with the **UNKNOWN** fallback (no questionnaire store). Production reads `CashifyQuestionnaireProfile` from the DB.
   - If any of the 9 models is stored as `warrantyMode: NOT_ASKED`, then for that model:
     - the age factor is 1 (the measured retention is ignored);
     - the local display uses the NOT_ASKED rate (0.344 A);
     - the benchmark mapping no longer applies.
   - The owner answered warranty and bill for all 9 on Cashify, so Cashify does ask both today. The stored `ageMode` is known to be unreliable (`research-collector-pitfalls`: the first-page parser cannot see the age page).
   - **Not checked:** the read-only production query in §9 needs owner approval.
5. **Combination logic.**
   - Screen, touch, hardware and body rules are the old `rawConditionAdjustments` rules, applied in ₹. That includes worst-of within display defects, the touch/cracked supersede-and-never-cheaper guard, the 0.327 display/body overlap, additive functional faults and no charge for unknown hardware.
   - **Cashify has only confirmed two sums,** for the benchmark sets. Whether local display adds to display defects or takes worst-of is not separable from C1.
6. **Large payout increases.**
   - Benchmark answers: 17 Ultra displayed C1 30,278 → 43,342 (**+43%**) and C2 44,388 → 51,589 (+16%), both within ±1.5% of Cashify. Turbo 5 C1 +23.5% and Note 15 Pro+ C1 +64% are also benchmark-backed.
   - **Unbenchmarked answers move far more.** 17 Ultra touch failure goes from 30,528 to 55,930 (+83%), and its "wrecked" probe rises 7.3×. These increases rest only on the extrapolated old weights.
7. **No independent validation yet** (§10).
8. **Stale Get Upto** for 6 models (09-20 vs the 10-01 benchmark). Any drift was absorbed into the fitted anchors.

**Deductions that still need real Cashify quotes:**
- local display alone;
- display defects alone (lines / spots / discoloration);
- >2 screen scratches alone;
- charging port alone;
- cracked glass;
- touch failure;
- body damage (scratches, dents, panel, bent);
- other functional faults (cameras, battery, Wi-Fi, speaker, …);
- out-of-warranty retention for 17T, Note 15 Pro+, Turbo 5, 15, 15 Ultra, 17 and 17 Ultra.

## 8. Variant matching and images

- **Catalog fix (`lib/seed_devices.ts`, 4 rows).**
  - Rows changed to include RAM: Xiaomi 14 `512 GB` → `12 GB/512 GB`, 14 Ultra `512 GB` → `16 GB/512 GB`, 13 Pro 5G `256 GB` → `12 GB/256 GB`, Redmi 10 Power `128 GB` → `8 GB/128 GB`.
  - **Why it was broken:** their Cashify pages are RAM-specific, so the storage-only key never matched a reference (the refresh rejected them as an "ambiguous variant"). Quotes fell back to the stale catalog `basePrice`, which made 14 and 14 Ultra over-priced, and the page label showed no RAM.
  - **Nothing orphaned:** none of the four had a stored reference under the old key (`server/data/reference-prices/store.json` status `missing`; none in `lib/cashify_prices.json`).
  - **Not changed:** Samsung S-series storage-only rows, because Cashify lists those storage-only and they resolve today (`scripts/pricing/list-storage-only-variants.ts`); and the drifted legacy copy `server/seed_devices.ts`, which pricing doesn't use.
- **Until the next weekly Cashify refresh** writes the new keys, 14 and 14 Ultra still price from catalog `basePrice` 27,210 / 37,780. That is within 1% of the owner's 27,400 / 37,980.
- **In-flight risk:** a quote token or URL issued before deploy with the old `512 GB` string will fail catalog lookup. Only sessions that span the deploy are affected.
- **Images added:** `public/images/models/xiaomi-15.png` and `xiaomi-15-ultra.png`, 192×192 PNGs from Cashify's public product pages (`s3n.cashify.in/cashify/product/img/xhdpi/c7d0ab61-6afa.jpg` and `…/2cddf2a9-6b14.jpg`, whose bytes are PNG). No existing image was modified.
  - Noticed, not changed: `xiaomi-17-ultra.png` is really a JPEG and `xiaomi-14*.png` are AVIF.

## 9. Reproduction (run from the worktree; use the unreachable DB URL every time)

```bash
cd "C:/Users/shoae/OneDrive/projects/fhoneify/.claude/worktrees/xiaomi-inr-deductions"   # or: git worktree list
git status && git log --oneline origin/main..HEAD          # 8 commits, clean tree
git show --stat <sha>                                      # inspect each commit
git diff origin/main...HEAD -- lib/pricingCalculator.ts    # old vs new formula wiring
export DATABASE_URL=postgresql://nobody:x@127.0.0.1:1/none # PowerShell: $env:DATABASE_URL='postgresql://nobody:x@127.0.0.1:1/none'

npx tsx scripts/calibrate-pricing.ts                       # 20-case calibration (= npm run pricing:calibrate)
npx tsx scripts/test/pricing.inr-deductions.test.ts        # new unit tests
npx tsx scripts/pricing/snapshot-quotes.ts --compare docs/pricing-calibration/regression-before.json   # cross-brand before/after
npx tsx scripts/pricing/fit-inr-tables.ts --group "Xiaomi 15,Xiaomi 15 Ultra,Xiaomi 17,Xiaomi 17 Ultra"  # D2/D1 table + anchor fit (analysis only)
npx tsx scripts/pricing/list-storage-only-variants.ts      # storage-only catalog rows

# DB-safe pricing regressions
for t in pricing.regression pricing.condition-matrix pricing.team-qa pricing.calibration pricing.questionnaire-coverage \
         pricing.quote-consistency pricing.get-upto pricing.production pricing.reference-data pricing.cashify-comparison \
         referencePricing.cashify-matching pricing.catalog-properties pricing.generalization-properties; do
  echo "== $t"; npx tsx scripts/test/$t.test.ts | tail -2; done

npx tsc -p tsconfig.next.json --noEmit                     # expect 0 errors
npx tsc -p tsconfig.server.json --noEmit                   # expect 6 errors, all in untouched server/ files (pre-existing)
```

- **Confirm activation scope:** `modelGroups` in `lib/pricing/inrDeductionTables.ts` lists exactly 9 lowercase catalog model names and `tierGroups: []`.
  - The unit test "without a group the percentage model prices the phone unchanged" asserts it.
  - The snapshot compare shows only listed models changing (9 of 57 rows; Redmi Note 13 Pro unchanged).

**Do NOT run:**
- **`scripts/test/pricing.quote-integration.test.ts`.** It writes a probe price to the production Postgres via `.env`.
- **`npm run test:pricing:all`.** It includes that suite (this was already the case on main).
- **Any `scripts/reference-pricing/*` script or `npm run reference-prices:*`.** These write production reference data.
- **The read-only production check** of `CashifyQuestionnaireProfile` for the 9 model keys (risk 4) is a production read. Ask the owner first.

### Results at HEAD `2f3f21d` (2026-10-01, `DATABASE_URL` unreachable)

| Command | Result |
|---|---|
| calibrate-pricing | 20/20 within ±3%, max 1.78%, mean 0.71%, exit 0 |
| pricing.inr-deductions | 21 passed, 0 failed |
| pricing.regression | 27/27 golden cases, all invariants |
| pricing.condition-matrix | 20 passed |
| pricing.team-qa | 7 passed |
| pricing.calibration | 9 passed |
| pricing.questionnaire-coverage | 3 passed |
| pricing.quote-consistency | 10 passed |
| pricing.get-upto | 5 passed |
| pricing.production | 37 passed |
| pricing.reference-data | 28 passed |
| pricing.cashify-comparison | PASS |
| referencePricing.cashify-matching | 39 passed |
| pricing.catalog-properties | PASS (2,242 devices, 35,872 quotes) |
| pricing.generalization-properties | PASS (1,517,834 quotes, 29 invariants) |
| snapshot compare | 9 of 57 rows changed, all listed Xiaomi models |
| tsc (next) | 0 errors |
| tsc (server) | 6 errors, all in `server/modules/admin/service.ts`, `server/modules/inventory/service.ts`, `server/test-iphone14.ts`, `server/test-random-10.ts` (untouched by this branch) |

## 10. Independent validation plan (do before any production activation)

These quotes must **not** have been used to fit anything. Capture them on Cashify on one day:
- also record the **Get Upto** of every phone that day;
- use the same answers as §1 unless stated;
- warranty No, bill Yes, box.

**Predictions below are registered now.** They are stated as ₹ deductions relative to a same-day clean capture (V5–V7 or a fresh C0), so they don't depend on Get Upto drift.

| # | Phone | Answers | Registered prediction | Tests |
|---|---|---|---|---|
| V1 | Xiaomi 17 12/512 (flagship group) | Clean except **screen not original** | C0 − ₹6,280 | Local display alone (0.19 A) |
| V2 | Redmi Turbo 5 12/256 | Same as V1 | C0 − ₹2,920 | Same, low anchor |
| V3 | Xiaomi 17 12/512 | Clean except **charging port not working** | C0 − ₹3,300 | Charging alone (0.10 A) |
| V4 | Redmi Turbo 5 12/256 | Same as V3 | C0 − ₹1,540 | Same |
| V5 | Xiaomi 17T 12/512 | **Clean** | C0 = 0.764 R + 380 (rounded to ₹10) | Default retention |
| V6 | Redmi Note 15 Pro+ 12/512 | **Clean** | C0 = 0.74 R + 380 | Note retention; re-checks its Get Upto |
| V7 | Redmi Turbo 5 12/256 | **Clean** | C0 = 0.764 R + 380 | Default retention |
| V8 (recommended) | Redmi Note 15 Pro+ 12/512 | Clean except **screen cracked / glass broken** | C0 − ₹2,310 | Riskiest extrapolation |
| V9 (recommended) | Xiaomi 17 Ultra 16/512 | Clean except **touch not working** | C0 − ₹19,820 | Largest payout increase |
| V10 (recommended) | Xiaomi 17 Ultra, a storage variant not in the fixture | Set C1 | R' × 0.764 + 380 − ₹16,190 | Anchor carries across storage |

V1 / V3 also need a same-day Xiaomi 17 C0 capture, and V2 / V4 use V7.

**Acceptance**
- **Pass:** each prediction within ±3% of the Cashify Selling price, where the deduction is converted to a final price. For V1–V4, also report the deduction error in ₹.
- **On a miss:** report it to the owner with the observed number. **Do not refit** anchors or weights to these results. A refit consumes the holdout and needs a fresh validation set.
- **Holdout status:** this set becomes calibration data only after the owner approves; then a new holdout is needed.

## 11. Commits (oldest first)

| SHA | Message |
|---|---|
| `445ada9c46bbc18daa2a4204358dc7480d62004d` | Add cross-brand quote snapshot as a regression guard for pricing changes |
| `27ff744ff4d2404eb6723a155848911cc0085922` | Add Cashify calibration harness for the Xiaomi benchmark |
| `23f3dc43666fb0b8a85a7156ae25026d614ace3a` | Include RAM in four Xiaomi catalog variants so they resolve a Cashify price |
| `f4f0afc6f85ff07f7dee7b169d62fdbb526847c2` | Add a fixed-rupee condition model for Xiaomi, switched off until calibrated |
| `c5f80fa0ac7fd6646d4bf3df389fa592632c637e` | Document the fixed-rupee model and add the table-fitting script |
| `3cee6cc2c3bc869c88465bdb41b5223b647044f6` | Add Xiaomi 15 and 15 Ultra product images from Cashify |
| `4ff2989cccd01b38640eb22603d397f53d16e2fc` | Calibrate and enable fixed-rupee deductions for nine Xiaomi models |
| `2f3f21da471a1975cfd9757133dfb5bf9384484b` | Make the fixed-rupee model follow the old combination rules exactly |

This handoff document is committed on top of these.

## 12. Files changed vs `origin/main`

| File | Change |
|---|---|
| `lib/pricing/inrDeductions.ts` | new: fixed-₹ engine |
| `lib/pricing/inrDeductionTables.ts` | new: anchors, model membership, retention (config) |
| `lib/pricingCalculator.ts` | `calculateXiaomiPrice` wiring only (+ imports) |
| `lib/pricing/engine.ts` | `PRICING_ENGINE_VERSION` bump |
| `lib/seed_devices.ts` | 4 Xiaomi storage strings |
| `package.json` | `test:pricing:inr-deductions`, `pricing:calibrate`; new suite appended to `test:pricing:all` |
| `public/images/models/xiaomi-15.png`, `xiaomi-15-ultra.png` | new images |
| `scripts/calibrate-pricing.ts` | new harness |
| `scripts/pricing/benchmark-combos.ts` | new: C0/C1/C2 answer sets |
| `scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json` | new: fixture (20 gated cases + Get Upto) |
| `scripts/pricing/fit-inr-tables.ts` | new: anchor fit (analysis) |
| `scripts/pricing/snapshot-quotes.ts` | new: regression snapshot tool |
| `scripts/pricing/list-storage-only-variants.ts` | new: catalog diagnostic |
| `scripts/test/pricing.inr-deductions.test.ts` | new: 21 unit tests |
| `docs/PRICING_INR_DEDUCTIONS.md` | new: design note and iteration log |
| `docs/pricing-calibration/regression-before.json` | new: pre-change snapshot (57 rows) |
| `docs/CODEX_XIAOMI_PRICING_HANDOFF.md` | this file |

No secrets, `.env` files, Cashify session files or private screenshots are in the diff.

## 13. Decisions for the owner

1. **Redmi Note 15 Pro+:** keep it active, remove it from `modelGroups`, or gate its answers outside the benchmark (risk 1).
2. **Approve or run the independent validation set** (§10) before merging. Ideally also refresh the 6 stale Get Upto values on the capture day.
3. **Allow a read-only production check** of `CashifyQuestionnaireProfile` for the 9 models (risk 4).
4. **Displayed rounding:** keep uplift − ₹99 (ends in 1), or round the displayed value to ₹10. Changing it needs approval, because it touches the protected payout rule.
5. **Merge, deploy and timing.** Pushing from this machine is blocked for Vercel; see memory `production-deploy-topology`.
6. **Optional cleanup**, not done here: the duplicate Redmi Turbo 5 8/256 catalog row and the mislabelled image formats.

## 14. Can Codex continue from here?

Yes.
- **The worktree is a normal git worktree** of the main repo, with a clean tree and every change committed.
- **The branch ref `fix/xiaomi-inr-deductions` lives in the shared repo.** So even if this worktree directory were removed, `git switch fix/xiaomi-inr-deductions` (or `git worktree add <path> fix/xiaomi-inr-deductions`) recovers everything.
- **Dependencies:** the worktree has no `node_modules` of its own. Node resolves the parent repo's `node_modules`, so no install is needed.
- **The branch is not on the remote.** Push only with owner approval, and never to `main`.
