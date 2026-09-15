# Fhoneify — Production Readiness Audit

Date: 2026-09-15
Scope: `server/`, `lib/`, `app/`, `prisma/`, root config.
Method: static code review (grep sweeps + targeted reads). No live infrastructure (Postgres/Redis/Razorpay/WhatsApp/GCS) was available to this audit, so findings about runtime behavior are derived from code inspection, not live testing.

Severity legend: **P0** production blocker · **P1** serious · **P2** important · **P3** cleanup.

---

## P0 — Production Blockers

### P0-1. Hardcoded universal OTP login backdoor
**File:** `server/modules/auth/controller.ts:38-41`
```ts
if (phone === '+919999999999' || phone === '+91 9999999999') {
  code = '123456';
}
```
Any caller who requests an OTP for this specific phone number always receives OTP `123456`, in **every environment**, with no env-based gate at all. Since this is committed to a repo with a real GitHub remote, anyone who reads the source can log in as this account (or as any user who happens to register/login via this phone, if it's ever a real seeded account — it is: `9739063840`/`9876543210`/`9988776655` are the seeded admin/seller/buyer numbers per `server/server.ts` startup log, and `+919999999999` is a distinct hardcoded test bypass number).
**Impact:** authentication bypass for a fixed account, exploitable by anyone with read access to the code.
**Fix:** remove entirely, or gate behind `NODE_ENV !== 'production'` **and** a dedicated `ALLOW_TEST_OTP_BYPASS=true` env flag that must never be set in production. Recommend removing outright — QA can use the "developer bypass" below (also fixed) in non-prod instead.
**Status:** fixed in this pass (removed unconditionally; see Phase 1 changes).

### P0-2. OTP returned directly in the API response ("developer bypass")
**File:** `server/modules/auth/controller.ts:91-94`
```ts
} else {
  logger.info(`Developer bypass activated. OTP for ${phone} is ${code}`);
  return res.status(200).json({ success: true, bypassCode: code, message: 'Developer bypass' });
}
```
Whenever `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` are unset (misconfiguration, credential rotation gap, wrong env file, etc.), `POST /api/auth/otp/send` returns the **valid OTP in the JSON response** for **any phone number**, to **any caller**. This is a full authentication bypass triggered by a configuration accident, not an attack — the failure mode is silent and severe.
**Impact:** complete account takeover for any phone number if WhatsApp env vars are ever missing in production.
**Fix:** never return the code to the client. Gate the entire bypass path behind `NODE_ENV !== 'production'`; in production, missing WhatsApp credentials should fail the request loudly (500) rather than silently leak the OTP.
**Status:** fixed in this pass.

### P0-3. OTP logged in plaintext
**Files:** `server/modules/auth/controller.ts:54,92`, `server/modules/auth/service.ts:73`
```ts
logger.info(`[WhatsApp API] Attempting to send OTP ${code} to ${phone}`);
logger.info(`Developer bypass activated. OTP for ${phone} is ${code}`);
logger.info({ phone, otp }, 'OTP generated and logged');
```
OTPs are secrets for the duration of their validity. Logging them in plaintext means anyone with log access (which is often broader than "who can log in as this user") can authenticate as any user within the OTP's validity window.
**Impact:** credential exposure via logs/log aggregators.
**Fix:** never log OTP values. Log phone (or a hash of it) and outcome only.
**Status:** fixed in this pass.

### P0-4. Global TLS certificate verification disabled
**File:** `server/server.ts:8`
```ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```
Disables TLS verification for **every** outbound HTTPS call the Node process makes for its entire lifetime (Twilio, WhatsApp Graph API, any future Razorpay/GCS calls) — a standing MITM vulnerability, not scoped to any one request.
**Impact:** any outbound call can be intercepted/tampered with by a network-level attacker (rogue proxy, compromised DNS, corporate MITM device, malicious Wi-Fi).
**Fix:** remove unconditionally. If a specific local-dev proxy/AV issue requires it, scope it to a single `https.Agent({ rejectUnauthorized: false })` used only by that one dev-only call path, never process-wide, and never reachable when `NODE_ENV === 'production'`.
**Status:** fixed in this pass.

### P0-5. Per-request TLS bypass on Cunnekt WhatsApp call
**File:** `server/modules/auth/service.ts:57`
```ts
httpsAgent: new https.Agent({ rejectUnauthorized: false })
```
Same class of bug as P0-4, scoped to one call, but still active in production with no env gate.
**Status:** fixed in this pass (removed; this code path is legacy/superseded by the Prisma-backed WhatsApp OTP flow in `auth/controller.ts` — see P1-6 on provider drift).

### P0-6. Hardcoded admin credentials with insecure production fallback
**File:** `server/modules/auth/service.ts:190-191`
```ts
const validUsername = process.env.ADMIN_USERNAME || 'Fhoneify-web';
const validPassword = process.env.ADMIN_PASSWORD || 'Fhoneify@Get2go';
```
If `ADMIN_USERNAME`/`ADMIN_PASSWORD` are not set in the deployment environment, these exact hardcoded values (committed to git, visible in the public repo) become the real admin credentials.
**Impact:** admin panel takeover if the env vars are ever missing.
**Fix:** fail fast at startup in production if these are unset — never fall back to a hardcoded value.
**Status:** fixed in this pass.

### P0-7. Insecure JWT secret fallback
**File:** `server/config.ts:9`
```ts
JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
```
If unset, every JWT in the system (access tokens, refresh tokens, admin tokens) is signed with a publicly-known string from the repo. Anyone can forge a valid token for any user/role, including `admin`.
**Impact:** total authentication/authorization bypass.
**Fix:** fail fast at startup if `JWT_SECRET` is missing, in every environment (not just production) — there's no safe default for a signing secret.
**Status:** fixed in this pass.

### P0-8. Auth middleware fabricates an authoritative user from an unverified JWT claim
**File:** `server/middleware/auth.ts:33-45`
```ts
let user = users.find((u) => u.id === decoded.userId);
if (!user) {
  // Vercel serverless workaround: In-memory array might have reset.
  user = { id: decoded.userId, phone: 'restored-session', role: decoded.role as any || 'buyer' };
  users.push(user);
}
```
If the in-memory `users` array doesn't contain the user (guaranteed on every serverless cold start, or any restart), the middleware **fabricates** a full `User` object straight from the JWT's claims — including `role` — and treats it as authoritative for the rest of the request, including admin-gated routes (`requireAdmin` just checks `req.user.role === 'admin'`). Since JWTs are only verified for signature/expiry, not for whether the account still exists, is still that role, or hasn't been disabled, this means:
- A user whose role was ever `admin` at token-issue time keeps admin access via that token even if their real account is later demoted, disabled, or deleted (there's no way to detect deletion without a real backing store).
- On serverless (which the KT docs describe as the deployment target), this fabrication path is not an edge case — it's the *normal* path, since in-memory state doesn't survive between invocations at all.
**Impact:** JWT claims become the sole source of truth for identity/role, defeating the purpose of having a backing user store.
**Fix (this pass):** stop fabricating role from the token; only trust `userId`, and require any user info more privileged than "authenticated" to be re-derived from a persisted store. Since a full DB-authoritative migration (Phase 2) needs real Postgres credentials this session doesn't have, the interim fix applied here refuses to auto-grant `admin`/elevated roles via fabrication — a restored session is always treated as a plain `buyer` regardless of the token's `role` claim, and admin/seller-privileged actions must go through a path that can independently verify the account. This closes the privilege-persistence hole; it does not yet make the DB authoritative (that requires Phase 2 — see P1-1 and the Blocking Questions section).

---

## P1 — Serious

### P1-1. Business-critical state lives only in-process memory
**File:** `server/data.ts` (`users`, `listings`, `buy_orders`, `sell_orders`, `wallet ledger`, `notifications`, `pickups`, `quotes` are all plain arrays/Maps)
A full Prisma schema exists (`prisma/schema.prisma`, 16 models mirroring these exact types) but only `WhatsAppOTP` and `Lead` are actually persisted through Prisma. Everything else — every user, listing, order, wallet balance, and quote — is lost on every restart/redeploy, and cannot be shared across multiple server instances or serverless invocations.
**Impact:** data loss is not a failure mode here, it's the default behavior. Wallet balances, order history, and listings are non-durable.
**Fix:** migrate to Prisma-backed repositories for these entities (Phase 2). **Blocked** on a real `DATABASE_URL` to design/test migrations against — see Blocking Questions.

### P1-2. Fake Razorpay payment verification
**File:** `server/modules/payments/service.ts`
`verifyRazorpayPayment()` never calls Razorpay. It looks up an internal order by the `razorpayOrderId` your own `createOrder()` generated (`rzp_order_${Date.now()}`) and marks it paid — no signature check, no server-to-server verification, no webhook. The `razorpay` package isn't even a dependency.
**Impact:** any authenticated buyer can mark their own order "paid" for free; sellers get wallet-credited with no money having moved.
**Fix:** implement real order creation + signature verification + webhook verification per Razorpay's current documented flow (Phase 4). **Blocked** on real Razorpay API keys to implement/test against — see Blocking Questions. Interim mitigation applied this pass: none functional is possible without credentials; flagging as a hard gate before this endpoint can go live with real money.

### P1-3. IDOR: `getOrderById` never checks ownership
**File:** `server/modules/buy/service.ts:87-92`
```ts
export function getOrderById(userId: string, id: string): BuyOrder | null {
  // Let admins view any order, otherwise check if it belongs to the user
  const order = buy_orders.find((o) => o.id === id);
  if (!order) return null;
  return order;
}
```
The comment describes an ownership check that was never implemented — `userId` is accepted but unused. Any authenticated buyer can fetch any other buyer's order (address, price, Razorpay order ID) by ID.
**Impact:** horizontal privilege escalation / data exposure.
**Fix:** enforce `order.userId === userId` unless the caller is an admin. **Fixed in this pass** — this is an unambiguous bug (the comment shows intent), not a business decision.

### P1-4. No rate limiting anywhere
No `express-rate-limit` (or equivalent) dependency exists. OTP send/verify, admin login, and quote generation are all unlimited. Combined with P0-1/P0-2, this means the OTP surface is currently wide open.
**Impact:** brute-forceable OTP (6 digits, no lockout), credential-stuffing against admin login, cost/DoS exposure on quote generation.
**Fix:** add `express-rate-limit` scoped to OTP/login/admin routes as an in-process limiter for now (this pass). Note this is **per-instance**, not distributed — once there are multiple server instances, this needs Redis-backed limiting (Phase 6, blocked on real Redis).

### P1-5. Wide-open CORS
**File:** `server/server.ts:52` — `app.use(cors())` with no origin restriction, despite `ARCHITECTURE.md` claiming "CORS enabled for frontend domain."
**Fix:** restrict to an explicit allowlist driven by `FRONTEND_URL`/`CORS_ORIGINS` env var. **Fixed in this pass.**

### P1-6. Notification provider drift (three parallel implementations)
Three different OTP/notification code paths coexist:
1. `server/data.ts` in-memory `otps` Map + `server/modules/auth/service.ts` (Twilio initialized but unused; actually sends via Cunnekt WhatsApp API).
2. `server/modules/auth/controller.ts` — a separate, newer, Prisma-backed `WhatsAppOTP` flow using Meta's WhatsApp Graph API directly.
3. `Twilio` client is constructed (`twilio(...)`) but never actually called anywhere in the reviewed code.
**Impact:** unclear which path is actually live in production; maintenance burden; the two OTP flows have different security postures (one has the TLS bypass and hardcoded test number, the other has the response-leak bypass).
**Fix:** consolidate to one provider and one OTP code path. **Not fixed in this pass** — this is a product/infra decision (which provider is actually contracted — Twilio, Cunnekt, or Meta WhatsApp Business API) that needs your input; see Blocking Questions.

### P1-7. No security headers (no Helmet)
No `helmet` dependency. Missing `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.
**Fix:** add `helmet()` with sane defaults. **Fixed in this pass.**

### P1-8. Startup log prints seeded credentials
**File:** `server/server.ts` (removed) — previously logged: `Pre-seeded phone credentials: Admin (9000000000) | Seller (9988776655) | Buyer (9876543210)`.
**Fix:** removed in this pass.

### P1-9. B2B module: zero authentication, hardcoded identity fallback
**Files:** `server/modules/b2b/routes.ts`, `server/modules/b2b/controller.ts`
Found during Phase-2 re-audit (searching for the *same class* of bug the earlier fixes closed, not just re-checking the original list). The routes file had an explicit comment: *"For the demo, we won't strictly enforce requirePartner middleware... In a real app, we would add: `router.use(requirePartner)`"* — i.e., a known, acknowledged gap. Every write endpoint (`getWallet`, `claimLead`, `placeBid`) computed its identity as `(req as any).user?.id || 'partner-1'`. Since there was no auth middleware at all, `req.user` was always `undefined`, so **every single caller, authenticated or not, always acted as `'partner-1'`** — anyone could view partner-1's wallet, claim leads as partner-1, and place auction bids as partner-1 with a client-supplied, unvalidated `amount`.
**Practical impact today:** low — `B2BService` is entirely mocked (static auction/lead data, `claimLead`/`placeBid` don't touch any real ledger or auction state), so no real money or data is at risk *yet*. This is flagged at P1 rather than P0 because of that, but it is a landmine: the exact moment this module is wired to real wallet/auction state (which the code's own shape implies is the intent), this becomes a live financial vulnerability with zero additional changes needed to exploit it.
**Fix:** applied `requireAuth` to the three identity-bound routes (left `/auctions` and `/leads` public/read-only, matching the public listing-browse pattern used elsewhere); removed the `'partner-1'` fallback entirely so these endpoints now correctly use `req.user.id` and 401 if unauthenticated. A distinct `partner`/`tech` role-based middleware (as opposed to just "any authenticated user") is a reasonable follow-up but wasn't added in this pass — it's a small role-system addition, not a bug fix, and deserves its own review rather than being bundled in silently.

### P1-10. Logistics module: zero authentication on a payment-authorizing endpoint
**Files:** `server/modules/logistics/routes.ts`, `server/modules/logistics/controller.ts`
Same shape of bug as P1-9, independently discovered. `getFloat`/`getPickups` used a hardcoded `techId = 'u-tech-1'` with a `// Hardcoded tech ID for demo` comment. Worse: `requestRequote` and `verifyOtp` (the re-quote-and-approve-payment flow — the success message literally says *"Re-quote approved and payment authorized"*) had **no authentication at all** and accepted an arbitrary client-supplied `pickupId` with no ownership check, and no rate limiting on the OTP verification.
**Fix:** applied `requireAuth` to the whole router; `getFloat`/`getPickups` now use `req.user.id` instead of the hardcoded ID. Note this is a behavior change for the current demo flow if nothing actually logs in as `u-tech-1` — that's the correct outcome of closing the vulnerability, not a bug, but flagging it since the previous demo UI may have depended on the old hardcoded-identity behavior to show tech dashboard data without a real tech login.

### P1-11. Hardcoded white-label partner API key
**File:** `server/modules/external/routes.ts`
`if (apiKey !== 'test-white-label-key')` — a literal string checked directly in source, visible to anyone with repo access, for the white-label trade-in API used by 3rd-party resellers.
**Fix:** moved to `WHITE_LABEL_API_KEY` env var; the endpoint now fails closed (401) if the env var isn't configured, rather than accepting a publicly-known key.

### P1-12. Hardcoded WhatsApp webhook verify token; no webhook signature verification
**File:** `server/modules/webhook/controller.ts`
`token === 'fhoneify_secure_webhook_2026'` — same hardcoded-secret pattern as above, used to verify Meta's webhook subscription handshake. Separately, and more importantly: `receiveWebhook` (the POST handler that processes actual incoming events) has **no signature verification at all** — no `X-Hub-Signature-256` HMAC check against Meta's app secret. Right now this only logs message/status events, so the practical impact of a forged payload is limited, but per your own brief's explicit ask to test "forged webhook" scenarios, this is a real gap the moment this handler does anything beyond logging.
**Fix (this pass):** moved the verify token to `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var (preserved the previous value in the untracked local `.env` so the existing Meta webhook registration keeps working — **recommend rotating this value with Meta**, since the old one was exposed in a public repo). **Not fixed this pass:** HMAC signature verification on `receiveWebhook`. Implementing it correctly requires capturing the *raw* request body before Express's JSON body-parser consumes it (`express.json({ verify: ... })`), which is a global body-parsing change I didn't want to make unreviewed under time pressure without being able to test it against a real Meta-signed payload — writing verification code that looks right but was never validated against a real signature would be exactly the kind of "fake implementation" your brief tells me not to produce. Recommend as an early Phase-3 task once `WHATSAPP_APP_SECRET` is available to test against.

### P1-13. Reviews module is a non-functional stub, not wired to real orders
**File:** `server/modules/reviews/service.ts`
`createReview(orderId, rating, comment)` never checks that `orderId` belongs to the authenticated caller (or that it exists at all), never records who the reviewer was, and writes into a local, non-exported `mockReviews` array that `getReviewsForListing` doesn't even filter by `listingId` (it returns the same full array regardless of which listing was requested). Not classified as an IDOR because there's no real protected data at stake — the whole feature is currently inert — but it's clearly incomplete rather than intentionally minimal, and shouldn't be mistaken for a working reviews system when it comes time to build the real one.
**Fix:** not fixed this pass (feature completion, not a security fix); documented so it isn't mistaken for working.

### P1-14 (cosmetic, no security impact). Dead `bypassCode` UI paths
**Files:** `app/auth/page.tsx`, `app/quote/page.tsx`
After closing P0-2 (the OTP-in-response bypass), the frontend still had `if (data.bypassCode) { ... }` blocks reading a field the backend now never sends. Not exploitable — this code simply never executes now — but left in place it reads as if "bypass mode" is still a supported, intentional feature, which could mislead a future developer. Removed both references.

---

## Independent re-verification (Phase 2)

Every P0 and P1 fix from the first pass was re-checked in this session by reading the current code (not by trusting the earlier summary) and grepping the entire tracked source tree for recurrence:

- **OTP backdoor (`+919999999999` → `123456`):** confirmed absent — `git grep` for the phone number and for `123456` as an OTP literal found nothing in `server/`.
- **OTP-in-response bypass:** confirmed no code path anywhere sets a `bypassCode` (or similarly named) field on any API response; verified by re-reading the full current `sendOtp` implementation line-by-line.
- **TLS bypass:** confirmed zero occurrences of `NODE_TLS_REJECT_UNAUTHORIZED` or `rejectUnauthorized: false` anywhere in tracked `.ts`/`.tsx`/`.js` source.
- **Hardcoded admin/JWT secrets:** confirmed `JWT_SECRET` has no fallback anywhere it's used (7 call sites, all through the single `config.JWT_SECRET`, which throws at import time if unset); confirmed `adminLoginWithPassword` fails closed with no hardcoded fallback.
- **Auth-middleware role fabrication:** confirmed the restored-session path is hardcoded to `role: 'buyer'` with no path that reads `decoded.role`.
- **`getOrderById` IDOR:** confirmed `order.userId !== userId` check is present and is the only caller-facing use of this function (grepped for all call sites).

This pass also actively searched for *other instances of the same bug classes* rather than only re-checking the original list, which is how P1-9 through P1-14 above were found. All are now fixed except P1-12's signature verification and P1-13 (feature completeness), both explicitly called out above with the reason they weren't fixed blind.

---

## P2 — Important

### P2-1. Zero automated tests
No `*.test.*`/`*.spec.*` files anywhere, no test runner configured in `package.json`. The pricing engine — the entire business differentiator — has no regression protection at all.
**Fix (this pass):** added a lightweight, dependency-free regression test harness (`scripts/test/pricing.regression.test.ts`, run via `npm run test:pricing`) that freezes current pricing engine output as golden values across all brand branches and boundary conditions, per your explicit instruction to protect this logic. Broader unit/integration/E2E suites are Phase 11 work and require decisions about a test framework (Vitest recommended, zero conflicts with existing Next.js/tsx tooling) — see Blocking/Optional Questions.

### P2-2. `server/modules/quote/service.ts` had an uplift-consistency bug (fixed previously this session)
Already fixed and pushed (`eefac53`) prior to this audit — noted here for completeness of the audit trail, not a new finding.

### P2-3. Extensive use of `any` (86 occurrences across `server/modules/*`)
Undermines the type safety TypeScript is meant to provide, especially around `diagnostics: any` in quote/pricing paths and Prisma payloads.
**Fix:** not addressed in this pass (large surface, low risk relative to P0/P1 items); recommend tackling incrementally, module by module, with the pricing-engine type in particular tightened to the existing `DiagnosticsType`.

### P2-4. `console.log`/`console.error` instead of structured Pino logging
Present in `server/modules/admin/service.ts`, `server/modules/quote/service.ts`, and numerous root-level debug/scrape scripts (`server/check-order.ts`, `server/test-*.ts`, etc.).
**Fix:** not addressed in this pass for the debug scripts (see P3 cleanup); the two production module files should be migrated to `logger` as low-risk follow-up.

### P2-5. No centralized/typed environment config validation
`server/config.ts` reads `process.env` directly with defaults; no fail-fast validation of required variables at boot, no schema.
**Fix (this pass):** added fail-fast validation for `JWT_SECRET` and admin credentials specifically (the P0 items). A full typed config module (e.g. Zod-validated `env.ts` covering every required var per environment) is recommended as Phase 1 follow-up but wasn't expanded to every variable in this pass to keep the change surface reviewable.

---

## P3 — Cleanup

### P3-1. Massive repository clutter
Root directory contains dozens of one-off scrape/debug artifacts: `cashify_dump.html` (1MB+), `cashify_html.txt` (1.7MB+), multiple `.rar`/`.zip` icon archives, `temp_icons`–`temp_icons4`, `gsap-zip-temp/`, screenshots, and ~150 one-off `add_*.js`/`remove_*.js`/`update_*.js`/`test_*.ts` scripts at the repo root.
**Status:** a large cleanup (moving/deleting most of these) is **already in progress as uncommitted work in this working tree** (not part of this audit's commits — left untouched per instruction not to disturb existing pending work). That pending cleanup currently leaves `scripts/archive/` with broken relative imports that fail `next build` if committed as-is — flagged to you separately, not fixed here since it's not this task's scope.

### P3-2. Competitor scraping artifacts committed to the repo
`cashify-session.json`, `cashify_screenshot*.png`, `pricing-reverse-engineering.skill`, `puppeteer-extra-plugin-stealth` dependency. Per your instructions, this pass does **not** touch, expand, or remove the pricing engine's dependency on this historically-derived calibration data. Flagging only the legal/compliance angle as previously noted: scraping a competitor's live site with a stealth plugin carries ToS/legal exposure independent of code quality. This is a business/legal decision, not something to resolve in code.

### P3-3. Dead pricing engine duplicate
`lib/pricingEngine/` (split-into-per-brand-files version of the pricing logic) is not imported anywhere in the live app — `lib/pricingCalculator.ts` (single-file version) is the one actually used by `app/quote/page.tsx`. Not removed in this pass (zero functional risk either way, and deletion wasn't asked for); flagged for a future cleanup decision.

---

## Summary counts

| Severity | Count | Fixed | Blocked (needs credentials/decision) | Deferred (feature work, not a fix) |
|---|---|---|---|---|
| P0 | 8 | 8 | 0 | 0 |
| P1 | 14 | 10 | 4 | 0 |
| P2 | 5 | 2 | 0 | 3 |
| P3 | 3 | 0 (deliberately untouched) | — | — |

P1 count includes 6 new findings from the Phase-2 independent re-audit (P1-9 through P1-14), found by actively searching for the same bug classes elsewhere in the codebase rather than only re-verifying the original list. Of those 6: 4 fixed (B2B auth gap, logistics auth gap, hardcoded white-label key, hardcoded webhook verify token), 1 partially fixed and explicitly documented as such (webhook signature verification not implemented - needs a real signing secret to test against safely), 1 documented as a feature-completeness gap rather than a security fix (reviews module stub).

See `PRODUCTION_READINESS_REPORT.md` for the phase-by-phase implementation record and the consolidated Blocking Questions list.
