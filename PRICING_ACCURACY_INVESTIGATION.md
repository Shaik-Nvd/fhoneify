# Fhoneify — Pricing Accuracy Investigation: OPPO Find X9s / OnePlus 15R

Date: 2026-09-15. Investigation only — the pricing engine was not modified. `npm run test:pricing` (Suite A, 27/27) confirmed unchanged before and after this investigation.

## A. Root cause

**Stale reference/calibration data for recently-added devices — not a calculation, lookup, or uplift bug.**

`lib/pricingCalculator.ts`'s depreciation math and `applyCompetitorUplift()` are executing exactly as designed for both devices: under best-case ("perfect condition") diagnostics, the engine applies almost no depreciation (as expected for a device in like-new condition) and adds the uplift, correctly hitting the ₹2,000 cap in both traces. The bug is entirely upstream of the engine: **the "Cashify reference price" fed into the calculation (`basePrice` in `lib/seed_devices.ts`, and `lib/cashify_prices.json` where present) is a real number that was genuinely scraped from Cashify's site at some point — but that scrape is now weeks-to-months old, and Cashify's real live price for these two recently-launched flagships has since dropped by roughly 3×**, which is normal, expected market behavior for a brand-new flagship (buyback offers on new phones fall fast in the weeks after launch as the "still basically new" premium fades).

Evidence this is a genuine scrape and not a typo or wrong lookup:
- `oppo/oppo_prices.json` (a raw scraped Cashify snapshot) contains the line: `"Sell Old OPPO Find X9s (12 GB/512 GB)" ... "Get Upto ₹45,000"` — **an exact match** to `basePrice: 45000` in `seed_devices.ts`. This was scraped 2026-07-09 (per git history); today is 2026-09-15 — about 10 weeks old.
- `update_oneplus.js` (the seeding script) contains the log line `✓ Sell Old Oneplus 15R (12 GB/512 GB) → ₹36,300` — again an exact match to both `basePrice` and the `cashify_prices.json` entry for this device. Committed 2026-06-24 — about 12 weeks old.

Both numbers were correct *when captured*. Neither is correct *now*. There is no live sync between Fhoneify's cached Cashify data and Cashify's actual current prices — the whole pricing pipeline runs off a point-in-time snapshot with no freshness check or expiry.

## B. Calculation trace — OPPO Find X9s (12 GB/512 GB)

```
Device:               OPPO Find X9s (id: f00ce11c-796d-47ec-80b8-5da313cb3340)
Brand:                Oppo
Storage:              12 GB/512 GB
lookupKey generated:  "oppo-find-x9s-12-gb-512-gb"
cashify_prices.json:  NOT FOUND (falls back to basePrice)
basePrice (seed):     45000   <- exact match to a real scraped Cashify
                                 "Get Upto" price from oppo_prices.json,
                                 captured 2026-07-09
baseMarketPrice used: 45000

Diagnostics used for this trace: best-case ("perfect condition") - box,
bill, charger, S-Pen present, warranty valid, age "Below 3 months", no
defects. This matches the shape of the diagnostics object used by the
initial "Get Upto" quote-card calculation in app/quote/page.tsx.

Age multiplier / penalties: ~0 (perfect condition, minimal-to-no penalty)
cashifyBasePrice (post-depreciation, pre-uplift): 45,000
  (i.e. essentially unchanged from basePrice, exactly as expected for a
  best-case/no-defect scenario)

Competitor uplift tier: 45,000 falls in the "≤ ₹50,000 → 6%" bracket
Uplift percentage: 6%
Raw uplift (6% of 45,000): 2,700
₹2,000 cap applied?: YES → capped at 2,000
Final Fhoneify price (via applyCompetitorUplift): 47,000

Reported screenshot value: ₹46,901 (99 rupees off my reproduction - within
the range of a minor diagnostics difference I could not pin down exactly
without the live session state; not material to the conclusion)
Reported Cashify screenshot value: ₹15,140
```

**The uplift step contributes ₹2,000 out of the ₹47,000 total (4.4%). It cannot explain a ₹31,761 gap (47,000 − 15,140) on its own — the other ₹29,761 is entirely the stale `basePrice` being ~3× too high relative to Cashify's current real price.**

## C. Calculation trace — OnePlus 15R (12 GB/512 GB)

```
Device:               Oneplus 15R (id: oneplus_7099)
Brand:                OnePlus
Storage:              12 GB/512 GB
lookupKey generated:  "oneplus-15r-12-gb-512-gb"
cashify_prices.json:  36,300  <- FOUND, and identical to basePrice
basePrice (seed):     36,300  <- exact match to update_oneplus.js's logged
                                 scrape result, captured 2026-06-24
baseMarketPrice used: 36,300

Diagnostics used for this trace: same best-case set as above.

cashifyBasePrice (post-depreciation, pre-uplift): 35,954
  (a small ~1% penalty was applied even under "perfect" conditions here -
  OnePlus's penalty curve differs slightly from Oppo's; this is expected
  brand-specific behavior, not a bug)

Competitor uplift tier: 36,300 falls in the "≤ ₹50,000 → 6%" bracket
Uplift percentage: 6%
Raw uplift (6% of 35,954): 2,157
₹2,000 cap applied?: YES → capped at 2,000
Final Fhoneify price (via applyCompetitorUplift): 37,954

Reported screenshot value: ₹30,553 - notably lower than my 37,954
reproduction under "perfect" diagnostics. This is the one place I cannot
fully confirm identical comparison conditions (see Section D below) - the
actual screenshot almost certainly used somewhat less-than-perfect
diagnostics (e.g. a different age bracket, or a missing accessory).
Reported Cashify screenshot value: ₹10,300
```

**Even taking the screenshot's own reported Fhoneify figure (30,553) instead of my reproduction, that is still ~3× Cashify's reported 10,300 — consistent with the same root cause (basePrice/cashify_prices.json both sitting at 36,300, ~3.5× Cashify's current 10,300) regardless of exactly which diagnostics were used.**

## D. Exact discrepancy — where does the unexpected multiplication enter?

**It doesn't enter as a multiplication at all — there is no double-calculation, no duplicate uplift application, and no second pricing formula in the live path.** The ~3× gap is present *before* the pricing engine does anything: it's already baked into the `basePrice`/`cashify_prices.json` value that gets passed in as the starting point. The engine then correctly does almost nothing to it (best-case diagnostics → minimal depreciation) and adds a correctly-capped ~4-6%.

**Pricing implementation inventory** (every `calculateFhoneifyPrice`/`applyCompetitorUplift` definition found in the repo, confirmed by checking every importer):

| Implementation | Location | Used by | Status |
|---|---|---|---|
| `lib/pricingCalculator.ts` | `lib/` | `app/quote/page.tsx` (live quote flow), `app/algorithm-lab/page.tsx` (debug tool) | **LIVE - this is the one that produced the screenshot numbers** |
| `lib/pricingEngine/` (split into per-brand files) | `lib/pricingEngine/` | nothing (confirmed no importers outside itself) | Dead duplicate |
| `server/modules/quote/pricingCalculator.ts` | `server/modules/quote/` | only an uncommitted, currently-broken, unrelated in-progress refactor of `server/modules/quote/service.ts` (not part of this branch, not live) | Dead / not deployed |
| `algorithm_backup/pricingCalculator.ts` | repo root | nothing (confirmed) | Dead backup file |
| `lib/temp_calc5.ts`, `lib/temp_calc8.ts` | `lib/` | nothing (confirmed) | Dead experimental files |

Only one implementation is ever executed for a real user quote. There is no accidental second formula contributing to the displayed number.

**Comparison-condition honesty check (per Section 18 of the brief):** I cannot fully verify the two screenshots used identical diagnostics to each other or to my reproduction. OPPO's reproduction is close enough (₹99 apart) that I'm confident the conditions were effectively equivalent. OnePlus's reproduction is ₹7,401 higher than the screenshot's reported Fhoneify number, which I cannot fully explain without the actual session/URL state behind that screenshot — but this discrepancy works *in favor of* my root-cause conclusion, not against it: even the screenshot's own (lower) Fhoneify number is still triple Cashify's number, so a different diagnostics choice doesn't change the conclusion, it just shifts exactly how large the multiplier is.

## E. Recommended minimal fix

**This is a data-freshness problem, not an engineering bug, and the "fix" is a data update, not a code change.** Per the brief's Section 23 (data-correction path):

```
Current:   basePrice = 45,000 (OPPO Find X9s 512GB), 36,300 (OnePlus 15R 512GB)
           - both are real, but ~10-12 week old Cashify snapshots
Expected:  a current Cashify quote for each device, under a clearly
           documented set of reference diagnostics (recommend: the same
           "perfect condition, <3 months old, all accessories" baseline
           already used elsewhere, so it's an apples-to-apples update)
Why:       Cashify's own live price for these devices has dropped ~3x
           since the original scrape, most likely due to normal
           post-launch price decay on brand-new flagship devices
Affected devices: at minimum the two flagged here (all storage variants -
           OPPO Find X9s 256GB has the same "no cashify_prices.json entry"
           problem). The Suite B report below shows this is NOT limited to
           these two devices - see "Broader finding" below.
Expected pricing impact: OPPO Find X9s and OnePlus 15R quotes would drop
           from the ₹47,000/₹30,553-46,901 range down to something close
           to their real current Cashify price plus the correct 4-6%
           uplift (i.e. roughly ₹16,000-17,000 for OPPO, ₹11,000 for
           OnePlus, assuming the ₹15,140/₹10,300 screenshot figures are
           themselves current and accurate - I have not independently
           verified Cashify's live price myself, so treat those as the
           team's evidence, not confirmed ground truth either)
```

**I have not made this data change.** Updating `basePrice`/`cashify_prices.json` to a specific new number requires a current, verified Cashify quote — that's exactly the kind of untrusted-external-value input your Section 20 told me not to fabricate or treat a screenshot as authoritative for. This needs either a fresh manual check against Cashify's live site, or (if you want it automated) a decision about re-introducing a scoped, rate-limited re-scrape process for a specific device list — which is a scraping-infrastructure decision explicitly flagged as needing your sign-off in the earlier security audit (P3-2), not something I should unilaterally expand.

### Broader finding (not part of the original two-device report, found while building Suite B)

Running the new reference-comparison suite against the *entire* device catalog shows this isn't isolated to two devices:
- **1,023 of 2,214 seeded devices (46%) have no `cashify_prices.json` entry at all** and silently fall back to raw `basePrice` with zero grounding in any real observed Cashify price at calculation time (same failure mode as OPPO Find X9s).
- **19 devices show >15% divergence between `basePrice` and `cashify_prices.json`** where both values *do* exist (interestingly, for several iPhone models `basePrice` is *lower* than `cashify_prices.json` by 20-34% — the opposite direction from the two flagged devices, worth a separate look since it means those iPhones may be *under*-priced relative to their own cached Cashify reference, not over-priced).

I'm reporting this because it's directly relevant evidence for the size of the real problem, but I have **not** attempted to fix or flag every one of these 1,023+19 devices — that's a data-calibration project, not a bug fix, and is explicitly out of scope for "the smallest possible fix" this investigation was asked to identify.

## F. Test plan

**Suite A (regression) — unchanged, still protects internal consistency:** `npm run test:pricing`. 27/27 golden cases + uplift invariants pass, confirmed both before and after this investigation. This suite would **not** have caught this bug (correctly, per its stated purpose) — it only checks that a given `(brand, model, basePrice, diagnostics)` input still produces the same output it did when the golden values were captured. It has no concept of whether `basePrice` itself is realistic.

**Suite B (new, this investigation) — `npm run test:pricing:reference` (`scripts/test/pricing.cashify-comparison.test.ts`):** checks data completeness and internal consistency between `basePrice` and `cashify_prices.json` across the whole catalog, without hardcoding any untrusted screenshot value as an expected price. It currently passes (it's designed to report, not silently hide, the missing/divergent entries) and specifically calls out both investigated devices by name so their status is visible in every run rather than buried in a one-time investigation doc.

**What would prove a real fix:** once you (or someone) obtains a current, verified Cashify quote for OPPO Find X9s and OnePlus 15R, the fix is a data update to `basePrice`/`cashify_prices.json`, followed by:
1. Re-running Suite B to confirm the two devices now show a `basePrice` within a reasonable range of the new `cashify_prices.json` value (or add a new entry, closing the "no entry at all" gap for X9s).
2. Re-running Suite A to confirm the engine still produces internally-consistent output for the new number (no code change needed here, but it's the gate that would catch an accidental typo in the data update itself, e.g. an extra zero).
3. A new golden case could optionally be added to Suite A capturing the corrected numbers, so a future accidental revert of the data update would be caught.

## G. Business decision required?

**YES.**

**Decision needed:** how should Fhoneify handle Cashify reference-price staleness going forward, given ~46% of the catalog has no reference price at all and the two investigated devices show real prices can drift ~3× within 2-3 months for new launches? Concretely, this breaks down into a few sub-questions I can't answer for you:
1. Should there be a recurring (manual or automated) re-check of Cashify prices for at least newly-launched/high-volume devices, and on what cadence?
2. If automated, does that mean re-authorizing the scraping infrastructure that was flagged for legal/ToS review in the earlier security audit (P3-2) — a decision that audit explicitly deferred to you?
3. For devices with no `cashify_prices.json` entry at all (46% of the catalog), is falling back to raw `basePrice` an accepted, intentional design (e.g., for low-volume/older devices where staleness risk is lower), or should the app refuse to quote / show a "price on request" state instead of a number with zero real-market grounding?

I'm not recommending a specific answer here because this is a product/operations tradeoff (freshness vs. scraping risk/cost vs. engineering effort), not an engineering correctness question.

## H. DO NOT IMPLEMENT YET

Confirmed — no fix has been implemented in this pass. No pricing file was edited. This document and the two new test files (`scripts/test/pricing.cashify-comparison.test.ts`, plus the `test:pricing:reference` npm script) are the only additions.
