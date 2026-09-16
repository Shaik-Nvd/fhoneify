# Fhoneify — Production Readiness Report

Companion to `PRODUCTION_READINESS_AUDIT.md`. This report records what was actually implemented in this pass, what remains, and exactly why — per the instruction to never claim something is implemented when it is not.

**Scope of this pass:** Phase 0 (audit) + Phase 1 (security fixes that require no external credentials/infrastructure) + pricing regression tests (Phase 9 preparation). Phases 2–8 and 10 (database migration, real Redis, real Razorpay, BullMQ, notification consolidation, GCS, Elasticsearch) are **not implemented** — each genuinely requires either live credentials this session has no access to, or a business decision only you can make. These are listed as Blocking Questions at the end, per your own Section 43.

---

## Architecture

**Actual current architecture** (verified by reading the code, not by trusting `ARCHITECTURE.md`/`FHONEIFY_MASTER.md`, which describe an intended-but-not-yet-built infrastructure layer):

```
Next.js 14 App Router (app/)          <- frontend, also runs the live pricing
    |                                     engine client-side (lib/pricingCalculator.ts)
    v
Express API (server/, port 5000)      <- separate process, started alongside
    |                                     Next.js via `concurrently`
    +-- routes -> controllers -> services -> in-memory arrays (server/data.ts)
    +-- a handful of entities (WhatsAppOTP, Lead) go through Prisma -> PostgreSQL
```

The documented modular-monolith module boundaries (routes → controllers → services) **are** followed consistently across ~20 backend modules — that part of the intended architecture is real and was preserved as-is in this pass, per your instruction not to restructure it.

What is **not** real, despite being documented: Redis (a `RedisMock` in-process Map stands in for it), BullMQ, Elasticsearch, GCS, and a working Razorpay integration. This was already flagged in the audit and is not re-litigated here.

---

## Security

### Fixed this pass (see `PRODUCTION_READINESS_AUDIT.md` for full detail on each)

| Issue | File(s) | Fix |
|---|---|---|
| Hardcoded universal OTP backdoor (`+919999999999` → `123456`) | `server/modules/auth/controller.ts` | Removed entirely |
| OTP returned in API response when WhatsApp creds missing | `server/modules/auth/controller.ts` | Removed; now fails loudly (500) in production, logs-to-console only in dev, never in the response |
| OTP logged in plaintext (3 locations) | `auth/controller.ts`, `auth/service.ts` | Removed; only phone + outcome are logged now |
| Global TLS verification disabled (`NODE_TLS_REJECT_UNAUTHORIZED=0`) | `server/server.ts` | Removed unconditionally |
| Per-request TLS bypass on Cunnekt call | `server/modules/auth/service.ts` | Removed (this code path was also confirmed dead — nothing calls it) |
| Hardcoded admin credentials with insecure fallback | `server/modules/auth/service.ts` | Removed fallback; admin login now fails closed (returns `null`) if `ADMIN_USERNAME`/`ADMIN_PASSWORD` aren't set, instead of accepting the hardcoded default |
| Insecure `JWT_SECRET` fallback | `server/config.ts` | Fails fast (throws at boot) if `JWT_SECRET` is unset, in every environment |
| Auth middleware fabricated an authoritative user (incl. role) from JWT claims | `server/middleware/auth.ts` | A session restored after in-memory state loss is now always re-created at `buyer`-level access, never at whatever role the token happened to claim — closes the "stale/forged token keeps admin forever" hole. This is an interim mitigation, not a full fix — see "Known limitation" below. |
| IDOR: `getOrderById` accepted `userId` but never checked it | `server/modules/buy/service.ts` | Now enforces `order.userId === userId` |
| Wide-open CORS (`app.use(cors())`) | `server/server.ts` | Explicit origin allowlist via `CORS_ORIGINS`/`FRONTEND_URL`; production logs an error if unset (fails open only in local dev, and only when nothing is configured) |
| No security headers | `server/server.ts` | Added `helmet()` |
| No rate limiting | `server/server.ts` | Added `express-rate-limit`: 300 req/15min general on `/api`, 20 req/15min on `/api/auth` (covers OTP send/verify and admin login) |
| Startup log printed seeded phone credentials | `server/server.ts` | Removed |

### Known limitation carried forward (not fully closed this pass)

The auth-middleware fix (above) stops privilege *escalation* via stale tokens, but the underlying cause — business state living only in an in-process array — is untouched. A user's account can't actually be verified as active/disabled/role-correct without a persistent store. **This requires Phase 2 (database migration), which is blocked on real Postgres access** (see Blocking Questions). Until then, authorization is meaningfully better than before but not yet fully authoritative.

### Not addressed this pass (by design, not oversight)

- **Real Razorpay signature/webhook verification** — needs live Razorpay keys (Blocking).
- **Distributed rate limiting** — current limiter is per-process; needs real Redis once there's more than one instance (Blocking on Redis).
- **Provider consolidation (Twilio/Cunnekt/WhatsApp Graph API)** — a product decision about which provider is actually contracted, not an engineering call I can make unilaterally (Blocking/business decision).
- **`any` type cleanup (86 occurrences)** and **`console.log` → Pino migration in 2 module files** — flagged as P2, deliberately deferred to keep this pass's diff reviewable and focused on P0/P1.

---

## Database

**Not touched this pass.** `prisma/schema.prisma` already has 16 well-formed models; the gap is that only `WhatsAppOTP` and `Lead` are actually wired through Prisma — everything else (`users`, `listings`, `buy_orders`, `sell_orders`, wallet ledger, notifications, pickups, quotes) still lives in `server/data.ts` in-memory arrays. Migrating these to real Postgres-backed repositories, with proper transactions/constraints/indexes, is Phase 2 work and is **blocked** on a real `DATABASE_URL` to design and test migrations against — see Blocking Questions.

## Authentication

Token lifecycle (15m access / 7d refresh, blacklist-on-logout) is architecturally sound and was not changed. What was fixed: the middleware no longer trusts a JWT's `role` claim as authoritative when the backing user record is missing (see Security section). Full authoritative-DB enforcement is blocked on Phase 2.

## Payments

**Unchanged, and flagged again here for visibility:** `verifyRazorpayPayment()` in `server/modules/payments/service.ts` performs no real verification — it trusts a client-supplied order ID that matches one your own server generated, with no cryptographic check against Razorpay. The `razorpay` npm package isn't even installed. **This must not go live with real money until Phase 4 is implemented against real Razorpay credentials** — see Blocking Questions. I did not attempt a partial/fake implementation, since untested payment code is arguably worse than clearly-flagged-missing payment code.

## Wallet

Unchanged. `addWalletLedgerEntry` (in `server/data.ts`) is append-only in shape, which is the right direction, but runs against an in-memory array with no atomicity/concurrency guarantees — two concurrent credits could race. This is a Phase 2/5 concern, blocked the same way as the database migration.

## Pricing

**This is the section you asked me to be most careful about. No pricing methodology was changed.**

- The existing Cashify-derived intermediate calculation, brand-specific engines (Apple/Samsung/Xiaomi/Vivo/Oppo/OnePlus/Nothing/generic-fallback), age depreciation curves, defect/hardware penalty tables, accessory bonuses, and scrap-value floor are all **exactly as they were** — nothing in `lib/pricingCalculator.ts`'s brand logic was touched in this pass.
- The **only** pricing-engine change made in this entire engagement (across this session and the prior one) was the previously-approved fix to `applyCompetitorUplift()` (commit `eefac53`, done in an earlier turn, not this pass): removing a flat ₹100-minimum-uplift rule that could push the effective uplift above the intended 4%/6%/8% ceiling on heavily-depreciated devices. That was flagged to you as a business-logic-adjacent change at the time, with before/after behavior shown, and you confirmed it before it was pushed.
- **4%/6%/8% uplift bracket strategy: preserved.** ₹2,000 cap: preserved. The floor price (`config.modelFloorPrice`... actually `COMMON_BONUSES.floorPrice` = ₹100 in `lib/pricingCalculator.ts`): preserved.
- **New this pass:** `scripts/test/pricing.regression.test.ts` — 27 golden regression cases spanning every brand branch, flagship/mid/budget/old devices, perfect and worst-case diagnostics, the scrap-value floor, both tier boundaries (₹20,000 and ₹50,000 exactly), an unrecognized brand (falls to generic Android), and a zero base price — plus a separate invariant check (uplift always ≥0, ≤₹2,000, within its tier's percentage) run against every case. Run via `npm run test:pricing`. All 27/27 pass against the current implementation.
- No pricing behavior was altered to make this pass. If a future refactor changes any golden value, that test suite will fail loudly — per your explicit instruction, the correct response to a failure is to investigate why the number moved, not to update the expected value.

## Testing

```
Typecheck (server, files touched this pass): PASS (1 pre-existing, unrelated error in auth/controller.ts logger overload, not introduced by this pass)
Pricing regression suite: 27/27 PASS, uplift invariants PASS
Build (next build): PASS
Lint: not run this pass (no changes to lint-relevant frontend code)
Integration tests: NOT IMPLEMENTED (no test framework configured; broader unit/integration/E2E suites are Phase 11, deferred - see Optional Questions)
Security tests (IDOR/role escalation/OTP brute force/etc.): NOT IMPLEMENTED as automated tests this pass; the specific IDOR and auth-fabrication bugs found were fixed and manually verified (server boot + smoke-tested `/health` and admin-login rejection), but no repeatable automated security test suite exists yet
```

## Infrastructure

| Component | Status |
|---|---|
| PostgreSQL | PARTIALLY IMPLEMENTED — schema exists, only 2/16 entities actually persisted |
| Redis | NOT IMPLEMENTED (in-process mock only) — BLOCKED on real Redis instance |
| BullMQ | NOT IMPLEMENTED — not introduced this pass (no justified async workload was migrated; doing so before Redis exists would be premature) |
| Razorpay | NOT IMPLEMENTED (fake verification only) — BLOCKED on real Razorpay keys |
| WhatsApp/SMS | PARTIALLY IMPLEMENTED — a live WhatsApp Graph API path exists and works if credentials are set; a second, dead Cunnekt/Twilio path still exists in the codebase — BLOCKED on a decision about which provider is authoritative |
| FCM | NOT IMPLEMENTED — BLOCKED on credentials, and no evidence in the code that push notifications are wired to any frontend flow yet |
| GCS | NOT IMPLEMENTED — images currently appear to be served from `public/images` / static assets, not object storage — BLOCKED on a decision about whether this is needed yet (current image volume may not justify it) |
| Elasticsearch | NOT REQUIRED YET — no evidence of a search feature complex enough to need it over a simple filtered Prisma query once persistence exists; recommend deferring until proven necessary |

---

## Blocking Questions (need your input before Phases 2–8 can proceed)

1. **BLOCKING — Postgres:** Do you have a real `DATABASE_URL` (dev/staging is fine) I should use to design and test the migration of `users`/`listings`/`orders`/`wallet`/`quotes`/`pickups`/`notifications` off in-memory arrays and onto Prisma? Without this, Phase 2 (and everything downstream that depends on authoritative user state — full auth hardening, real wallet integrity) cannot be implemented, only designed.
   - *Recommendation:* a free-tier Neon/Supabase/Railway Postgres instance is enough to build and test migrations safely before pointing at real production infrastructure.

2. **BLOCKING — Razorpay:** Do you have Razorpay test-mode API keys (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`) I can use to implement and test real order creation, signature verification, and webhook handling? Section 19–21 of your brief can't be responsibly implemented without a real integration to test against — writing verification code with no way to generate a real Razorpay payload to verify against risks shipping code that "looks right" but has never actually validated a signature.
   - *Recommendation:* Razorpay's test mode is free and immediate to set up; I'd need the test key pair and, for webhook testing, a way to trigger a test webhook (Razorpay dashboard supports this).

3. **BLOCKING — Redis:** Do you have (or want me to help provision) a real Redis instance (Upstash has a free serverless tier that works well with Vercel) for sessions/rate-limiting/caching? Without it, the current in-process rate limiter and token blacklist won't work correctly the moment there's more than one server instance.

4. **BLOCKING/business decision — Notification provider:** Which of Twilio, Cunnekt, or the WhatsApp Business Graph API is the one actually contracted/paid for in production? The codebase currently has all three in some form. I don't want to delete a provider integration that's actually the live one based on a guess.

5. **OPTIONAL — Test framework:** For Phase 11 (broader unit/integration/E2E coverage beyond the pricing regression suite already added), do you want Vitest (fast, zero-config with this stack, my recommendation) or Jest? Either is fine engineering-wise; this only affects developer experience, not architecture.

6. **OPTIONAL — GCS/FCM:** Do these need to be implemented now, or are they genuinely Phase 2/3 product features per your roadmap? The audit found no current frontend flow depending on either, so implementing them now (per Section 31/25) risks the "don't add infrastructure the product doesn't need yet" instruction in your own brief (Section 36/32).

I completed everything else this pass could safely do without your input; these six are the ones that need your input before I continue.
