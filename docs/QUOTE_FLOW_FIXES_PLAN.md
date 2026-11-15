# Quote flow fixes: age answer ignored, answers carried to the next device (16 November 2026)

Investigated read-only on `main` at `b027422`. Read `AGENTS.md` and `docs/pricing-handbook/STRICT_RULES.md` first. No bonus, fee, token, auth, schema or Cashify-refresh change. Do not change any price of a phone on the measured rules (`lib/pricing/cashifyRunnerModel`, iPhone evidence model).

## Bug 1: the age answer does not change the price

**Reproduced on the live API** (`POST /api/quote/price`, warranty Yes, bill Yes, four age answers):

| Phone | below 3 / 3–6 / 6–11 / above 11 months | Result |
|---|---|---|
| Samsung S24 FE, OnePlus 12, Nothing 3a, Pixel 8 (measured rules) | four different prices | works |
| Vivo V30 | 20,020 for all four | ignored |
| Realme 12 Pro 5G | 14,804 for all four | ignored |
| Xiaomi Redmi Note 13 5G | 11,210 for all four | ignored |
| POCO X6 5G | 12,118 for all four | ignored |

**Cause 1 (server).** `calculateFhoneifyPrice` in `lib/pricingCalculator.ts` (about line 2890) replaces `mobileAge` with `null` whenever the stored questionnaire profile says `ageMode: 'NOT_ASKED'`, except for iPhone evidence models. The stored profile comes from a crawler that only sees Cashify's first page; Cashify's age page appears after "warranty: Yes". Every one of these phones has `warrantyMode: ASKED, ageMode: NOT_ASKED`. Measured data on six brands shows Cashify always asks age after warranty Yes.

**Cause 2 (UI/engine mismatch).** `app/quote/page.tsx` (about line 2806, `forceAgeForWarranty`) shows the age step for every phone after warranty Yes. But `calculateSamsungPrice` (legacy path), `calculateNothingPrice` (legacy path), `calculateGenericAndroidPrice` (Realme, Motorola, Infinix, Tecno, Honor, Nokia, etc.) and the Vivo fold branch never read `mobileAge`. `lib/pricing/questionnaire.ts` `AGE_SENSITIVE_BRANDS` already records this.

### Fix

1. **Server: stop discarding the answer.** Where `warrantyMode` is `ASKED` or `UNKNOWN`, keep `mobileAge` regardless of the crawled `ageMode`. Keep the existing rule for `warrantyMode: 'NOT_ASKED'` (age and warranty both neutral). This alone fixes Xiaomi, POCO, Vivo, iQOO, Oppo and legacy OnePlus, which already have age tables (existing constants, unchanged).
2. **Calculators that never read age (generic, legacy Samsung, legacy Nothing, Vivo fold):**
   - "Above 11 months" must price exactly as warranty "No". This is Cashify's measured behaviour on 400+ variants and uses each calculator's existing out-of-warranty multiplier. No new number.
   - "3–6 months" and "6–11 months" have no existing value in these calculators. **Owner decision needed** (do not invent one): either (a) hide those two options for these phones and show only "Below 11 months / Above 11 months", or (b) approve specific values. Recommended: (a) until the brand gets measured rules.
3. **One source of truth.** The page must ask the age step exactly when the server will price it. Derive it from `questionnaireFor()` (updated to match step 1–2) and remove the unconditional `forceAgeForWarranty`. The server must return manual inspection or `INVALID_DIAGNOSTICS` if age is required and missing, as the measured rules already do.
4. Keep the existing guard that "in warranty, no bill" never prices below out-of-warranty.

### Tests for bug 1
- Service-level test per engine brand (xiaomi, poco, vivo, iqoo, oppo, oneplus-legacy, generic/realme, samsung-legacy, nothing-legacy) with a profile of `warranty ASKED, age NOT_ASKED`: prices are non-increasing across below3 → 3to6 → 6to11 → above11, and above11 equals warranty No.
- Measured-rule phones and iPhones: prices byte-identical before and after (use the existing isolation check `scripts/pricing-evidence/check-samsung-pixel-isolation.ts` pattern).
- UI/engine agreement test: for every catalog device, the page's "asks age" equals whether two age answers can produce different server prices.
- Existing goldens that change must be listed with the reason; do not edit silently.

## Bug 2: answers from one phone are pre-selected on the next phone

**Cause.** `app/quote/page.tsx` keeps all answers in one React state (`diagnostics`, about line 413). Changing device goes through `navigateToState` (line 281) or the back button (`handlePopState`, line 205); both change brand/model/storage but never reset `diagnostics`. The page component stays mounted, so the old answers remain. The session-save effect (line 1307) then stores those old answers under the new device, so they survive a reload too. The "start over" button (line 3191) clears prices and session but not the answers.

### Fix
1. Add one `resetQuoteAnswers()` that sets `diagnostics` back to the initial empty object and clears everything derived from it: final quote, starting quote/context for the old device, coupon flag, price errors, inspection context, step history and any per-step local selections.
2. Call it whenever the device identity (`brand|model|storage`) changes: in `navigateToState`, in `handlePopState`, and in the "start over" handler. Best done in one `useEffect` keyed on the device identity so no path is missed, guarded so the initial same-device session restore (line 236) still works.
3. Do not save a session until the answers belong to the current device (reset must run before the save effect).
4. Leave login/user details (phone, name, address) alone.

### Tests for bug 2
- Browser test (existing local QA helper pattern, ports 5311/3311): pick phone A, answer several questions, go back, pick phone B → no option selected, first question unanswered; reload → still empty. Also: same phone after reload restores its own answers (existing behaviour must stay).
- Unit test on the reset function listing every field of the initial state.

## Delivery
Branch `fix/quote-age-and-answer-reset` from `main`. Two commits (bug 1, bug 2). Run `node --import tsx scripts/pricing-evidence/run-offline-suites.ts`, both `tsc` projects, `npm run build`, and the browser checks. Draft PR with before/after prices for the five phones in the table and screenshots. Do not merge or deploy.
