# Fhoneify — Engineering Handoff (from Claude to Codex)

Written 2026-09-19. Read this whole file before changing anything.

---

## 0. Copy-paste starter prompt

> You are continuing work on the Fhoneify repo (Next.js 14 frontend on Vercel + Express/Prisma API on Render + Supabase Postgres). Read `docs/HANDOFF_CODEX.md` completely first. It lists what is done, what is still open, the rules that must not be broken, and the exact commands to use.
> Start with **§4 Task 1** (verify that the production deploy of the pricing fix is live and correct). Then **§4 Task 2** (collect Cashify comparison data using the explain tool). Do **not** change any pricing numbers, penalties, the 4–8% uplift or the ₹2,000 cap until the owner has approved the specific values (§4 Task 3).
> Before claiming anything is fixed, show the evidence (command output, test counts, live responses). Never print secrets.

---

## 1. What Fhoneify is and where things run

| Piece | Where | Notes |
|---|---|---|
| Frontend | Next.js 14 (`app/`), Vercel projects `fhoneify-j7vf` → https://www.fhoneify.in and `fhoneify` → www.fhoneify.com, team `fhoneify-s-projects` (owner **Shaik-Nvd / nvd_shaik**) | **Vercel blocks deployments of commits authored by `ShoaebMalik19`** ("Deployment was blocked"). A commit **authored by the owner (nvd_shaik)** must be pushed to `main` to deploy. The owner has done this before (e.g. `96a346e "Trigger deployment for fix"`, `77f7b4b`). Do not fake another person's author identity; ask the owner to push the trigger commit. |
| API | Express (`server/`), Render service `fhoneify-api` → https://fhoneify-api.onrender.com | Docker build (`Dockerfile`), **auto-deploys from `main`**. Cold starts can take 30–60 s. `GET /` returns "Cannot GET /" on purpose; health is `GET /health`. |
| Database | Supabase Postgres project `secmzrdnsajeywfxrmar`, via Prisma 5.22 (`prisma/schema.prisma`) | `DATABASE_URL` (pooler) and `DIRECT_URL`. **The local `.env` points at PRODUCTION.** |
| Weekly price refresh | GitHub Actions `.github/workflows/reference-price-refresh.yml` → scrapes Cashify → `ReferencePrice` / `ReferencePriceHistory` tables | Live since 2026-09-16; the full refresh is enabled (`REFERENCE_REFRESH_FULL_ENABLED=true`). |
| OTP login | Meta WhatsApp Cloud API, template `otp_fhoneify` | Working in production. **Keep WhatsApp OTP.** |
| Admin login | env `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (scrypt, `scrypt$32768$8$1$salt$key`) on Render | See §4 Task 6. |

Repo: https://github.com/Shaik-Nvd/fhoneify, default branch `main`.

---

## 2. Rules that must not be broken

1. Never print, log or commit secrets: database URLs, Supabase keys, JWT/quote secrets, admin password or hash, OTP codes, WhatsApp/Cashify credentials, tokens, cookies.
2. Do not weaken authentication or change the admin-auth design. Do not add an OTP bypass, test/master OTP, fallback credentials, hardcoded passwords, or an OTP→admin path. Do not touch the supervisor account or its credentials.
3. Do not change the pricing business rules without explicit owner approval: `applyCompetitorUplift` (8% if reference ≤ ₹20,000, 6% if ≤ ₹50,000, else 4%; extra capped at ₹2,000; ₹100 floor), and the penalty values in `lib/pricingCalculator.ts`.
4. Do not redesign the reference-price architecture or the signed quote-token design.
5. Before anything that could overwrite or delete production data, stop and show exactly what would happen first.
6. Never force-push. Never rewrite `main` history.
7. **`npm run start:api` no longer runs `prisma db push`** (removed after it tried to drop the CashifyResearch* tables and blocked Render startup). Schema changes are applied deliberately and reviewed with `npm run db:drift`; never use `--accept-data-loss`.
8. **`scripts/test/pricing.quote-integration.test.ts` and the reference-price scripts write to the production DB** through `.env`. Run tests with an unreachable DB URL (§6) unless you mean to touch production.
9. Keep the server authoritative: the browser must never compute a customer's price (a test enforces this, §5).

---

## 3. What was done (most recent first)

### 3.1 Pricing forensic audit + data-flow fix — PR #2, branch `fix/pricing-single-source` (READY, NOT YET MERGED as of 2026-09-19)
https://github.com/Shaik-Nvd/fhoneify/pull/2. It is mergeable with no conflicts; the branch's base content is identical to `main` at `77f7b4b`. The two red Vercel checks on the PR say "Deployment was blocked" (the author rule), **not** a build failure; `next build` passes locally. The owner merges it (squash is recommended), then continues with §4 Task 1.
Commit message: "Make the server's signed quote the only price the quote page shows".

**Root causes found and fixed:**
- The quote page (`app/quote/page.tsx`) priced devices **in the browser** from the bundled `lib/cashify_prices.json` snapshot, which is stale (last updated before the weekly refresh; e.g. OnePlus 15R 12/512: snapshot ₹36,300 vs live ₹35,940). If the API failed, the local estimate stayed on screen.
- **₹0 after refresh:** the reload handler restored only the step from the URL, not the price. "Get upto" rendered `formatCurrency(basePrice || 0)` = ₹0, and the lead form would have sent `Number(null)` = 0 with empty answers.
- "Schedule Pickup" from the Get Upto screen sent **empty answers**, so the server stored a different price than the one shown. OTP verification also re-priced with empty answers.
- The screen shows `quote − ₹99 (+₹299 first-time coupon)`, while `Lead.quotedPrice` stores the quote with no record of the displayed figure.

**What the fix does:**
- The quote page gets prices **only** from `POST /api/quote/price`. It no longer imports the engine, the calculator or the snapshot, so the snapshot is out of the browser bundle. It shows "loading" and "Try again" states instead of ₹0.
- Each signed quote is bound to its device and carries the exact answers it was signed for; the lead sends those same answers plus the token, so the server stores exactly the price that was shown (`priceSource: 'quote_token'`).
- `lib/pricing/quoteSession.ts`: signed quotes are saved in `sessionStorage` (`fhoneify-quote-session`) and restored on reload. It refuses to restore zero, unsigned, expired or other-device prices; the page re-prices on the server instead.
- `lib/pricing/payout.ts`: the existing ₹99 / ₹299 display rule, moved there **unchanged** and shared by the screen and the server. Leads now store `answers.pricing.customerPayout` and `couponClaimed` (JSON field, **no schema change**). The admin leads page shows "customer saw ₹X", and the CSV has a "Customer Saw" column.
- `lib/pricing/perfectCondition.ts`: the perfect-condition answers behind "Get upto" (re-exported from `engine.ts`).
- `lib/pricing/explain.ts` + `scripts/pricing/explain-quote.ts` (`npm run pricing:explain`): a transparent per-answer breakdown built only from the real engine (§4 Task 2).
- New test suite F: `scripts/test/pricing.quote-consistency.test.ts` (`npm run test:pricing:consistency`, 9 tests).

**Verification done before the merge:**
- Suites passed with the DB unreachable: regression, production 36, reference-data 28, consistency 9, cashify-matching 39, refresh 34, refresh-e2e 12, auth.admin 43, auth.otp 18.
- `npx tsc --noEmit -p tsconfig.next.json` was clean, and `npx next build` passed.
- Local browser against the real reference data:
  - Step 2 showed ₹37,601 and a reload kept it with no new request.
  - Step 11 re-priced to ₹30,817 (quote ₹30,916 − ₹99), and a reload kept it.
- The explain tool matched the **live production API** for 3 scenarios (₹30,916, ₹30,225, ₹36,249).
- **Not done:** a real end-to-end lead through WhatsApp OTP on production (it needs the owner's phone and creates a real lead).

### 3.2 Earlier completed work (already on `main`)
- Automatic weekly Cashify reference-price refresh (GitHub Actions → Supabase), with a circuit breaker, a lock, history and reports. The full 2,200-device run gave: 2,127 fresh, 2,096 updated, 15 rejected, 2 failed, 56 missing.
- Server-authoritative pricing with HMAC-signed quote tokens (`lib/pricing/quoteToken.ts`, `pricingService.ts`). The lead price is verified server-side and never trusted from the client.
- Admin auth hardening: scrypt hash, 15-minute access tokens with a jti, refresh tokens rejected as access tokens, rate limits.
- OTP outage fixed (the root cause was a CORS placeholder origin); OTP codes are stored HMAC-hashed with an attempts limit.
- Logistics requote bypass fixed.
- Render build fix: the Dockerfile copies `prisma/` before `npm install`.
- Tools: `npm run admin:hash-password`, `npm run admin:check-credentials`, `npm run admin:verify-production -- --login`.

---

## 4. Open tasks, in priority order

### Task 1 — Confirm the pricing fix is live in production (do this first)
0. If PR #2 is not merged yet, ask the owner to merge it. First check with `gh pr view 2 --json state`. If `main` has moved since, re-run the test suites in §6 on the merged result.
1. **Render (API):** it auto-deploys from `main`. Check that `GET https://fhoneify-api.onrender.com/health` returns 200. Then check the new lead fields by reading the code path (no lead needed). The API change is only the extra `couponApplied` field plus `customerPayout` storage.
2. **Vercel (frontend): will be BLOCKED** because the merge commit is authored by ShoaebMalik19. Ask the owner (nvd_shaik) to push an owner-authored commit to `main`, e.g. `git commit --allow-empty -m "Trigger deployment"` then `git push`. Then confirm both Vercel projects show "Ready" for the latest `main` commit.
3. Live check on https://www.fhoneify.in/quote. Pick OnePlus → Oneplus 15R → 12 GB/512 GB.
   - "Get Upto" must show the server price (₹37,601 as of 2026-09-19; it can change after the weekly refresh). Press F5: the same number must stay, and it must **never** show ₹0.
   - DevTools → Network: when prices load, the only price call should be `POST /api/quote/price`.
4. Owner-run end-to-end check (needs a phone for WhatsApp OTP): answer the questions, log in, note the "Estimated value", press F5 and confirm it is the same, then schedule a pickup. In Supabase, the new `Lead` row must have:
   - `quotedPrice` = displayed + 99 (or displayed + 99 − 299 with the coupon);
   - `answers.pricing.priceSource = "quote_token"`;
   - `answers.pricing.clientPriceMismatch = false`;
   - `answers.pricing.customerPayout.payout` = the displayed number.

   Use the read-only query pattern in §6 to check it.

### Task 2 — Collect Cashify comparison data (no code changes)
The main reason prices differ from Cashify (Fhoneify sometimes ₹8–10k higher) is **not** the data flow. The brand formulas **ignore many condition answers**. Measure it; don't guess.

```bash
# answers as the quote page sends them; save to a file to avoid shell quoting issues
npm run pricing:explain -- --brand Samsung --model "Samsung Galaxy S24 5G" --storage "8 GB/256 GB" --answers-file s24.json --live-api
```
Output: the reference price, each answer group's ₹ effect, the Cashify-equivalent value, the uplift % and ₹ (cap shown), the final quote, what the customer sees, a list of **answers the formula ignores**, and a comparison with the live API. The tool needs `DATABASE_URL` for the reference lookup (read-only), or pass `--reference <n>`.

Build a table: for 10–20 real devices across brands, enter the **same answers on Cashify by hand**, then record Cashify's price next to our `cashifyEquivalent` and the per-answer effects. That table is what the owner needs to approve penalty values in Task 3.

Answer values the UI sends (from `app/quote/page.tsx`):
- `calls` / `touch` / `originalScreen` / `warranty` / `validBill`: true or false
- `defects`: `screen_scratch`, `screen_spot`, `body_scratch`, `panel_missing`
- `screenCondition`: "Screen cracked/ glass broken", "Chipped/cracked outside display area", "More than 2 scratches on screen", "1-2 scratches on screen"
- `screenSpots`: "Large/ heavy visible spots on screen", "3 or more minor spots on screen", "1-2 minor spots on screen", "No spots on screen"
- `screenLines`: "Visible line(s) on display", "Display faded along edges", "No line(s) on Display"
- `screenDiscoloration`: "Major Discoloration", "Minor Discoloration", "No Discoloration"
- `bodyScratches`: "More than 2 scratches", "1-2 scratches", "No scratches"
- `bodyDents`: "Major dent(s) or more than 2", "1-2 minor dents", "No dents"
- `bodyPanel`: "Cracked/ broken side or back panel", "Missing side or back panel", "No defect on side or back panel"
- `bodyBent`: "Bent/ curved panel", "Loose screen (Gap in screen and body)", "Phone not bent"
- `hardware`: ids from `getFunctionalProblems()` in the page, e.g. `back_camera`, `front_camera`, `battery_service`, `battery_health`, `fingerprint`, `face`, `wifi`, `speaker`
- `accessories`: `box`, `charger`, `spen`
- `mobileAge`: `below3`, `3to6`, `6to11`, `above11`
- `eSim`: "Single eSIM", "Dual eSIM" or null

### Task 3 — Formula gaps (needs OWNER DECISION before any code change)
Proven by the explain tool against the live API:
- **Samsung** (`calculateSamsungPrice`) ignores touch, originalScreen, screen condition, spots, lines, discoloration, panel, bent, and **all** hardware faults. Example: an S24 8/256 with dead touch, a replaced cracked screen, a broken panel, a bent frame and 5 failed parts is quoted ₹36,249, the perfect-condition maximum.
- **OnePlus / Nothing:** only hardware (front/back camera, battery), bill, warranty and box matter. Screen and body answers are ignored.
- **Xiaomi / Vivo / Oppo:** touch, originalScreen, screen answers and panel/bent are ignored. Hardware is ignored too, except battery on Vivo Fold.
- **Apple:** "Screen cracked/ glass broken" and "Chipped/cracked outside display area" give **₹0 deduction**, and only the "1-2" / "more than 2" scratch options are penalized. Most hardware ids other than battery and face are ignored. For iPhone 15, setting warranty=false *raises* the price by ₹15 (the out-of-warranty multiplier 0.7496 is above the in-warranty 0.749243).
- `ModelParams.touchPenalty`, `originalScreenPenalty`, `functionalScale`, `physicalScale` and `COMMON_FUNCTIONAL_PENALTIES` are defined in `lib/pricingCalculator.ts` but **never applied** outside Apple.
- History: commit **`f1034f4` (2026-08-11, "Replace with complete unified production pricing algorithm")** replaced an engine that applied touch, originalScreen and defect penalties to all brands. See it with `git show f1034f4^:lib/pricingCalculator.ts`; it used `lib/pricingConfig.json` (`defects_screen_body`, age tables).
- Options for the owner: (a) restore those generic penalties for the brands that lack them; (b) calibrate per brand from the Task 2 table; (c) as a safety net, refuse instant quotes (inspection only) for severe damage (dead touch, cracked screen, bent) until calibrated.
- When implementing: change only `lib/pricingCalculator.ts`. Bump `PRICING_ENGINE_VERSION` in `lib/pricing/engine.ts`. Add cases to `scripts/test/pricing.regression.test.ts`. Expect `pricing.cashify-comparison` fixtures to need updating, and get the owner's approval for every changed number.

### Task 4 — Condition-mapping bugs in `app/quote/page.tsx` (confirm intent with the owner, then fix)
- Step 8 "Continue" handler (search for `hasWarrantyVoidingDefects`): it checks the defect ids `broken_screen`, `screen_lines`, `screen_discoloration`, `body_bent`, which **the UI never sends**. The real ids are `screen_scratch`, `screen_spot`, `panel_missing`; screen lines/discoloration are separate fields, and bent is `bodyBent`.
- In the same handler, the else branch (warranty void or not eligible) sets `mobileAge: 'below3'` and **leaves `warranty` as true** when the void comes from a defect. The phone is then priced as a near-new, in-warranty device. The likely intent is `warranty: false`. These two bugs are coupled; fix them together and measure the effect with the explain tool first.
- `lib/pricing/payout.ts`: the ₹99 fee is meant to be waived for a quote of exactly ₹1,200, but a non-working phone's quote is ₹1,200 after the uplift (₹1,248–₹1,296), so the waiver never matches. It is kept as-is on purpose; the owner decides.

### Task 5 — Remaining duplicate price sources (low risk, documented)
- `components/TopSellingModels.tsx` (homepage "Get Upto" cards): hard-coded prices with its own 4/6/8% uplift and **no ₹2,000 cap**, so they differ from real quotes. Options: fetch the `startingPrice` from `POST /api/quote/price` with perfect-condition answers (import `PERFECT_CONDITION_DIAGNOSTICS` from `lib/pricing/perfectCondition.ts`; watch the rate limit of 120 per 15 min per IP), or remove the prices.
- `POST /api/quote` (`createQuote` → `server/modules/quote/service.ts generateQuote`): a legacy second pricing path with different formulas. No frontend calls it. Consider removing the route after confirming nothing external uses it.
- `lib/cashify_prices.json` is stale and is now used only as the server's fallback when the DB lookup fails. Refresh it with `npm run reference-prices:export`, which reads the DB and writes the file; review the diff, then commit.
- The first-time coupon (₹299) is generated and validated only in the browser. The server stores it as `couponClaimed` (a claim). Server-side verification needs a coupon table or a first-lead check, which is a business decision.

### Task 6 — Admin login returns 401 in production (waiting on the user)
Health is 200; the verifier passes 10/11, and a valid login returns 401. A probe showed the scrypt cost is being paid, so the hash parses, which means the username or password does not match. The user must run locally:

```
npm run admin:check-credentials
```
They paste the Render `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` and type the login they use. The tool prints only MATCH / NO MATCH plus whitespace/case hints. Then:
- if USERNAME does not match: fix `ADMIN_USERNAME` on Render;
- if PASSWORD does not match: run `npm run admin:hash-password`, paste the new hash into Render and redeploy.

Then run `npm run admin:verify-production -- --login`; the target is 11/11. **Never ask the user to paste the password into chat.** Don't change the auth code for this; it is a configuration problem.

### Task 7 — Minor
- `npx tsc --noEmit -p tsconfig.server.json` has **pre-existing** errors in files not touched by this work: `server/modules/admin/service.ts` ("rejected" status type), `server/modules/inventory/service.ts` (`locationId`, `isSelectTier`), `server/test-iphone14.ts` (puppeteer), `server/test-random-10.ts`.
- Production data has four duplicate leads from double-submits (July 2026). A submit guard already exists.
- An optional Vercel Speed Insights bot branch exists and was intentionally not merged.

---

## 5. Key files

| File | Role |
|---|---|
| `lib/pricingCalculator.ts` | The pricing methodology (per-brand formulas, `applyCompetitorUplift`). Business rules live here. |
| `lib/pricing/engine.ts` | Base price resolution (repository → snapshot → catalog), invariants/guardrails, `computeStartingPrice`, `PRICING_ENGINE_VERSION`. |
| `lib/pricing/pricingService.ts` | `quote()` (signs the token) and `verifyLeadPrice()` (token or recompute, plus the audit). |
| `lib/pricing/quoteToken.ts` | HMAC token bound to the device key and a diagnostics hash. |
| `lib/pricing/diagnostics.ts` | Zod shape validation of answers. |
| `lib/pricing/{perfectCondition,payout,quoteSession,explain}.ts` | New in PR #2 (see §3.1). |
| `server/modules/quote/controller.ts` / `routes.ts` / `pricing.ts` | `POST /api/quote/price`, `POST /api/quote/leads` and the service wiring. |
| `app/quote/page.tsx` | Quote UI (~3,100 lines). Steps: 1 select → 2 Get Upto → 3–9 and 13/14 questions → 10 OTP → 11 final price → 12 pickup form. |
| `app/admin/leads/page.tsx` | Admin leads table and CSV. |
| `lib/seed_devices.ts` | Device catalog; the exact brand/model/storage strings the API expects. |
| `prisma/schema.prisma` | `Lead.quotedPrice` (Float) + `Lead.answers` (Json, with `answers.pricing` audit), `ReferencePrice*` tables. |
| `scripts/test/*.test.ts` | Test suites (see §6). |

---

## 6. Commands and environment gotchas (Windows, Git Bash)

```bash
# Tests without touching production (DB URL deliberately unreachable)
DATABASE_URL=postgresql://nobody:x@127.0.0.1:1/none npx tsx scripts/test/pricing.quote-consistency.test.ts
# Other suites: pricing.regression, pricing.production, pricing.reference-data,
#   referencePricing.cashify-matching, referencePricing.refresh, referencePricing.refresh-e2e,
#   auth.admin, auth.otp.
# pricing.quote-integration needs the REAL DB and writes to it - skip unless intended.

npx tsc --noEmit -p tsconfig.next.json      # must stay clean
npx next build                              # must pass

# Read-only production scripts: DATABASE_URL must come from the .env of the main checkout
DOTENV_CONFIG_PATH=<path-to>/.env DOTENV_CONFIG_QUIET=true NODE_OPTIONS="-r dotenv/config" npx tsx <script.ts>
```
- Local full stack: the frontend bundle calls `http://localhost:5000` by default (`NEXT_PUBLIC_API_URL` is baked in at **build** time), and the dev API's CORS allowlist is `http://localhost:3001`.
  - Run the API with `NODE_ENV=development PORT=5000 npx tsx server/server.ts` (with the dotenv flags above), **not** `npm run start:api`.
  - Run the web app with `npx next start -p 3001` after `next build`.
  - The local API still reads the production DB. Price quotes are read-only, but **do not submit leads**.
- Prisma walks up parent directories for `.env`; a checkout inside another folder may pick up the production `.env`.
- Files are a mix of CRLF and LF; keep each file's existing line endings.
- A Windows quirk: calling `process.exit()` while Prisma/fetch handles are closing can abort with `UV_HANDLE_CLOSING`. Set `process.exitCode` and disconnect instead (see `scripts/pricing/explain-quote.ts`).
- `/api/quote/price` rate limit: 120 per 15 min per IP; `/api/auth`: 20 per 15 min per IP.

---

## 7. Definition of done for any pricing change
The same quote must be identical through: **input → `POST /api/quote/price` → screen → reload → lead → Supabase `Lead` row.** Show that evidence. Suite F (`test:pricing:consistency`) encodes this; keep it passing and extend it. Suite F also fails if `app/quote/page.tsx` ever imports the pricing engine, the calculator or the snapshot again, or uses a `|| 0` price fallback.
