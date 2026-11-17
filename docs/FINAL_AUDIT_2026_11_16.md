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

### Second pass (17 November), same PR

5. **Quote page navigation:** Forward after changing an answer re-prices instead of showing the old offer. The pickup form has its own history entry, and its Back returns to the price. Continue on the accessories step sends an unanswered questionnaire back to the first question. Closing the login window returns to the page that opened it. Back from the price after logging in skips the login window. Try again retries the failed request's own answers. The Get Upto error is cleared on device change. API requests time out after 75 s and fall back to the retry state.
6. **Leads:** a booking from a logged-in customer is linked to the account and uses the account's verified number. The phone must be an Indian mobile number. The first-time coupon is accepted once per number, checked on the server after the price. Price checks are recorded once per customer, device and day with the validated answers. The admin report's value is the payout the customer was shown.
7. **Security:** OTP attempts are reserved atomically and carried across resends; after 5 wrong codes the number is locked for 30 minutes. Payment verification checks the buyer, refuses a second verification, and requires the Razorpay signature (refused in production when `RAZORPAY_KEY_SECRET` is not set). Cashback is credited on payment, not on order. Pickup lookup matches exact spellings of the number. Re-quote routes are admin-only. User ids are random. Server errors no longer return internal messages.
8. **Runner age order:** an older age bracket never pays more than a younger one. No price at a real catalog reference changed. The protected-price fingerprint was re-captured: 9 of its 24,096 synthetic-reference prices changed (Pixel 9 Pro XL, Galaxy S25 Edge at a ₹20,000 test reference).

Tests: `pricing.quote-flow-audit`, `pricing.lead-guards`, `pricing.runner-age-order`, and new cases in `auth.otp`.

## 3. Work order, in priority order

Each task is independent unless it says otherwise. One branch and one PR per task. Run before every PR:

```
node --import tsx scripts/pricing-evidence/run-offline-suites.ts
npx tsc -p tsconfig.next.json --noEmit
npx tsc -p tsconfig.server.json --noEmit
npx next build
```

Never run `pricing.quote-integration.test.ts` or any reference-price script: the repo `.env` points at the production database.

### P1. Quote page flow

Done in the second pass (item 5 above). Re-test on the live site after deploy: Forward after changing an answer, Back from the pickup form, closing the login window.

### P2. Lead bookkeeping

Done in the second pass (item 6 above).

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
4. **Age rules mix fixed and percentage forms.** Guarded in the second pass (item 8 above).
5. **iPhone 6 to 14 questionnaire:** the evidence model ignores warranty, bill and age on about 100 older variants, while the page decides what to ask from the database profile. Check on the live site that those models are not asked; if any is, drive the page from the evidence model's own list.
6. **Samsung holdout** was released at 93% against a 95% gate (7 untested variants). Collect those seven.
7. **Combination quotes** (two or more faults together) are still inferred. The list to collect is in `docs/next-quotes/`.

### P5. Operations

1. Real OTP login and a booked pickup have never been tested end to end on the live site. Do one with the owner's phone and delete the lead afterwards.
2. Set `QUOTE_STRICT_REFERENCE_MODE` on Render once every catalog variant has a database reference, so a catalog placeholder price can never be quoted. Before that, run a read-only query for variants without a row or with a row older than 30 days.
3. Set `RAZORPAY_KEY_SECRET` on Render before the buy flow takes real payments. Until then payment verification is refused in production.
4. Close or delete the stale pull requests 1, 5, 6, 7, 8 and 17 after checking nothing in them is still wanted.
5. The weekly reference refresh promotes a price that moved 40% or more the same day and only flags it. Consider holding such moves for review.
