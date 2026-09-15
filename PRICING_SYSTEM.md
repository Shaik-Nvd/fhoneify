# Fhoneify — Production Pricing System

How a customer price is produced, verified, and stored. Companion to `PRICING_REFERENCE_DATA_ARCHITECTURE.md`, which covers how reference prices are ingested.

**The methodology is unchanged.** Every price still comes from `calculateFhoneifyPrice` in `lib/pricingCalculator.ts`: the brand curves, the 4%/6%/8% uplift tiers, and the ₹2,000 cap. `npm run test:pricing` (27/27 golden cases) passes. Suite E also checks all ~6,600 catalog-device × condition combinations against the raw engine and finds zero differences.

## 1. What was wrong

| # | Problem | Consequence |
|---|---|---|
| 1 | The price was computed only in the browser. `POST /api/quote/leads` stored whatever `quotedPrice` the client sent. | Anyone could create a pickup lead at any price. |
| 2 | Lead and quote `answers` were `z.any()`. | A malformed payload could crash the engine (`hardware.forEach` on a string). |
| 3 | Browser and API resolved base prices differently: snapshot key vs. repository `deviceKey`. | The two sides could disagree about the same device. |
| 4 | The "Get upto" price used an uncapped uplift. | It could advertise more than any final quote pays (e.g. iPhone 17 Pro Max at ₹120,000: ₹122,699 shown vs. ₹119,980 real maximum). |
| 5 | `ingestion.ts` compared timestamps as strings. Postgres returns `…T20:39:20.000Z` for a snapshot stamped `…T02:09:20+05:30`. | Re-running refreshes let a URL-less legacy record replace a brand-snapshot record, stripping `sourceUrl`. This is why Suite D's OPPO Find X9s test fails against live Postgres. |
| 6 | Pickup leads were posted with a relative `fetch`. | The request bypassed `NEXT_PUBLIC_API_URL` and the auth header. |
| 7 | No `trust proxy` setting. | Behind Render's proxy, every customer shared one rate-limit bucket. |
| 8 | The live Cashify scraper endpoint was unauthenticated and unlimited in production. | Legal and cost exposure (audit P3-2). |
| 9 | `lib/pricingEngine/` was an unused second copy of the engine. | Risk of drift and edits landing in the wrong copy. |

## 2. Flow

```
quote page ──(instant local estimate: lib/pricing/engine.ts)──► shows price
     │
     └─ POST /api/quote/price {brand, model, storage, diagnostics}
            parseDiagnostics            (lib/pricing/diagnostics.ts)
            findCatalogDevice           (lib/pricing/catalog.ts)
            repository.get(deviceKey)   (1.5s timeout → snapshot fallback)
            resolveBaseMarketPrice      repository > snapshot > catalog basePrice
            priceDevice                 calculateFhoneifyPrice + guardrails
            signQuoteToken              HMAC-SHA256, device + diagnostics hash + price + expiry
        ◄── { fhoneifyPrice, startingPrice, quoteToken, expiresAt, referenceStatus, ... }
     │
     └─ POST /api/quote/leads {…, answers, quoteToken, quotedPrice}
            verifyLeadPrice:
              valid token for SAME device + SAME diagnostics → token price (price lock)
              otherwise                                     → recomputed now
            Lead.quotedPrice = verified price (never the client's number)
            Lead.answers     = { ...validated diagnostics, pricing: audit }
```

## 3. Components

| File | Role |
|---|---|
| `lib/pricing/engine.ts` | Browser-safe. Base-price resolution, `priceDevice` guardrails, `computeStartingPrice`, `PRICING_ENGINE_VERSION`. |
| `lib/pricing/diagnostics.ts` | Zod schema. Enforces shape and size (≤40 items, ≤120 chars), strips unknown keys, dedupes lists. Keeps `charger` absent when not answered, because the Samsung/Vivo branches depend on that. |
| `lib/pricing/catalog.ts` | Brand/model/storage → catalog device. Case- and whitespace-insensitive only, never fuzzy. |
| `lib/pricing/quoteToken.ts` | Server only. Sign/verify with constant-time comparison; order-insensitive diagnostics hash. |
| `lib/pricing/pricingService.ts` | Server only. `quote()` and `verifyLeadPrice()`. Dependencies are injected. |
| `server/modules/quote/pricing.ts` | Wires the service to the real repository, secret, and config. |

### Guardrails (`priceDevice`)
A price is refused with `PRICING_INVARIANT_VIOLATION` (logged at error level, never shown or stored) if:
- it is not an integer,
- it is below the ₹100 floor,
- it is below the depreciated price, or
- it is above `maxPlausiblePrice(base)`: the base plus every accessory bonus (or the fixed ₹1,200 non-working price, whichever is higher), with the capped uplift applied.

### Quote tokens
Payload: `{v, dk (deviceKey), dh (diagnostics hash), p (price), pv (engine version), iat, exp}`. The payload is signed, not encrypted, so it deliberately contains no base or competitor figures. Tokens are stateless, so they survive restarts and work across instances. A token is rejected, and the price recomputed, if it is expired, tampered, or issued for a different device or different answers. The rejection reason is recorded in the lead's audit.

### Lead audit (`Lead.answers.pricing`)
The audit records:
- `priceSource` (`quote_token` or `recomputed`)
- `fhoneifyPrice`, `pricingVersion`, `pricedAt`, `tokenIssuedAt`
- `tokenRejectedReason`
- `clientQuotedPrice`, `clientPriceMismatch`
- the current recomputed price, base price and source, depreciated price, reference status, source, and last-verified time

It sits in the existing `answers` JSON, so no migration is needed. The admin views read diagnostics keys by name and are unaffected.

## 4. API

`POST /api/quote/price`

| Status | Meaning |
|---|---|
| 200 | `{ device, fhoneifyPrice, startingPrice, quoteToken, expiresAt, pricingVersion, referenceStatus, referenceLastVerifiedAt, referenceLookupDegraded }` |
| 400 | `INVALID_DIAGNOSTICS` or a missing field |
| 404 | `DEVICE_NOT_FOUND` |
| 409 | `REFERENCE_PRICE_UNAVAILABLE`: no price source, or strict mode with only the catalog `basePrice` |
| 500 | `PRICING_INVARIANT_VIOLATION` |

`referenceStatus` values: `fresh` / `approaching_stale` / `stale` / `refresh_failed` (repository), `unknown` (snapshot fallback), `missing` (catalog `basePrice`).

`POST /api/quote/leads` accepts `quoteToken` (optional). `quotedPrice` is now optional and used only for audit. It returns the same error codes as `/price`.

`POST /api/quote` (legacy) now validates `answers` and returns 400 on invalid input.

`POST /api/quote/cashify-price` returns 503 unless `ENABLE_LIVE_MARKET_PRICE_SCRAPE=true`. It defaults to on outside production; the UI only offers it on localhost.

## 5. Configuration

| Variable | Default | Purpose |
|---|---|---|
| `QUOTE_SIGNING_SECRET` | derived from `JWT_SECRET` (HMAC, domain-separated) | Quote-token key; set it to rotate independently of logins |
| `QUOTE_TOKEN_TTL_MINUTES` | 1440 | Price-lock window |
| `REFERENCE_PRICE_LOOKUP_TIMEOUT_MS` | 1500 | Repository read timeout before snapshot fallback |
| `QUOTE_STRICT_REFERENCE_MODE` | false | Refuse devices priced only by catalog `basePrice` |
| `QUOTE_PRICE_RATE_LIMIT` / `QUOTE_LEAD_RATE_LIMIT` / `QUOTE_MARKET_PRICE_RATE_LIMIT` | 120 / 20 / 10 | Per IP, per 15 minutes |
| `ENABLE_LIVE_MARKET_PRICE_SCRAPE` | off in production | Live scraper endpoint |
| `TRUST_PROXY_HOPS` | 1 in production, else 0 | Real client IP for rate limits |

## 6. Customer-visible change

"Get upto" now uses the engine's capped uplift. For devices where 4% of the depreciated price exceeds ₹2,000 (roughly a ₹50,000+ depreciated price), the figure is lower than before. It now equals the best final price the device can actually receive. Final quotes are unchanged.

## 7. Tests

`npm run test:pricing:all` now includes Suite E, `pricing.production.test.ts` (34 cases, in-memory repository, no live data). It covers:
- diagnostics validation
- whole-catalog engine parity
- resolution order
- read-time freshness
- the uplift cap on "Get upto"
- guardrails
- token tamper, expiry, device and diagnostics binding
- repository failure and timeout fallback
- strict mode
- server-verified lead prices
- the timezone-safe ingestion rules

Suite D (`pricing.quote-integration.test.ts`) still runs against whatever `DATABASE_URL` points to, and writes a probe record there. Point it at a non-production database.

## 8. Operational follow-ups

1. **Repair the stripped source URLs.** After deploying the ingestion fix, run `npm run reference-prices:refresh-all` against production. Suite D's OPPO Find X9s `sourceUrl` assertion should then pass.
2. **Promote `answers.pricing` to a column** (`Lead.pricing Json?`) when the planned money-as-integer migration lands, so pricing audits can be queried directly.
3. **Distributed rate limiting.** The limiters are still in-process (audit P1-4); move them to Redis before running more than one API instance.
