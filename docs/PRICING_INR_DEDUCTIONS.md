# Fixed-₹ condition deductions for Xiaomi / Redmi / POCO

Branch `fix/xiaomi-inr-deductions`. Status: **engine built and tested, switched off; calibration is waiting on owner data** (see "Open data").

## Old formula

Call chain: `app/quote/page.tsx` → `POST /api/quote/price` → `lib/pricing/pricingService.ts` `quote()` → `lib/pricing/engine.ts` `resolveReference` + `priceDevice` → `lib/pricingCalculator.ts` `calculateFhoneifyPrice` → `calculateXiaomiPrice`.

```
R          = Cashify Get Upto (ReferencePrice → lib/cashify_prices.json → catalog basePrice)
retention  = 1 − [ local display 0.19 + worst(spots .25, lines .30, discol .25, scratches .15) + Σ functional (charging .10) + … ]
cashifyEq  = round( R × age (warranty No = 0.75) × retention + ₹380 box )
quote      = cashifyEq × uplift (8 / 6 / 4 % by R, extra ≤ ₹2,000)
displayed  = quote − ₹99
```

**Why it fails.** Every deduction is a share of R. For the benchmark answers, Combo 1 keeps 0.51 and Combo 2 keeps 0.75 of the age-adjusted price on every phone. That is a ratio of 1.47, pulled down slightly by the fixed ₹380 box. Cashify's ratio, by contrast, ranges from 1.08 to 1.77, and its rupee gap between the combos is flat at about ₹8,500 for 15 Ultra, 17 and 17 Ultra (R ₹57k–75k). The percentage model therefore over-deducts expensive phones and under-deducts cheap ones.

## New formula (`lib/pricing/inrDeductions.ts`, tables in `lib/pricing/inrDeductionTables.ts`)

```
value = round10( R × outOfWarrantyRetention[model]
                 − min(screenReplacement, localDisplay + worst(physical screen, display defect))
                 − body − Σ functional + box )
        floored at the dead-phone price; uplift and ₹99 unchanged (owner decision 2026-10-01)
```

- Deductions are rupees per **repair-cost group**. A group is assigned by explicit model membership, with a fallback to the Get Upto tier.
- A failed touch screen or cracked glass costs one full `screenReplacement`.
- `outOfWarrantyRetention` comes per model from a clean, warranty-No Cashify quote. Models without one keep the family age table (0.75; 0.74 for Note models).
- Gated by `enabled` in the config. When it is off, Xiaomi prices are byte-for-byte the old model.
- Every ₹ value without Cashify evidence is the old percentage rule taken at the group's anchor price, so the relative weights between answers don't change.

## Other fixes

- **Xiaomi 14, 14 Ultra, 13 Pro 5G and Redmi 10 Power** stored storage-only variants (`"512 GB"`), so no Cashify reference ever matched them. Quotes used the stale catalog basePrice instead, which is why Xiaomi 14 and 14 Ultra were over-quoted, and the page label showed no RAM. They now use `"12 GB/512 GB"`-style variants. The Samsung S-series rows stay storage-only because Cashify lists them that way, and they resolve today (`scripts/pricing/list-storage-only-variants.ts`).
- **Images:** `public/images/models/xiaomi-15.png` and `xiaomi-15-ultra.png` don't exist anywhere in the repo. The assets are needed.

## Tools

| Command | What it does |
|---|---|
| `npm run pricing:calibrate` | Runs the 18 benchmark cases through the real quote service (no DB). Exits 1 outside ±3%. |
| `npx tsx scripts/pricing/fit-inr-tables.ts` | Derives retention and D1/D2 per model, and the spread within each group, from combo 0/1/2 captures. |
| `npx tsx scripts/pricing/snapshot-quotes.ts --compare docs/pricing-calibration/regression-before.json` | Cross-brand before/after table. |
| `npm run test:pricing:inr-deductions` | Unit tests: worst-of, cap, additivity, ₹10 rounding, monotonicity, guardrails, disabled = unchanged. |

## Iteration log

| # | Change | Max \|err\| | Mean \|err\| | Failing |
|---|---|---|---|---|
| 0 | Baseline (percentage model) | 38.8% | 15.4% | 17 / 18 (Xiaomi 14 / 14 Ultra unresolvable) |
| 1 | Variant fix, ₹ engine added (off) | 38.8% | 15.4% | 17 / 18 (14 / 14 Ultra now resolve but have no Get Upto) |

## Open data (owner)

1. Cashify Get Upto for **Xiaomi 14 12/512** and **Xiaomi 14 Ultra 16/512**.
2. One **clean / warranty No / bill Yes / original box** Cashify quote for each of the 9 variants. This pins the per-model retention independently, so that D1 = C0 − C1 and D2 = C0 − C2 are measured rather than fitted.
3. Get Upto values are from 2026-09-20. If any moved by 2026-10-01, please send the current figure with the captures.

## Assumptions still unconfirmed (need more Cashify samples)

- **Local display adds to display defects and is capped at a screen replacement.** The alternative is worst-of. Combo 1 only shows the total.
- **The split inside Combo 2:** >2 screen scratches vs charging port. Only their sum is observed; the old 60 : 40 ratio (0.15 : 0.10) is kept.
- **Touch failure = one screen replacement**, the same as cracked glass.
- **Body damage simply adds** under this model. The old model's 0.327 overlap between a local display and body damage is not carried over.
- **Every uncalibrated answer** (cameras, battery, body, Wi-Fi, …) is the old percentage taken at the group anchor.
- **Box bonus stays ₹380.**

## Next captures to pin individual weights (one flagship + one Redmi each)

1. Only "screen not original" (local display), everything else clean. Splits localDisplay from display defects and tests the cap.
2. Only "charging port not working". Splits Combo 2.
3. Only "more than 2 scratches on screen". Gives a second check on the Combo 2 split.
