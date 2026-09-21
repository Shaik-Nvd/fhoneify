# Pricing final repair — engineering record

Branch `fix/pricing-final-repair`. Written 2026-09-21. This is also the pull
request description; the PR was not opened from this machine because `gh` is
not authenticated here.

---

## 1. Original root cause

Accurate Supabase/Cashify references still produced bad customer prices because
the damage was **downstream of both the reference data and the condition
engine**, in age depreciation.

`calculateOppoPrice` and `calculateVivoPrice` tested the age answer with
`includes("3") && includes("6")`-style checks that `"above11"` never matches,
and neither had an "above 11 months" branch. An old phone therefore kept the
**brand-new** multiplier — Oppo 0.98, Vivo 1.0 — a *better* multiplier than a
6-month-old phone gets.

Oppo was worse. It never read `diagnostics.warranty` at all, and the quote page
has no Oppo case in `isWarrantyEligible()`, so it always sends
`warranty:false, validBill:false, mobileAge:'above11'`. That made **0.98 the
only reachable Oppo multiplier in production**, and all 152 Oppo devices above
₹5,000 were quoted **above their own undamaged market reference price** —
109.1% of reference on average, against 80–97% for every other brand.

The internal `cashifyEquivalent` was never the problem: its MAE against the
eight manually verified Cashify observations is ₹370.

## 2. Price pipeline

| Stage | Status |
|---|---|
| ReferencePrice resolution | PASS — unchanged; now served from memory |
| Answer normalisation / mapping | PASS — verified against every UI value |
| Age + warranty adjustment | **FIXED** — Oppo and Vivo ignored the age answer |
| Screen / body / functional condition | PASS — wired for every brand |
| Accessories | PASS (see known gap 5) |
| cashifyEquivalent | PASS — MAE ₹370 |
| Uplift (8/6/4%, ₹2,000 cap) | PASS — untouched |
| Signed final price | PASS |
| Displayed payout | PASS — server-signed only (see known gap 3) |

## 3. Business invariant

`scripts/test/pricing.business-invariant.test.ts` is new. The repo previously
measured only the internal `cashifyEquivalent`; nothing measured the offer the
customer actually receives.

- comparable observations: 13 of 15
- `cashifyEquivalent` MAE: **₹370**
- **final-offer MAE: ₹387**
- final offer at or above the real Cashify quote: **13 of 13**

4/6/8% tiers: PASS (untouched). ₹2,000 cap: PASS. Fhoneify normally above the
equivalent Cashify quote: PASS.

## 4. No new depreciation rate

Per `AGENTS.md`, no age depreciation value is invented:

- **Vivo** already defined `0.75` and `0.7526315789473684` for
  `warranty === false`; the age answer simply never reached them.
- **Oppo** defines no out-of-warranty multiplier anywhere, so it takes `0.75`,
  the rate already shared by Vivo standard, Xiaomi non-Note and the generic
  Android fallback.

Oppo now sits at 84.4% of reference, beside its sibling Vivo at 84.2%.

A follow-up commit fixes a defect introduced by the first: Vivo and Oppo gated
the missing-bill penalty on `warranty !== false`, so once `above11` could
select the out-of-warranty multiplier, *warranty yes + above 11 months + no
bill* took the out-of-warranty multiplier **and** the bill penalty. Both now
gate on `!isOutOfWarranty`, exactly as `calculateApplePrice` already did.

## 5. Why the suite missed it, and the new guard

`P1_OLD_NO_DAMAGE` moved age and warranty together, so an engine that ignored
one still passed by returning an equal price. Age and warranty now vary
independently and the age ladder is asserted rung by rung.

Proven to work: temporarily reverting the Oppo branch makes the catalog suite
fail with **236 failures across all four Oppo families**.

A catalog sweep found **889 violating device/profile combinations before the
fix and 0 after**.

## 6. Catalog testing

- devices tested: **2,214**
- profiles per device: **12** (was 8)
- quotes generated: **53,136**
- failures: **0**
- families: 48

## 7. Speed

Measured against production, not guessed. **Render cold start is not the
problem** — after 17 minutes of silence the process was still up with an
unchanged boot timestamp.

| Stage | p50 |
|---|---|
| Edge↔origin network + Express | ~346 ms |
| Middleware, validation, catalog lookup | ~22 ms |
| **`ReferencePrice.findUnique` → Supabase** | **~490–510 ms** |
| Pricing compute + signing | ≤20 ms |
| **Warm server time** | **~880 ms** |
| First quote after idle | 1.4–3.1 s |

The query is already fully index-covered (`deviceKey` is `@unique`), so no
index can fix it — it is network distance. Fixes applied:

1. Reference prices are preloaded into memory and served from there
   (`lib/referencePricing/cachedStore.ts`). Writes still go to Postgres, which
   stays authoritative. Expected saving ~490–510 ms, ~58% of warm server time.
2. An unref'd 4-minute `SELECT 1` keeps the Prisma pool dialled, removing the
   1.4–3.1 s first-quote-after-idle penalty.
3. `POST /api/quote/price` needs no auth, but an unauthenticated customer's
   price request only started *after* OTP verification. It now runs during the
   OTP step, overlapping the seconds spent reading and typing the code.
4. The shared axios client had no timeout, so a stalled connection left the
   customer on "Calculating…" forever. It now gives up after 45 s into the
   existing error-and-retry card.

The after-figures for 1 and 2 are **not yet measured in production** — they
require this branch to be deployed. See "Not done" below.

## 8. Result UX

The offer rendered at `2rem` inside a ~235px column beside the thumbnail,
labelled "Estimated value :", with the primary CTA roughly 600px below it,
under a glowing coupon panel with a bouncing emoji. On a 375px screen the most
important number on the site was neither the largest nor reliably on screen.

Now: the amount is full width at `clamp(2.5rem,12vw,4rem)` under a "Your
Fhoneify Offer" heading with `tabular-nums`; "Schedule Free Pickup" sits
directly beneath it at 52px tall; the loading state is a height-reserving
skeleton so the swap no longer shifts the page and never reads as frozen; the
card is scrolled into view, focused and announced via `aria-live` when the
signed quote lands; the error state gains a heading, `role="alert"` and a 48px
retry target; `prefers-reduced-motion` is honoured — the repo had no such rule.

**No pricing logic is touched by the UI work.** The displayed value is still
`customerPayout(finalPrice, appliedCoupon).payout`, where `finalPrice` is the
device-matched server-signed quote.

## 9. Test counts (database unreachable throughout)

regression 27/27 · production 36/36 · reference-data 28/28 · consistency 9/9 ·
condition-matrix 16/16 · calibration 9/9 · cashify-comparison pass ·
refresh 34/34 · cashify-matching 39/39 · refresh-e2e 12/12 ·
**business-invariant 9/9 (new)** · **reference-cache 7/7 (new)** ·
**catalog-properties 53,136 quotes, 0 failures**

`npx tsc --noEmit` clean for both tsconfigs; `npx next build` passes.

## 10. Before / after

| | Before | After |
|---|---|---|
| Age monotonicity violations | 889 | **0** |
| Oppo avg vs reference | 109.1% | **84.4%** |
| Oppo devices priced above reference | 152 | **0** |
| Catalog quotes asserted | 35,424 | **53,136** |
| `cashifyEquivalent` MAE | ₹370 | ₹370 |
| Final-offer MAE | ₹387 | ₹387 |

The eight Cashify observations are unchanged — none is an Oppo or a Vivo — so
this generalises rather than tuning the calibrated devices.

---

## Needs an owner decision before merge

1. **The Oppo `0.75`.** `AGENTS.md` reserves age depreciation values for
   explicit approval. It is the existing cross-brand rate rather than a new
   number, but it moves 152 devices by roughly 13–25%.
2. **`isWarrantyEligible()` has no Oppo case**, so every Oppo is priced as old
   and out of warranty and a genuinely new Oppo can never earn the young
   multiplier. Oppo's `3to6` / `6to11` branches and its calibrated
   `gstBillPenalty` values stay unreachable. Adding Oppo changes which
   questions customers are asked, so it is not done here.
3. **The ₹299 coupon is client-side only.** `WELCOME299` and `FHONEIFY299` are
   hardcoded in the shipped bundle, so any visitor can apply it, and the server
   accepts `couponApplied` as an unverified claim. The displayed payout is then
   ₹200 above the signed quote.
4. **iPhone 14 Pro Max** remains ~19% below Cashify on two observations. Both
   are `STALE_NOT_COMPARABLE` because Cashify's flow for that variant never
   asks age or warranty, so it is not a like-for-like gap — but our customer
   does answer those questions and lands ~₹6.5k lower. Resolving it needs a
   matched observation, which cannot be manufactured.
5. **Inert questionnaire inputs.** `eSim` is asked and blocks Continue but no
   engine reads it; the `spen` accessory is collected but never read; the
   missing-charger penalties never fire because the page only sends an
   `accessories` array and never the `charger` boolean.
6. **`Samsung Galaxy Z Fold 8 Ultra`** matches `isUltra` before the foldable
   test, so it takes Ultra params and the Ultra-only no-bill penalty while
   still using the foldable screen scale.

## Not done

- **Not deployed.** Per this environment's git rules the branch was pushed but
  `main` was not; nothing was merged or force-pushed.
- **After-latency in production is unmeasured.** The memory cache and the pool
  keep-alive cannot be measured until this branch is live.
- **No end-to-end lead through WhatsApp OTP** — it needs the owner's phone and
  creates a real lead.
