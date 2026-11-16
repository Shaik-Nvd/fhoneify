# Final audit and handover plan (16 November 2026)

Audit of live `main` at `415a9a6`. Four read-only audits were run: the quote page, the server quote and lead path, an offline pricing sweep of the whole catalog, and a read-only check of the live API. This file is the work order for whoever continues (Opus, Codex or a developer). Read `AGENTS.md`, `docs/HANDOFF_CODEX.md` and `docs/pricing-handbook/STRICT_RULES.md` first; every rule there still applies.

Security findings that are not yet fixed are deliberately not in this public file. They are in the private, gitignored file `data/pricing-evidence/handover-2026-11-16/SECURITY_WORK_ORDER.md` on the owner's machine.

## 1. State of the project

| Area | State |
|---|---|
| iPhone | Evidence rules live. |
| Nothing/CMF, OnePlus, Samsung, Google Pixel, Xiaomi/Redmi, Honor, Asus, Lenovo, Nokia | Measured rules live. |
| Vivo, iQOO, Realme, Oppo, POCO, Motorola, Tecno, Infinix, Huawei, LG | Old (legacy) pricing. Waiting for Cashify test runs. |
| Bonus | 8% / 6% / 4% of the reference, capped at ₹1,000, added once. Live. |
| Quote token, lead binding, reload restore | Sound. Re-checked in this audit. |

Pricing sweep: 2,396 variants, 260,760 offline prices. No exception, no NaN, negative or fractional price, no clean phone sent to inspection, and no single worse answer that raises the price. On the measured brands no logic bug was found.

## 2. Fixed in this audit (PR "Final audit fixes")

1. **An un-ticked defect was still priced.** Tick "Broken/scratch on device screen", choose "Screen cracked", go back, un-tick it: the page kept `screenCondition` and the server priced it. Un-ticking a defect tile now clears its detail answers (`DEFECT_DETAIL_ANSWERS` in `app/quote/page.tsx`).
2. **Warranty No then Yes** left "Above 11 months" pre-selected on the age page. Changing to Yes now clears it.
3. **Admin inspection report** put customer-typed text into the page as markup. All such text is now escaped, the report renders with scripts and network disabled, and the page is always closed.
4. **Price checks showed as "Pickup Scheduled"** in the customer's profile. `getCustomerPickups` no longer returns leads with status `price checked`. The admin view is unchanged.

Guard test: `scripts/test/pricing.quote-flow-audit.test.ts`.

## 3. Work order, in priority order

Each task is independent unless it says otherwise. One branch and one PR per task. Run before every PR:

```
node --import tsx scripts/pricing-evidence/run-offline-suites.ts
npx tsc -p tsconfig.next.json --noEmit
npx tsc -p tsconfig.server.json --noEmit
npx next build
```

Never run `pricing.quote-integration.test.ts` or any reference-price script: the repo `.env` points at the production database.

### P1. Quote page flow (no pricing change)

All in `app/quote/page.tsx`. Line numbers are from `415a9a6`; search for the quoted code.

1. **Forward button shows an old price.** `handlePopState` only sets the step. After reaching the price, going back, changing an answer and pressing browser Forward, step 11 shows the price and token of the old answers. Fix: keep a hash of the answers the shown quote was priced for; when step 11 is entered and the current answers differ, clear `finalQuote` and re-price. Acceptance: the price on screen always belongs to the answers in the sidebar.
2. **Step 12 has no history entry.** `onClick={() => setStep(12)}` and the form's Back `setStep(8)`. Use `navigateToState(..., 12)` and `history.back()`. Acceptance: browser Back from the pickup form returns to the price.
3. **"Schedule Pickup" on the Get-upto screen can lead to pricing an empty questionnaire** (step 2 → 11 → 12 → Back → step 8 → Continue sends `calls/touch/originalScreen = null`). Fix: Continue on step 8 must send the customer to the first unanswered step. Also make the server refuse a final quote whose three core answers are null, but only after confirming the Get-upto request does not rely on nulls (it uses `PERFECT_CONDITION_DIAGNOSTICS`).
4. **Closing the login modal** uses `asksAgeQuestion ? 9 : 8` and can open an age page the flow skipped. Use `history.back()`.
5. **"Try again"** re-prices `diagnostics`, not the answers of the failed request. Keep the last requested answers in a ref and retry those.
6. **Stale Get-upto error:** `resetAnswersOnDeviceChange` should also clear `startingPriceError`.
7. **Back from the price after logging in** lands on the login modal. Skip step 10 when `isAuthenticated`.
8. **No request timeout** in `lib/api.ts`. Add `timeout: 30000` and show the existing retry button.

### P2. Lead bookkeeping (server, no pricing change)

1. `POST /api/quote/leads` has no `optionalAuth`, so `userId` is always null and pickups are found only by phone suffix. Add `optionalAuth` to the route.
2. `/api/quote/price` creates a `price checked` lead on every call from a logged-in user, including the Get-upto call and every reload. Create at most one per user, device and day (update the existing row), and store the parsed answers at the top level of `answers` so the admin report shows them.
3. The admin report's "Estimated Value" is `min(quotedPrice, snapshot Get Upto)` and ignores the fee and coupon. Show `answers.pricing.customerPayout` when present.

### P3. Legacy brands (pricing policy: owner approval needed before any change)

These affect only brands without Cashify test data. The clean fix for all of them is the same as for every released brand: collect the brand's Cashify runs, then add a calibration file. Do not patch the old constants without the owner's approval.

1. **Box bonus overshoot.** The old calculators add ₹380 for the box to about 0.95–0.98 × reference, so a perfect phone's Cashify equivalent exceeds the reference on 1,088 variants. The service then caps the offer at reference + bonus, which hides small deductions: on 987 variants answers such as box missing, bill No, age 3–6 months or a minor fault do not change the final price.
2. **Charger question** is shown for every legacy Android brand but only the Samsung calculator prices it (about 1,250 variants). Either hide it on those brands or price it from data.
3. **Dead phone** has a fixed ₹1,200 value, which is up to 91% of a perfect phone on 22 very cheap variants.

Brands and catalog variants still waiting for data: Vivo 324, Realme 262, Oppo 236, POCO 113, iQOO 95, Motorola 74, Tecno 68, Infinix 63, plus Huawei and LG. Use `docs/pricing-handbook/XIAOMI_OTHERS_CODEX_PLAN.md` as the template: importer, read-only audit, `fit-cashify-runner-calibration.ts --brand <Brand>`, brand branch in `routeBrandCalculator`, gates (100% of measured quotes within ₹20, measured no-offers return manual inspection, protected prices unchanged).

### P4. Measured brands: calibration follow-ups (need data, not code)

1. **Silent button and audio receiver** are ₹0 in every runner profile, on every brand. That pattern suggests the test runner never varied these answers. Ask the team to quote both on three phones per brand; if Cashify really deducts nothing, hide the two questions on runner brands.
2. **Face sensor, fingerprint and "1–2 body scratches"** are ₹0 on hundreds of variants. Spot-check five phones; these may be real zeros.
3. **Charger missing** is ₹0 on Galaxy S24, S24 Plus, Z Flip7 FE, Nothing Phone 3 and 3a Lite, Pixel 7 and 7 Pro although the question is shown.
4. **Age rules mix fixed and percentage forms.** On Samsung F34 5G, M14 5G and M15 5G the 6–11 month deduction is a fixed amount and above-11 is a percentage; below a reference of about ₹4,500 the older phone would pay more. Not reachable at today's references. Add a guard in `lib/pricing/cashifyRunnerModel/model.ts` that never lets an older bracket pay more than a younger one, with a test.
5. **iPhone 6 to 14 questionnaire:** the evidence model ignores warranty, bill and age on about 100 older variants, while the page decides what to ask from the database profile. Check on the live site that those models are not asked; if any is, drive the page from the evidence model's own list.
6. **Samsung holdout** was released at 93% against a 95% gate (7 untested variants). Collect those seven.
7. **Combination quotes** (two or more faults together) are still inferred. The list to collect is in `docs/next-quotes/`.

### P5. Operations

1. Real OTP login and a booked pickup have never been tested end to end on the live site. Do one with the owner's phone and delete the lead afterwards.
2. Set `QUOTE_STRICT_REFERENCE_MODE` on Render once every catalog variant has a database reference, so a catalog placeholder price can never be quoted. Before that, run a read-only query for variants without a row or with a row older than 30 days.
3. Close or delete the stale pull requests 1, 5, 6, 7, 8 and 17 after checking nothing in them is still wanted.
4. The weekly reference refresh promotes a price that moved 40% or more the same day and only flags it. Consider holding such moves for review.
