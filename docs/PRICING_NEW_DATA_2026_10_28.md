# Reference-driven iPhone pricing from the 2026-10-28 Cashify data

Implements `scratch/new-data-audit-2026-10-28/CLAUDE_HANDOFF.md`. The approved bonus is unchanged:
`quote before the Fhoneify fee = round(C + min(R x tier(R), 2000))` with R the database reference, C the Cashify condition equivalent,
tier 8% (R <= 20,000) / 6% (<= 50,000) / 4%, INR 100 floor; nonpayable outcomes still require inspection.

## What changed

1. **Import** (`scripts/pricing-evidence/import-new-data.ts`, `data/pricing-evidence/new-data-2026-10-28/`). The audited case records become
   measurements with asserted counts (6,795 records: 5,218 priced = 4,948 iPhone + 270 Samsung; 1,396 pending; 181 unavailable).
   Pending/unavailable records are never priced, Samsung is kept but not fitted, exact repeats inside one report count once (318),
   and 9 quotes carrying a fault choice that changed nothing at one capacity but is priced at others (SE 2022 256 GB fingerprint)
   are flagged as unavailable-option controls and kept out of fitting. The old normalizer now fails when archives yield no records.
   Result: 4,630 new iPhone measurements + 2,285 earlier = 6,915.
2. **Reference proxy and clean offset.** Each record is evaluated at its own report's flawless quote. Against the database references
   (all FRESH, verified 2026-10-25 07:00 UTC, read-only) the flawless base equals R for every model except a fixed gap of INR 400
   (iPhone 11, 11 Pro Max) and INR 150 (iPhone 7, 8, 8 Plus) (`db-reference-gaps.json`); that gap is the model's `cleanOffset`.
3. **Rules** (`lib/pricing/appleCashifyModel/model.ts`), all learned per model (`fitCalibration.ts` -> `calibration.json`):
   - a value per condition code, fixed rupees or a share of R, decided by the model's own capacities (front/back camera, battery,
     Wi-Fi, Face ID ... are no longer forced through one template ratio); codes a model never measured take the model's own class
     codes through the template ratio, else the three models with the nearest reference, scaled to this model's R (labelled inferred
     with their basis);
   - repair groups charged once (largest screen deduction; body/panel shared), functional faults add up (verified: pairs of functional
     faults equal the sum of the singles on every combination report);
   - age/warranty/bill: applied once; which screen/panel answers force the aged state is learned per model (iPhone 14 panel damage does
     not); models whose quotes never exercise the age flow (iPhone 14/14 Pro reports record warranty "yes" but the live questionnaire
     profile says the question is not asked) have no age law;
   - missing box everywhere, missing charger only where the model's form asks it (X, XR, XS, XS Max, 11 Pro, 7 Plus: about INR 300),
     seeded from controlled box/charger pairs;
   - Cashify's minimum: on aged phones with a functional fault (iPhone 15 generation on), and for models without an age question when
     two or more functional faults are present (iPhone 6/6S/SE 1st gen at 22.6-22.8% of R; a single fault can quote below it);
   - scrap quote for a phone that cannot make calls: measured per model (INR 1,200; SE 2022 INR 800).
4. **Serving uses the rules, not cached prices.** The recorded-quote index (`exact.ts`) answers only when a caller opts in
   (`useRecordedQuotes`, tests/fixtures); the production service never sets it. `config/pricing-release.json` turns the captured
   final-price cache off (`exactFinalQuoteCache: false`). Every quote therefore follows the current R.
5. **Coverage.** All 46 catalog iPhone models / 151 variants are priced by the rules. iPhone 12 Mini has no quotes of its own and is
   priced with the iPhone 12 values (same generation) at its own reference, every value labelled inferred (`scope.json fallbackFrom`).
6. `PRICING_ENGINE_VERSION` = `fhoneify-pricing/2026-10-28-reference-bonus-v1+apple-reference-rules-v3+legacy-physical-v1+payout-ceiling-v3`.

## Accuracy

The model structure (per-code values, additive functional faults, learned age triggers, floors) was chosen after looking at the audit
summaries and in-sample residuals, so held-out numbers are honest about parameter estimation and optimistic about structure.
Grouping for every split: model + exact deviation set (all capacities, dates, repeats and mirrored exports of one condition stay on
one side); prices are never used to form partitions.

`scripts/pricing-evidence/validate-new-data.ts` (each protocol refits on its training rows only; rules alone, no recorded prices),
6,854 complete quotes; results in `data/pricing-evidence/validation-2026-10-28/`:

| Protocol | Held out | Existing engine MAE (median) | Rules MAE | median / p90 / p95 | within INR 500 | priced |
|---|---|---:|---:|---|---:|---:|
| p1 | unseen condition shapes (5 folds) | INR 6,052 (1,979) | **INR 287** | 0 / 590 / 1,160 | 89.2% | 6,808 / 6,854 |
| p2 | unseen capacity (each rank of models with 3+ capacities) | INR 6,102 (2,035) | **INR 126** | 0 / 20 / 70 | 97.1% | 6,563 / 6,608 |
| p3 | later session: fit on the earlier collection, test 25-28 Oct | INR 7,467 (5,004) | **INR 867** | 10 / 3,780 / 5,620 | 76.3% | 1,781 / 1,781 |
| p4 | whole model unseen (zero-shot from other models) | INR 6,052 (1,979) | **INR 1,043** | 300 / 2,530 / 4,220 | 61.4% | 6,793 / 6,854 |

Unpriced rows are inspection outcomes (Cashify-declined or contradictory: calls failure with other faults, 10+ faults); all 51 recorded
Cashify no-offers remain no-offers. p3 is the hardest honest check of the earlier models (the reports of 25-28 Oct differ in session,
reference and sometimes flow from those of 16-24 Oct). p4 bounds the error of the iPhone 12 Mini fallback (zero-shot, median INR 300).
Per-model figures: `validation-2026-10-28/coverage.md`; scope decision (owner rule of 2026-10-25: the rules serve a model when they
beat the existing engine on the same held-out quotes): all 45 measured models enabled, plus the 12 Mini fallback.

**In-sample, through the production quote service** (`replay-service.ts`, hybrid mode as committed, each quote at its recorded R):
6,854 complete quotes, 6,809 priced, 45 inspection (calls failure with other faults, or ten or more simultaneous faults, which Cashify
mostly declines), MAE INR 24, 96.0% within INR 20, 98.0% within INR 100; 71 residuals above INR 300 and the 45 inspections (listed in
`validation-2026-10-28/in-sample-exceptions.jsonl` with source pointers). Approved bonus arithmetic: 0 mismatches.
The handoff's single-fault table (12, 13, 15 Pro Max, 16, 16 Pro, 18 Pro; front/back camera, battery service, battery 80-85%) is reproduced
exactly at every supplied capacity; iPhone 16 Wi-Fi 16,500/17,100/17,400 within INR 60.

## Remaining exceptions (in-sample, largest)

- 18 Pro Max 256/512/1 TB body-cosmetic combinations (C02 C04 ...): body codes were measured only on 2 TB; INR 2,400-8,050 too low.
- iPhone 15 / 15 Plus / 17e touch + non-original + cracked + panel combinations: INR 2,200-6,300 (few quotes; Cashify fixes only the sum).
- 16e / 15 touch failure alone vs touch + battery recorded on different days: INR 800-2,000 either way.
- 11 Pro / 11 Pro Max non-original screen with functional faults (combination reports only): INR 1,000-2,200.

## Tests

`pricing.new-data-import` (counts, unsupported formats, duplicate leakage), `pricing.apple-reference-rules` (handoff deductions, Wi-Fi
scaling, per-model camera ratio, reference up/down, recorded condition moves with R, clean offset, age once, repair-group overlap,
box/charger, every catalog variant priced, 12 Mini inferred, unrecorded combinations/capacities, inspection, served arithmetic),
`pricing.apple-evidence-service-reconciliation` (all supplied quotes through the service), `pricing.apple-evidence-exact` (the recorded
index as an opt-in fixture; serving never uses it).

## Follow-up (28 Oct, after release)

- Bonus cap: commit 8638714 (INR 1,000 cap) entered main with PR #23 without approval; 35a123e restored the owner-approved INR 2,000 cap.
- Repair safety (`evaluateAppleEvidence`): an answer set is never quoted above the same phone with the added physical damage removed, or with a
  physical answer replaced by its milder option (heavier scratches/spots/dents, missing vs broken panel, bent frame next to scratches). Inferred
  values could otherwise invert the order. No recorded Cashify quote changes because of it.
- iPhone 512 GB out-of-warranty: the historical captured-quote router no longer bypasses the fitted rules for models the rules cover; 27 recorded
  quotes move by at most INR 740 (in-sample service MAE INR 24 -> 25).
- Pricing suites: all 62 pass offline (14 were failing on 24336be with pre-release expectations). Expectations now derive from the current
  rules and the approved bonus arithmetic, not from retired legacy prices; no accuracy threshold was widened. The catalog property sweep
  (1,517,834 quotes) has 0 blocking failures; its 72 allowed rises are Cashify's minimum quote activating and equal the calibrated floor.

## Live random check against Cashify (28 Oct, seed 19522)

Five iPhones drawn at random from the 46-model catalog with random answers, quoted on the live API and on cashify.in (owner's logged-in
session, no order placed). C = Fhoneify final - min(R x tier, 2000); Cashify = base price on its quote page.

| Device and answers | Fhoneify final | Fhoneify C | Cashify base | Gap |
|---|---:|---:|---:|---:|
| iPhone 16 Plus 256 GB, 1-2 body scratches, no box (in warranty, <3 months) | 53,540 | 51,540 | 51,540 | 0 |
| iPhone 11 Pro Max 256 GB, speaker, 1-2 minor dents, box, no charger | 18,979 | 17,480 | 17,260 | +220 |
| iPhone 14 Pro 512 GB, Face ID, 1-2 minor dents, box, single eSIM | 35,000 | 33,000 | 33,300 | -300 |
| iPhone 8 256 GB, speaker + front camera, 1-2 screen and body scratches, no box/charger | 4,752 | 4,260 | 4,590 | -330 |
| iPhone 6S 16 GB, flawless, box, no charger | 2,246 | 2,080 | 2,060 | +20 |

Finding fixed afterwards: the INR 400 / 150 "clean offset" of the iPhone 11 / 11 Pro Max / 7 / 8 / 8 Plus is Cashify's original-charger answer
(iPhone 11 Pro Max, same faults: charger yes 17,660, no 17,260). It is now a missing-charger deduction, so a customer who has the charger is no
longer under-paid by it. The INR 20 gap on the iPhone 6S is the same question at a smaller amount and is not modelled.

### Closing the remaining gaps (follow-up live quotes, 28-29 Oct)

Single-condition Cashify quotes on the same three phones (`data/pricing-evidence/live-check-2026-10-28.jsonl`, written by
`scripts/pricing-evidence/live-check-2026-10-28.py`) located each gap:

| Variant | Single condition (box, charger where asked) | Cashify deduction | Rules before | Now |
|---|---|---:|---:|---:|
| iPhone 8 256 GB | speaker | 200 | 200 | 200 |
| iPhone 8 256 GB | 1-2 screen scratches | 410 | 400 (inferred) | 410 |
| iPhone 8 256 GB | 1-2 body scratches | 0 | 340 (inferred) | 0 |
| iPhone 11 Pro Max 256 GB | 1-2 minor dents | 680 | 460 (inferred) | 680 |
| iPhone 14 Pro 512 GB | Face ID | 12,000 from the 46,500 flawless quote | 12,000 | 12,000 |

The iPhone 14 Pro gap is not a deduction error: Cashify's flawless quote for that variant is INR 46,500 today while its public Get Upto (the
stored reference) still shows INR 46,100; at 46,500 the rules give Cashify's 33,300 exactly. It closes when the reference refresh picks up the
new price. These live quotes are added to the fit (11 rows; the 6S INR 20 row is documented only) and asserted in pricing.apple-reference-rules
(all within INR 20). The charger amounts of the iPhone 11/7/8 families are now fixed deductions, not fitted ones.

### Second random check (seed 43871, 29 Oct)

| Device and answers | Fhoneify C at release | Cashify base | Cause | After refit (at Cashify's price) |
|---|---:|---:|---|---:|
| iPhone XS Max 256 GB, volume button, no box/charger | 12,000 | 11,940 | volume button inferred 238, Cashify 300 | 11,940 |
| iPhone 17 512 GB, back camera, >2 screen + 1-2 body scratches | 48,280 | 49,030 | reference lag only (Get Upto 67,700 stored, 68,500 now) | 49,030 |
| iPhone 14 Plus 512 GB, Face ID + microphone, 1-2 dents | 22,160 | 21,890 | dents inferred 595, Cashify 880 | 21,890 |
| iPhone 7 256 GB, speaker + mic, >2 screen + 1-2 body scratches, no box/charger | 2,790 | 3,050 | 1-2 body scratches inferred 260, Cashify 0 | 3,050 |
| iPhone 17 Pro 256 GB, mic + battery 80-85%, >2 screen scratches | 89,920 | 90,820 | screen 10,023 / mic 1,000 / battery 1,560 inferred; Cashify 8,820 / 600 / 1,260 (Get Upto 102,500 stored, 101,500 now) | 90,820 |

Fit change: a quote that changes exactly one ordinary condition from the flawless one (a missing box or charger alongside allowed) now carries
5x weight in the joint refinement, so a clean single is not outvoted by several large mixed combinations; touch failure, non-original or cracked
screen and panel damage are excluded because Cashify's age flow and minimum make their combinations non-additive. In-sample against the
release before it: MAE INR 25.5 -> 24.5, within INR 100 97.8% -> 98.1%. All 23 live quotes are asserted in pricing.apple-reference-rules.
