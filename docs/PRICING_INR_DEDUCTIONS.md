# Fixed-₹ condition deductions for Xiaomi / Redmi / POCO

Branch `fix/xiaomi-inr-deductions`. Status: **calibrated and enabled for 9 models. All 20 benchmark cases are within ±3% (max 1.78%, mean 0.71%).** Nothing is deployed.

## Independent evidence and opt-in candidate (2026-10-01)

The benchmark status above is calibration only. The cap-corrected engine's
original independent holdout is 5.51% MAPE, 14.45% maximum, 3/9 within 3%.
See [the separate candidate validation report](XIAOMI_CANDIDATE_VALIDATION_2026-10-01.md)
for the preserved frozen results, error decomposition and new observations.

An opt-in research module now supports only Xiaomi 17 12/512 and Turbo 5
12/256 under the verified warranty-No, bill-Yes, box-only, age/eSIM-not-asked
route. It pins independently observed clean baselines and display/charging
costs; both new combined-fault predictions match exactly. It is not imported
by production, and the active nine-model tables remain unchanged.

Note 15 Pro+ remains blocked: the new valid six-fault Cashify Selling price
is INR 560 versus the existing INR model's 16,630. The cracked-glass route
omits age despite the initial warranty-Yes answer; do not force an
in-warranty plus Below-3-months state or infer a new coefficient. Raw evidence
stays local and ignored. Production activation still requires separate approval.

## Old formula

Call chain: `app/quote/page.tsx` → `POST /api/quote/price` → `lib/pricing/pricingService.ts` `quote()` → `lib/pricing/engine.ts` `resolveReference` + `priceDevice` → `lib/pricingCalculator.ts` `calculateFhoneifyPrice` → `calculateXiaomiPrice`.

```
R          = Cashify Get Upto (ReferencePrice → lib/cashify_prices.json → catalog basePrice)
retention  = 1 − [ local display 0.19 + worst(spots .25, lines .30, discol .25, scratches .15) + Σ functional (charging .10) + … ]
cashifyEq  = round( R × age (warranty No = 0.75) × retention + ₹380 box )
quote      = cashifyEq × uplift (8 / 6 / 4 % by R, extra ≤ ₹2,000)
displayed  = quote − ₹99
```

**Why it fails.** Every deduction is a share of R × age. For the benchmark answers, Combo 1 keeps 0.51 and Combo 2 keeps 0.75 on every phone, a constant ratio of 1.47. The fixed ₹380 box pulls it slightly lower, which is the small drift with price. Cashify's ratio varies from 1.08 to 1.77, and its rupee gap between the combos is flat at about ₹8,500 for 15 Ultra, 17 and 17 Ultra (R ₹57k–75k). The percentage model over-deducts expensive phones and under-deducts cheap ones.

## What the data showed

Taking the out-of-warranty retention as measured (0.766 for Xiaomi 14, 0.762 for 14 Ultra; 0.764 elsewhere), each model's Cashify deductions are:

| Model | R | D1 = C0 − C1 | D2 = C0 − C2 | D2 / D1 |
|---|---|---|---|---|
| 17T | 39,360 | 14,211 | 6,811 | 0.479 |
| Redmi Note 15 Pro+ | 28,100 | 3,214 | 1,714 | 0.533 |
| Redmi Turbo 5 | 26,080 | 7,465 | 4,015 | 0.538 |
| 14 | 27,400 | 13,200 | 6,920 | 0.524 |
| 14 Ultra | 37,980 | 15,330 | 7,750 | 0.506 |
| 15 | 37,100 | 16,134 | 7,904 | 0.490 |
| 15 Ultra | 59,580 | 16,709 | 8,199 | 0.491 |
| 17 | 57,070 | 16,561 | 8,061 | 0.487 |
| 17 Ultra | 75,370 | 16,013 | 7,503 | 0.469 |

The old rules predict D2 / D1 = (0.15 + 0.10) / (0.19 + 0.30) = **0.510**, and Cashify's observed values range from 0.47 to 0.54. The relative weights between answers were right all along. What was wrong is the quantity they multiply: R × age, the resale price. That should be a **repair-cost anchor** A, and A does not follow price. The four current flagships share one A from ₹37k to ₹75k.

## New formula (`lib/pricing/inrDeductions.ts`; data in `lib/pricing/inrDeductionTables.ts`)

```
table(A) = old percentage rules × A                     (tableFromPercentRules: no new percentages)
value    = round10( R × outOfWarrantyRetention
                    − worst(physical screen, display defect)        (touch failure 0.60 A supersedes; cracked glass supersedes local display)
                    − overlap(local display, body)                  (larger + 0.327 × smaller, as before)
                    − Σ functional + box )
           floored at the dead-phone price; uplift and ₹99 unchanged (owner decision 2026-10-01)
```
The combination rules are the percentage model's own (`rawConditionAdjustments`), including the "touch failure / cracked glass never costs less than the same phone without it" guard. The only change is the base the shares multiply: A instead of R × age. Unrecognized hardware strings cost nothing, as before.

| Group | Anchor A | Models | Evidence |
|---|---|---|---|
| xiaomi-flagship | 33,040 | 15, 15 Ultra, 17, 17 Ultra | 8 cases fitted by 1 anchor, all within ±1.8% |
| xiaomi-14-ultra | 31,260 | 14 Ultra | its own 2 cases (1 degree of freedom left) |
| xiaomi-17t | 28,810 | 17T | its own 2 cases |
| xiaomi-14 | 27,000 | 14 | its own 2 cases |
| redmi-turbo-5 | 15,350 | Redmi Turbo 5 | its own 2 cases |
| redmi-note-15-pro-plus | 6,610 | Redmi Note 15 Pro Plus 5G | its own 2 cases; Get Upto from 09-20 and Note retention 0.74 unmeasured |

- Merging groups fails the gate: putting 14 Ultra in the flagship group gives −3.9%, and pairing 14 with 17T gives +4.9%.
- A group covers **every storage variant** of its models, because repair cost does not depend on storage.
- **Only the listed models switch.** Every other Xiaomi / Redmi / POCO model, and every other brand, keeps the percentage model. The tier fallback is empty until Cashify evidence covers more models.
- **Out-of-warranty retention:** measured per model where a clean, warranty-No capture exists. Otherwise 0.764, the mean of the two measurements. Redmi Note models keep 0.74.
- The Cashify-equivalent is rounded to ₹10. The displayed value is still uplift − ₹99, unchanged.

## Other fixes

- **Xiaomi 14, 14 Ultra, 13 Pro 5G and Redmi 10 Power** stored storage-only variants (`"512 GB"`), so no Cashify reference matched them. Quotes used the stale catalog basePrice instead, which is why 14 and 14 Ultra were over-quoted, and the label showed no RAM. They now use RAM/storage variants. None had a stored reference under the old key, so nothing was orphaned. Samsung S-series rows stay storage-only, because Cashify lists them that way and they resolve today.
- **Images:** `xiaomi-15.png` and `xiaomi-15-ultra.png` added from Cashify's public product pages.
- Noticed, not changed: `xiaomi-17-ultra.png` is really a JPEG and `xiaomi-14*.png` are AVIF despite the extension. The duplicate catalog row for Redmi Turbo 5 8/256 (₹24,110 and ₹24,120; the first one wins) is also left as is.

## Tools

| Command | What it does |
|---|---|
| `npm run pricing:calibrate` | Runs the benchmark through the real quote service (no DB). Exits 1 outside ±3%. |
| `npx tsx scripts/pricing/fit-inr-tables.ts --group "Xiaomi 15,Xiaomi 15 Ultra,Xiaomi 17,Xiaomi 17 Ultra"` | Fits anchors and prints D2/D1 per model. |
| `npx tsx scripts/pricing/snapshot-quotes.ts --compare docs/pricing-calibration/regression-before.json` | Cross-brand before/after table. |
| `npm run test:pricing:inr-deductions` | Unit tests: worst-of, cap, additivity, ₹10 rounding, monotonicity, guardrails, unlisted = unchanged. |

## Iteration log

| # | Change | Max \|err\| | Mean \|err\| | Failing |
|---|---|---|---|---|
| 0 | Baseline (percentage model) | 38.8% | 15.4% | 17 / 18 (Xiaomi 14 / 14 Ultra unresolvable) |
| 1 | Variant fix; ₹ engine added, switched off | 38.8% | 15.4% | 17 / 18 (14 / 14 Ultra resolve, no Get Upto yet) |
| 2 | Owner data: Get Upto + clean captures for 14 / 14 Ultra | – | – | (fit only) |
| 3 | Fit: flagship group shares an anchor, others per model; retention 0.75 for unmeasured models | 2.9% | – | 0 / 20, but 17 Ultra C2 at −2.9% |
| 4 | Same groups; retention 0.764 (measured mean) | 1.8% | – | 0 / 20 (fit) |
| – | Rejected: 14 Ultra joins flagship / 14 + 17T share an anchor | 3.9% / 4.9% | – | fails ±3% |
| 5 | Row 4 written into the config and enabled; harness run | **1.78%** | **0.71%** | **0 / 20** |

## Regression (before → after, Cashify-equivalent)

Unchanged across 48 rows: Apple, Samsung, OnePlus, Oppo, Vivo, Realme, Google, Nothing, and Redmi Note 13 Pro (an unlisted Xiaomi model). Changed rows:

| Model | Clean, warranty No | Combo 1 | Combo 2 |
|---|---|---|---|
| Xiaomi 17T | +1.8% | +5.9% | +3.2% |
| Xiaomi 17 Ultra | +1.8% | **+43.0%** | +16.2% |
| Redmi Turbo 5 | +1.9% | +23.5% | +9.4% |

## Independent review (2026-10-01)

- **No problems found** with hardcoded overrides, other brands, unlisted Xiaomi models, rounding, guardrails or monotonicity.
- **Fixed after review:**
  - The first ₹ engine charged cracked glass and touch failure one 0.49 A screen replacement each.
  - It dropped the 0.327 local-display/body overlap.
  - It charged unrecognized hardware strings a default amount.
  - It ignored the warranty-not-asked local-display rate.
  - All four now follow the old rules exactly. Benchmark results are unchanged.
- **Degrees of freedom:** 20 gated cases against 8 fitted values (6 anchors + 2 measured retentions), plus the 0.764 default.
  - **Real cross-model evidence:** the flagship group (8 cases, 1 anchor). Each single-model group only tests the 0.25 : 0.49 ratio.
  - **The two C0 rows match by construction.**
  - **No holdout set yet.**
- **Production questionnaire profiles:** the harness prices with the UNKNOWN questionnaire profile. If production stores `warrantyMode: NOT_ASKED` for any of the nine models, the age factor is 1 there, so check those profiles.
- **Xiaomi 14 / 14 Ultra Get Upto:** these come from the next weekly Cashify refresh, which can now match their RAM-specific pages. Until then they fall back to the catalog basePrice (27,210 / 37,780), within 1% of the owner's 27,400 / 37,980.

## Still assumptions (need more Cashify samples)

1. **Local display alone (0.19 A) vs display defects (lines 0.30 A).** Combo 1 only shows their sum.
2. **The Combo 2 split** of >2 screen scratches (0.15 A) vs charging port (0.10 A). Only the sum is observed.
3. **Every answer not in the benchmark** (cracked glass 0.35 A, touch failure 0.60 A, cameras, battery, body, Wi-Fi, …) is the old percentage × A, never checked against Cashify. **This matters most for low anchors.** For example, Redmi Note 15 Pro+ (A = ₹6,610, about 0.24 R) with cracked glass is charged about ₹2.3k, so it keeps ~90% of Get Upto. The old model kept ~65%.
4. **Out-of-warranty retention** for the 7 models without a clean capture (0.764, or 0.74 for Redmi Note).
5. **Redmi Note 15 Pro+** anchor (₹6,610), its Get Upto (09-20 snapshot) and Note retention.
6. **Box bonus ₹380.**

## Next captures

1. **Only "screen not original"** (everything else clean, warranty No): one flagship plus one Redmi. Splits localDisplay from display defects and tests the cap (assumption 1).
2. **Only "charging port not working"**: same two phones. Splits Combo 2 (assumption 2).
3. **Clean, warranty No** for 17T, Redmi Note 15 Pro+ and Redmi Turbo 5. Replaces the 0.764 / 0.74 retention guesses for the single-model groups (assumptions 4 and 5).

## Functional aggregate cap correction (2026-10-01)

The INR implementation now caps the sum of recognized, deduplicated functional-fault deductions at its existing repair-cost anchor. This restores the old aggregate functional penalty's 100% cap without changing any weight or anchor. Screen/body deductions remain separate.

At the Redmi Note 15 Pro+ anchor of INR 6,610, the eight-fault regression summed to INR 7,050 before correction. It now charges INR 6,610. The targeted unit suite went from 21 passing and one failing new regression to 22 passing; the calibration remains 20/20 within 3% (mean 0.71%, maximum 1.78%). Those calibration rows are fitted evidence, not independent validation.

The original independent V1-V10 register in ignored local research storage remains immutable. V1-V9 predictions are unchanged by this correction. Additional cap observations are separately preregistered; they do not replace the original cases. Production activation remains gated on independently verified final Selling prices and questionnaire profiles.
