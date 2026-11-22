# Pricing deep audit and fixes (22 November 2026)

Branch `claude/pricing-deep-audit-20261122`, built on `main` 10b1919. Asked by the owner after the Tecno release: "do heavy analysis ... make a great plan ... fix this finally".

## What was audited

Every private runner corpus the owner supplied (Nothing, OnePlus, Samsung, Google, Xiaomi, Honor, Asus, Lenovo, Nokia, POCO, Motorola, Oppo, Infinix, Tecno): **71,026 primary Cashify quotes** across 14 brands, plus the October iPhone corpus (2,285 rows, 1,885 with two or more answers changed).

1. **Live-site replay.** Every quote ran through the production pricing service configuration (hybrid mode, release routes, production questionnaire profiles read from the database), at the test-day reference and at today's stored reference. Read-only: `scripts/pricing-evidence/audit-all-measured.ts`.
2. **Cross-brand structure.** Every single-answer quote became one (brand, answer, reference, deduction) point (68,799 points): `cross-brand-deductions.ts`.
3. **Combination behaviour** from the iPhone corpus (243 combinations whose single answers were all measured).

## Findings

| # | Finding | Effect on customers | Fixed here |
|---|---|---|---|
| 1 | Measured brands: 100% of test quotes reproduce within ₹20 through the live service; at today's references 93.5–100% within 3% | Single answers on measured phones were already right | — |
| 2 | Vivo, Realme, iQOO, LG and Ai+ (and untested models of measured brands) used the old brand calculators. Predicting each measured brand with them: **12.4% mean error, only 23% within 3%, and 32–91% of quotes overpaid by more than 5%** | Biggest error on the site, about 25% of the catalog | Yes: generic rules |
| 3 | Cashify uses **one rule set per regime** for all Android brands: "newer" phones (questionnaire asks warranty/bill/age) and "older" phones. Within a regime each deduction is a share of the reference that depends only on the reference (Wi-Fi 30% / 40%, fingerprint 20% / 26%, age 11% / 14% / 24%, bent 37% / 18%) | Makes it possible to price untested phones from the reference | Used for #2 |
| 4 | On ~320 models tested at one storage, answers Cashify charges as a **percentage** (Wi-Fi, Bluetooth, fingerprint, hinge, age, bent, loose, panel, dents and screen scratches on newer phones) were stored as **fixed rupees**: one reference cannot tell the two apart | Those deductions stayed frozen when the weekly refresh moved the reference; error grows with time (Honor references already moved up to 32%) | Yes: 2,611 rules converted |
| 5 | Repairs (cameras, display, battery, ports, speaker) are **fixed rupee amounts per model** on 99% of multi-storage models | Correct as stored | — |
| 6 | Combinations: on iPhone, answers add up (203 of 243), screen glass with display faults counts once (28), cracked glass with body/panel faults is charged less than the sum (12). **Cashify never charged more than the sum.** Android has only 164 multi-answer quotes (screen pairs) | The engine's combination rule (add; screen faults and panel faults count once) matches or pays slightly less; it never overpays on the evidence | No change; needs Android combination runs to close |
| 7 | ROG Phone II 8/128 and CMF Phone 2 Pro 8/128 were removed on 19 Nov as unpriced; Cashify buys both at pages with typo addresses (`rog-phonr`, `phoe-2-pro`) that the owner's runs used | Two measured phones were not quotable | Yes: restored |

## Fix 1: generic Android rules (`lib/pricing/cashifyRunnerModel/generic.ts`)

- `calibration.generic.json`: per regime and answer, the deduction share as a curve over log(reference) at 11 knots (₹1,500 to ₹1,00,000), from per-brand medians so no brand dominates (`fit-generic-android.ts`).
- Phones without a measured profile are priced through the same `evaluateRunner` as the measured brands: same combination rules, scrap floor, forced age on cracked glass/panel/bent, fail-closed answers.
- Regime from the crawled questionnaire (warranty asked = newer). If unknown, both are priced and the **lower** is paid.
- Accessories from the walked questionnaire (box/charger asked or not).
- The quote page now offers all four age brackets for these phones (they are all priced).

Leave-one-brand-out, end to end (curves fitted without the brand they predict; `validate-generic-android.ts`):

| Brand predicted | Generic mean error | Generic within 3% | Old calculators mean error | Old within 3% |
|---|---:|---:|---:|---:|
| Infinix | 2.8% | 75% | 15.8% | 13% |
| OnePlus | 3.5% | 73% | 9.1% | 36% |
| Oppo | 3.6% | 71% | 11.2% | 25% |
| POCO | 3.8% | 72% | 9.4% | 20% |
| Motorola | 3.9% | 72% | 12.4% | 25% |
| Honor | 4.1% | 63% | 23.8% | 13% |
| Nothing | 4.1% | 76% | 6.6% | 35% |
| Google | 4.2% | 68% | 8.0% | 23% |
| Nokia | 4.2% | 62% | 25.3% | 4% |
| Xiaomi | 4.2% | 67% | 11.8% | 20% |
| Samsung | 4.4% | 66% | 12.5% | 24% |
| Tecno | 4.8% | 63% | 13.8% | 17% |
| Lenovo | 5.5% | 56% | 33.7% | 10% |
| Asus | 8.7% | 61% | 16.7% | 30% |
| **All** | **4.0%** | **69%** | **12.4%** | **23%** |

The largest remaining error is display repairs on older phones: Cashify's screen cost follows the part, not the phone's price, so no reference-only rule can know it for an untested model. Measured data for a brand removes this (as for every brand above).

## Fix 2: percentage-type rules follow the reference

`convert-percentage-rules.ts`, applied inside `fitCalibration` so refits reproduce it. A fixed rule on a percentage-type answer becomes a percentage only where the percentage reproduces every storage it was measured on within ₹10; 519 rules stay fixed because the model's own data says fixed (mostly Samsung, whose deductions are percentages of a hidden per-storage base). Result: all 71,026 measured quotes still reproduce within ₹20 at their test-day reference (2 disclosed OPPO A5 age rows unchanged), and where today's reference has moved, mean error falls (Honor 4.0% → 3.6%, Infinix 2.2% → 1.8%, Tecno 2.8% → 2.5%).

## Price changes against main

Row-by-row over the whole catalog at references ₹20,000 and ₹50,000 with nine conditions each:

- Apple, Nothing, Nokia, Honor, Asus and Lenovo: unchanged.
- Vivo, Realme, iQOO, LG and Ai+: every row changes (generic rules replace the old calculators). A perfect phone now quotes exactly the Get Upto basis.
- Other measured brands: only models without a profile (now generic) and percentage-type rules evaluated far from their measured reference change.

## Still open (needs owner data)

1. **Android combinations.** The rule never overpays on the iPhone evidence, but Android multi-answer prices are not measured. A combination round (the `docs/next-quotes/*-combinations.md` plans) would confirm or tighten it.
2. **Vivo, Realme, iQOO, LG, Ai+ measured runs.** Generic rules are about 4% off on average; brand runs bring them to the ₹20 level of the measured brands, especially for display repairs.

## Verification

- `node --import tsx scripts/pricing-evidence/audit-all-measured.ts <env> data/pricing-evidence/audit-2026-11-22` then `summarize-production-audit.ts` (read-only database access).
- `node --import tsx scripts/pricing-evidence/fit-generic-android.ts [--write]` (leave-one-brand-out table) and `validate-generic-android.ts` (end to end).
- `node --import tsx scripts/pricing-evidence/convert-percentage-rules.ts` (dry run) and `replay-runner-corpora.ts`.
- Tests: `pricing.all-corpora-replay.test.ts`, `pricing.generic-android.test.ts`, the updated `pricing.age-answer`, `pricing.runner-reconciliation` and `pricing.samsung-pixel-isolation` tests, and the offline suite.

Private corpora and audit outputs stay out of the public repository.
