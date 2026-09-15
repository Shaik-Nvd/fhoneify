# Fhoneify — Reference Pricing Data Architecture

Companion to `PRICING_ACCURACY_INVESTIGATION.md`. This document describes the infrastructure built to fix the ROOT CAUSE that investigation found (stale, unverified reference-price data with no freshness tracking) without touching the pricing formula itself.

**The existing pricing methodology is unchanged.** `lib/pricingCalculator.ts` — `calculateFhoneifyPrice`, `applyCompetitorUplift`, every brand-specific depreciation curve, the 4%/6%/8% uplift tiers, the ₹2,000 cap — is not modified by anything in this document. `npm run test:pricing` (27/27) is unaffected before and after this work.

---

## 1. The problem, restated as an architecture gap

The pricing engine was never wrong. It correctly consumed whatever `basePrice` it was given. The gap was entirely upstream: **there was no concept of "how old is this reference price" anywhere in the system.** A price scraped once, months ago, and a price scraped five minutes ago were indistinguishable — both were just a number in a JSON file. This document fixes that gap.

## 2. Old data lifecycle (how a price reached the pricing engine before this work)

```
Someone runs a one-off scrape script (e.g. update_oneplus.js)
        ↓
Result is hand-copied into lib/seed_devices.ts (basePrice) and/or
lib/cashify_prices.json, with no timestamp, no source record, no
match-confidence record
        ↓
app/quote/page.tsx imports the JSON file directly into the client bundle
        ↓
calculateFhoneifyPrice(brand, model, basePrice, diagnostics) runs
        ↓
Fhoneify price shown to the user, with zero way for anyone (developer,
operator, or the code itself) to know if that number is 2 days old or
10 weeks old
```

Two additional, independently-discovered problems in this old lifecycle (documented in `PRODUCTION_READINESS_AUDIT.md` and the investigation doc, not re-litigated here):
- `server/data/cashify_prices.json` (used by the legacy Express `/api/quote` route) and `lib/cashify_prices.json` (used by the live client-side quote page) had **130 keys with different values** for the same device — a second, independent source of "which price is real" ambiguity.
- **46% of the catalog (1,023 devices)** had no reference price at all and silently used raw `basePrice` with zero external grounding.

## 3. New data lifecycle

```
External reference source (Cashify today; pluggable)
        ↓
PriceSource.fetch() — a narrow interface, one implementation per source
        ↓
lib/referencePricing/ingestion.ts — validates the observation
  (validation.ts: reject only malformed values, flag-not-reject large swings),
  matches it to a device (matching.ts: strict, conservative, refuses
  ambiguous matches), and idempotently upserts it
        ↓
ReferencePriceRepository (store.ts) — durable record with full freshness
  metadata: source, sourceUrl, matchConfidence, lastVerifiedAt,
  lastAttemptedAt, lastFailureAt/Error, consecutiveFailures, status,
  plus an append-only history log
        ↓
freshnessPolicy.ts classifies status (fresh / approaching_stale / stale /
  missing / refresh_failed) from lastVerifiedAt + failure state, computed
  live on every read - never a stale cached status field
        ↓
(pricing engine - UNCHANGED, still just receives a basePrice number)
```

The pricing engine's inputs are unchanged today — see Section 8 for exactly why, and what the explicit business decision is that would change that.

## 4. Data model

Implemented in two parallel places, intentionally:

- **`prisma/schema.prisma`** — `ReferencePrice` and `ReferencePriceHistory` models. This is the target Postgres schema. **Not yet migrated to a live database** — blocked on `DATABASE_URL`, the same blocking item raised in `PRODUCTION_READINESS_REPORT.md` Phase 2 and never yet resolved. `npx prisma validate` and `npx prisma generate` both succeed against this schema (verified), but no `prisma migrate` has been run because there is no database to run it against.
- **`lib/referencePricing/types.ts` + `store.ts`** — the same shape, implemented today against a durable file-backed store (`FileReferencePriceStore`), accessed only through the `ReferencePriceRepository` interface. Every consumer (ingestion, admin API, export script) depends on the interface, not the file implementation, so swapping to a real Postgres-backed repository once `DATABASE_URL` exists is a one-file change.

**Honest limitation, stated plainly (also in the code as a comment on the class, so it isn't lost):** the file store survives process restarts/crashes (atomic write-then-rename, never a half-written file) but does **not** survive a Render redeploy (ephemeral filesystem per deployed image) unless the file is committed into git, and does **not** provide cross-instance consistency if the app ever runs more than one backend instance. This is exactly what real Postgres persistence would fix and this interim store does not. It is the right backing for local development, CI test runs, and the one-time historical migration; it is not a substitute for the Phase 2 database migration for a scaled production deployment.

## 5. Freshness policy

`lib/referencePricing/freshnessPolicy.ts`, configurable via env (`REFERENCE_PRICE_WARNING_AGE_DAYS`, default 14; `REFERENCE_PRICE_MAX_AGE_DAYS`, default 30) rather than hardcoded.

**Why 14/30, not some other number:** chosen specifically because the investigation found real prices for brand-new flagship devices moving ~3x within 10-12 weeks. A single global TTL has to be tight enough to catch that fast-depreciation case; 30 days as the hard "stale" threshold means the exact OPPO/OnePlus scenario (75+ days old) is caught with real margin, not on a technicality. This is a starting point, not a claim of statistical optimality — if the catalog later wants slower thresholds for devices known to be >1 year old (which move more slowly), that's a real, reasonable refinement, and is exactly the kind of business/product tuning decision that should be made deliberately rather than picked by me — flagged in Section 9.

A record can be `refresh_failed` even while its underlying price is still "fresh" by age, if there have been recent failed refresh attempts — this is deliberate: an operator needs visibility that the pipeline is broken independent of how old the data happens to be at that moment.

## 6. Matching strategy

`lib/referencePricing/matching.ts`. The explicit design principle, stated in the investigation brief and taken literally: **a wrong reference price is worse than a missing one.** This module does not do semantic fuzzy matching across different model names. It only collapses pure string *formatting* (case, whitespace, punctuation, "GB" vs "gb") — anything that differs after that normalization (a different generation number, a missing/extra "R"/"Pro"/"Max" suffix, a different storage size) is reported as `unmatched`, never guessed.

Tested explicitly (see `scripts/test/pricing.reference-data.test.ts`) against the two trap cases named in the brief: "OnePlus 15R" vs "OnePlus 15" → `unmatched`; two different storage variants of the same model → `unmatched`.

A second matcher, `findLegacyMatch`, reproduces the *existing* `${model}-${storage}` lookup-key algorithm used throughout the live app byte-for-byte, so migrating existing data through this system cannot change which price any device resolves to today (verified — see Section 7).

## 7. Migration of existing data

`scripts/reference-pricing/migrate-legacy-snapshots.ts` (Phase 17). Imports every device in `lib/seed_devices.ts` against `lib/cashify_prices.json` using the legacy-compatible matcher, and — critically — **backdates `lastVerifiedAt` to real evidence of when the price was actually observed, never to "now".** Where per-entry evidence exists (the two investigated devices, traced to `oppo/oppo_prices.json`'s and `update_oneplus.js`'s git commit dates), that specific date is used. Where it doesn't (the bulk of the 1,758-entry consolidated file, edited many times with no per-entry history), the whole file's own last-commit date is used as a documented, conservative **upper bound** on freshness — the true age could be older, never younger, so this cannot understate staleness in a way that hides a problem, only in a way that's honestly labeled as an approximation.

Ran once: **1,191 devices imported with a reference (all immediately classified, correctly, as `stale`)**, **1,023 devices recorded as `missing`** (matching the investigation's finding exactly).

**Verification that this migration is behavior-preserving:** `scripts/reference-pricing/export-cashify-prices.ts` regenerates a `cashify_prices.generated.json` from the new store and diffs it against the original `lib/cashify_prices.json` — **0 mismatches across all 1,191 overlapping keys**, confirmed by running it. The new system reproduces today's exact behavior before anything is changed on top of it.

## 8. Missing-data categorization (Phase 4)

`scripts/reference-pricing/categorize-missing.ts`, run against the full catalog:

| Category | Count | % of missing |
|---|---|---|
| Near-miss key exists (a related entry — often a *different storage variant* of the same model — exists, but not the exact one needed) | 91 | 8.9% |
| No near-miss anywhere — reference data was never collected for this brand/model at all | 932 | 91.1% |

The dominant failure mode (91%) is **category F: data was simply never collected**, concentrated heavily in older/budget Realme, Nokia, and similar models — not a matching bug. The 8.9% "near-miss" group is worth a targeted human look (some may be genuinely fixable coverage gaps — e.g. a device where only one storage variant was ever scraped), but I want to be precise about what "near-miss" does and doesn't mean here: it means *a related key exists*, not *this is definitely a fixable lookup bug* — several of the examples are legitimately different variants (e.g. an 128GB entry existing while a 256GB variant is genuinely never priced), not a normalization defect.

**Categories B, E, G, H (storage/variant matching specifics, genuine Cashify unavailability, scraper-never-ran-for-this-brand, other) cannot be distinguished by static analysis of the two data files alone** — resolving them needs either checking Cashify's site directly per brand or auditing which `add_*.js`/`update_*.js` scripts were actually run historically. Not guessed at here, per the explicit instruction not to fabricate resolution of what can't be determined.

**No prices were fabricated for any of the 1,023 devices.** They remain `missing` in the new store, exactly reflecting reality, and are surfaced (not hidden) via the admin reporting endpoint below.

## 9. Ingestion / automated refresh — what's implemented vs. blocked

**Implemented:** `lib/referencePricing/ingestion.ts` — a source-agnostic orchestrator with bounded concurrency, retry-with-backoff, and the Phase-8 guarantee (a failed refresh only ever increments a failure counter and records the error; it never touches `currentPrice` or `lastVerifiedAt` — this exact behavior is unit-tested).

**Implemented, safe, no legal exposure:** `lib/referencePricing/sources/manualSource.ts` + the admin API endpoint (`POST /api/admin/reference-prices/submit`) — an operator manually checks Cashify (or any source) themselves and submits a verified price. This is a legitimate, fully-legal refresh path and is the only one wired end-to-end today.

**NOT implemented, and deliberately so:** a live scraper adapter that automatically queries Cashify's site. This repo already contains extensive scraping infrastructure (`puppeteer-extra-plugin-stealth`, numerous `cashify-test*.js`/`scrape*.js` scripts) built before this task, and `PRODUCTION_READINESS_AUDIT.md` (P3-2) already flagged that using it in production carries unresolved legal/ToS exposure requiring your explicit sign-off. This task's own brief says the same thing directly: *"If a scraping infrastructure/legal decision is still required, STOP before implementing a potentially non-compliant mechanism."* That's what I did — the `PriceSource` interface is built and ready to accept a live-scraper implementation the moment that decision is made, but I have not built or wired one.

**Scheduling (Phase 9):** not automated in this pass, for the same reason — automating catalog-wide refresh only makes sense once there's an approved, legal source to automate. The `refreshCatalog()` function is ready to be invoked by a cron entry, a Render scheduled job, or (once Redis/BullMQ exist per `PRODUCTION_READINESS_REPORT.md` Phase 2/6) a queued job — whichever the ingestion-source decision implies is appropriate. Not adding BullMQ speculatively here, per the explicit "don't introduce infrastructure the product doesn't need yet" instruction.

## 10. Operational visibility (Phase 12)

`server/modules/referencePricing/` (admin-only, gated by the existing `requireAuth`+`requireAdmin` middleware):

- `GET /api/admin/reference-prices/status` — coverage summary (total devices, count by status, coverage %).
- `GET /api/admin/reference-prices/devices/:status` — list every device in a given status (e.g. all `stale` devices needing attention).
- `GET /api/admin/reference-prices/device/:deviceKey` — full record + history for one device.
- `POST /api/admin/reference-prices/submit` — manual verified-price submission (the safe refresh path above).

Backend/API only, per the explicit instruction to build the reporting foundation before a UI — no admin dashboard page was added.

## 11. Business decision required (Phase 11) — explicitly not decided here

**The pricing engine's actual inputs are unchanged in this pass.** `app/quote/page.tsx` still reads `lib/cashify_prices.json` directly, exactly as before. This was a deliberate choice, not an oversight: automatically excluding stale/missing devices from the live price lookup, or changing what the app shows for them, is a real product behavior change (it would alter live quotes for potentially hundreds of devices) that falls squarely under the brief's own instruction not to silently choose a new business policy.

**What you need to decide:** once reference prices are refreshed (manually, for now) and the store's `fresh`/`stale`/`missing` status is trustworthy, should the live quote page:
(a) keep using `lib/cashify_prices.json` as-is regardless of staleness (today's behavior, safest / no user-facing change), or
(b) prefer `basePrice` over a stale/missing cashify reference once some age threshold is crossed, or
(c) show an explicit "estimated, price under review" state to the user for stale/missing devices, or
(d) something else.

A companion file, `lib/cashify_prices.meta.json`, is generated by `scripts/reference-pricing/export-cashify-prices.ts` and contains exactly the freshness/match-confidence data needed to implement whichever of these you choose — nothing in the live pricing path reads it yet.

## 12. Testing

Three test suites now exist, each protecting a different layer, none redundant with another:

| Suite | File | Protects | Result |
|---|---|---|---|
| A (pre-existing) | `pricing.regression.test.ts` | The pricing formula itself | 27/27 pass, unchanged |
| B (added last investigation) | `pricing.cashify-comparison.test.ts` | Data completeness/consistency across the catalog | passes, reports 1,023 missing + 19 divergent >15% |
| C (added this pass) | `pricing.reference-data.test.ts` | Freshness classification, strict matching (incl. both trap cases), validation/anomaly policy, and the Phase-8 failure-preservation guarantee | 26/26 pass |

Run all three: `npm run test:pricing && npm run test:pricing:reference && npm run test:pricing:reference-data`.

## 13. Files changed/added

```
prisma/schema.prisma                                    - +2 models (ReferencePrice, ReferencePriceHistory), target schema only
lib/referencePricing/types.ts                            - new
lib/referencePricing/freshnessPolicy.ts                  - new
lib/referencePricing/matching.ts                         - new
lib/referencePricing/validation.ts                       - new
lib/referencePricing/store.ts                            - new
lib/referencePricing/ingestion.ts                        - new
lib/referencePricing/sources/legacySnapshotSource.ts      - new
lib/referencePricing/sources/manualSource.ts              - new
scripts/reference-pricing/migrate-legacy-snapshots.ts     - new, one-time migration
scripts/reference-pricing/categorize-missing.ts           - new, Phase 4 report
scripts/reference-pricing/export-cashify-prices.ts        - new, verification + freshness-metadata export
scripts/test/pricing.reference-data.test.ts               - new, Suite C
server/modules/referencePricing/{service,controller,routes}.ts - new, admin API
server/server.ts                                          - +1 route registration
tsconfig.server.json                                      - rootDir widened to include lib/referencePricing (type-check only; runtime already worked via tsx)
package.json                                              - +5 npm scripts
lib/cashify_prices.json                                   - UNCHANGED (not touched - see Section 11)
lib/pricingCalculator.ts                                  - UNCHANGED
```

Data files generated by running the scripts (not hand-edited, reproducible from source): `server/data/reference-prices/store.json`, `lib/cashify_prices.generated.json`, `lib/cashify_prices.meta.json`.

## 14. Production safety notes

- Concurrency within one process: the file store serializes writes via an in-process queue, so concurrent `refreshDevice` calls in one Node process can't interleave a read-modify-write and lose an update (tested).
- Cross-process/cross-instance concurrency: **not solved by this interim store** — this is exactly what the Postgres migration (transactions, row locking) provides and a local file cannot. Do not run refresh jobs from more than one instance concurrently against the file store.
- Corrupt-file handling: a corrupted store file fails loudly (throws) rather than silently behaving as if all data is missing, which could otherwise mask real data loss as "everything just needs re-verification."
- Idempotency: re-running the migration script is safe — it re-derives the same records from the same source data and overwrites them identically (verified via the export round-trip check).
