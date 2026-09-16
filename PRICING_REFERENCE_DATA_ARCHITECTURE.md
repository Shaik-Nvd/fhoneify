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

**Update: Postgres is now the real, live, authoritative store.** `DATABASE_URL` turned out to be already configured and reachable (a Supabase-hosted Postgres instance, already in production use by the `User`/`Lead`/`WhatsAppOTP` models) - this was verified directly (`npx prisma db pull` connected successfully; existing row counts checked before touching anything: 4 users, 17 leads, 9 OTP records, all untouched by anything below).

What was actually done, in order:
1. Reviewed the exact SQL the new schema would apply (`npx prisma migrate diff ... --script`) before running anything - confirmed **purely additive**: two new enums, two new tables (`ReferencePrice`, `ReferencePriceHistory`), their indexes, and one foreign key. Zero `ALTER`/`DROP` on any existing table.
2. Applied it with `npx prisma db push` (this project's own established convention - it already had no `prisma/migrations` history and used `db push` in its `start:api` script, so this matches existing practice rather than introducing a new one).
3. Verified existing data untouched immediately after: user/lead counts unchanged.
4. Implemented `lib/referencePricing/postgresStore.ts` - a `PostgresReferencePriceStore` satisfying the exact same `ReferencePriceRepository` interface as the file store, so nothing that consumes a repository needed to change.
5. Added `lib/referencePricing/getStore.ts` - the one factory (`getReferencePriceRepository()`) every real consumer (the quote service, the admin API) now uses: Postgres when `DATABASE_URL` is configured, the file store otherwise. This is the "repository abstraction fully designed so the file-backed store can be replaced by Postgres without changing pricingCalculator.ts" requirement, now actually exercised, not just designed.
6. Ran the full migration (`migrate-legacy-snapshots` + `import-brand-snapshots`) against real Postgres: **2,200 devices migrated, 4,474 history entries created**, 4 users / 17 leads still exactly as before.

**Verified with hard evidence, not claims:**
- **Restart safety:** started the server, got a quote, killed the process, started a brand-new process (new PID, new `PrismaClient`), requested the identical quote — byte-identical result. This is the actual Step 12 "test restart behavior" requirement, demonstrated, not asserted.
- **Concurrency safety:** fired three concurrent `create()` calls for the same `deviceKey` directly at Postgres — the unique constraint correctly accepted exactly 1 and rejected 2. This is a property the file store explicitly could not provide (documented in its own limitation comment) and Postgres provides for free.
- **Admin API against real data:** `GET /api/admin/reference-prices/status` (real admin login, real JWT) against the live Postgres-backed data: `{"totalDevices":2200,"withReferencePrice":2115,"coveragePercent":96.1,"byStatus":{"fresh":2108,"stale":4,"missing":85,"refresh_failed":3}}`.

**File store (`lib/referencePricing/store.ts`) is retained**, not deleted - it's still the correct backing for environments without `DATABASE_URL` (e.g. local dev without a DB configured) and is what the test suite's isolated unit tests use (temp files, never touching real data). `getReferencePriceRepository()` falls back to it automatically if Postgres initialization fails for any reason, logging why.

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

**Implemented, safe, no legal exposure, and genuinely automated:** `lib/referencePricing/sources/legacySnapshotSource.ts` + `scripts/reference-pricing/import-brand-snapshots.ts`. This repo already contained 17 per-brand snapshot files (`oppo/oppo_prices.json`, `samsung/samsung_prices.json`, etc. — 2,357 raw entries total, each with a real Cashify source URL) obtained before this task, sitting unused. This is not scraping — it's parsing files already on disk — so it needed no legal decision to wire up. Result: **1,882 devices matched and imported**, cutting the missing-reference count from 1,023 (46%) to 85 (3.9%). Re-running `npm run reference-prices:refresh-all` whenever a new/updated snapshot file is legally obtained and dropped into a brand folder re-ingests it automatically, safely (see the ordering fix below).

**Also implemented, safe, no legal exposure:** `lib/referencePricing/sources/manualSource.ts` + the admin API endpoint (`POST /api/admin/reference-prices/submit`) — an operator manually checks Cashify (or any source) themselves and submits a verified price.

**Real bug found and fixed while building the brand-snapshot importer:** `refreshDevice()` originally overwrote the current value on any successful match regardless of which observation was actually more recent - re-running the legacy migration and the brand-snapshot import in sequence let 486 devices' current prices get silently overwritten by an OLDER snapshot's value just because it ran second. Fixed by comparing `observedAt` against the existing record's `lastVerifiedAt` and refusing to regress (the older observation is still recorded in history, just not promoted to current) - now unit-tested for both "older observation is rejected" and "processing order doesn't affect the final result" (`scripts/test/pricing.reference-data.test.ts`). Re-verified: 0 regressions, 924 legitimate new entries.

**Previously not implemented, now implemented (sign-off given):** a live Cashify source. Earlier passes left this out pending an explicit decision on using the repo's scraping infrastructure in production; that decision has since been made, so the live path is now built. The `PriceSource` interface accepted it without modification, as designed.

### 9a. The live Cashify refresh (automatic, every 7 days)

**Reuses the existing scraper.** No second scraper was written. `server/modules/quote/cashifyReferenceSnapshot.ts` imports `getCashifySessionFiles()` and `getCashifyBrowser()` from the existing `server/modules/quote/cashifyScraper.ts` and reuses its session rotation, shared Chromium instance and headless configuration.

It reads a *different thing* from the same pages, and that difference matters: `scrapeCashifyPrice()` walks the whole diagnostics questionnaire and returns a **condition-adjusted** price, whereas `calculateFhoneifyPrice(brand, model, baseMarketPrice, answers)` expects the **listed base price** and applies Fhoneify's own age/defect/bill/accessory rules to it. Storing a condition-adjusted number as the reference price would double-apply those penalties and silently change every quote. So the reference read stops immediately after variant selection.

**One refactor to the existing scraper**, needed for unattended operation and not affecting pricing: session discovery and browser boot were extracted into `getCashifySessionFiles()` / `getCashifyBrowser({ headless })` / `closeCashifyBrowser()` so both read paths share one definition. Each caller states its own launch mode: `scrapeCashifyPrice()` keeps its original **headed** launch, unchanged; the scheduled reference read launches **headless**, because a CI runner has no display. `CASHIFY_SCRAPER_HEADED=true` forces a visible window for either (the local "solve a CAPTCHA by hand" mode). `scrapeCashifyPrice()`'s behaviour is otherwise unchanged.

**Identity is re-verified against the page that was actually loaded** (`lib/referencePricing/sources/cashifyIdentity.ts`). The scraper can land on the wrong page — a generated slug 404s into search, a variant chip doesn't exist and the previous selection stays active — so nothing is trusted on the strength of the URL alone:
- the page's device name must equal the catalog's brand+model **exactly** after formatting-only normalization ("OnePlus 15" never satisfies "OnePlus 15R");
- the selected variant's RAM **and** storage must both match ("12 GB/256 GB" never satisfies "12 GB/512 GB"); if one side expresses RAM and the other does not, that is ambiguous and is **rejected**, not guessed;
- the price must carry an INR marker — a dollar figure is refused rather than stored as rupees;
- 1,859 of 2,200 devices carry a curated variant-specific `cashifyLink` in the seed catalog, which is used in preference to a generated slug. A generated slug is still identity-verified, so a bad guess is rejected rather than trusted.

Unlike `scrapeCashifyPrice()`, the reference read **never falls back to Cashify's search results**. For an interactive lookup a near-miss device is a visible annoyance; for a stored reference price that silently feeds every future quote it is the exact failure this system exists to prevent.

**Scheduling (Phase 9): GitHub Actions, weekly.** `.github/workflows/reference-price-refresh.yml` runs `cron: '30 2 * * 0'` — 02:30 UTC every Sunday, exactly 7 days apart. (A `*/7` day-of-month field would *not* be every 7 days: it resets each month and fires twice in three days at month boundaries.)

Why not Vercel: the app is on Vercel's free plan, where a function is capped at 10s and cannot hold a Chromium process; a full-catalog run drives a real browser across ~2,200 pages for over an hour. Vercel Cron only triggers HTTP requests, so it cannot host this either. GitHub Actions gives a runner with Chromium, a 6-hour job limit and a built-in scheduler, free on a public repo and inside the 2,000 free minutes/month on a private one. **No paid service is introduced.**

**Concurrency is guarded twice** (Phase 9): the workflow's `concurrency: reference-price-refresh` group with `cancel-in-progress: false` stops GitHub starting a second run, and `lib/referencePricing/refreshLock.ts` holds a TTL'd, heartbeated database lock that also covers runs started from anywhere else (a laptop, a manual dispatch). The lock is acquired with a conditional `updateMany` so Postgres — not application code — decides the winner of a race. A run that loses the lock exits **75**, which the workflow reports as a notice rather than a failure.

**Failure safety (Phase 6) is structural, not conditional.** The failure path (`recordFailure` in `ingestion.ts`) is a separate function that simply does not mention `currentPrice` or `lastVerifiedAt`, so a preserved price is visible in the code rather than depending on a branch being right. A device that fails keeps its last valid price and is marked `refresh_failed`; a run where everything fails is reported `FAILED` with every price intact.

**Reporting and monitoring (Phases 12-13):** every run writes a `ReferencePriceRefreshRun` row (discovered/updated/unchanged/rejected/failed/missing/flagged/not-attempted, duration, status, and the full report text) and prints the same report to the CI log and job summary. `GET /api/admin/reference-prices/status` now includes last-attempted/last-successful/last-counts; `GET .../refresh-runs` and `GET .../suspicious` expose run history and the flagged-price review queue. `npm run reference-prices:status` answers the same question from a terminal.

**`scripts/reference-pricing/refresh-all.ts` is unchanged** and remains the snapshot-file path for debugging/emergency use. Normal production operation is the scheduled Cashify job; nobody edits a price by hand.

### 9b. Cashify session material

`cashify-sessions/*.json` and `cashify-session.json` are Playwright `storageState` files containing **live Cashify session cookies**, and they are currently **tracked in this repository** (pre-existing, not introduced by this work). Anyone with repository access has those sessions.

CI does not use them: the workflow reads the `CASHIFY_SESSION_STATE` secret and materializes a 0600 session file at runtime, logging nothing about its contents. They were deliberately **not** untracked here, because a deployed build (Docker/Render) that relies on the committed copy for the on-demand market-price endpoint would break. Remediation, when you want it: invalidate the sessions in Cashify, `git rm --cached cashify-sessions/*.json cashify-session.json`, add them to `.gitignore`, and supply sessions via the secret everywhere. Note that rewriting history would be needed to remove them from past commits.

## 10. Operational visibility (Phase 12)

`server/modules/referencePricing/` (admin-only, gated by the existing `requireAuth`+`requireAdmin` middleware):

- `GET /api/admin/reference-prices/status` — coverage summary (total devices, count by status, coverage %).
- `GET /api/admin/reference-prices/devices/:status` — list every device in a given status (e.g. all `stale` devices needing attention).
- `GET /api/admin/reference-prices/device/:deviceKey` — full record + history for one device.
- `POST /api/admin/reference-prices/submit` — manual verified-price submission (the safe refresh path above).

Backend/API only, per the explicit instruction to build the reporting foundation before a UI — no admin dashboard page was added. Now Postgres-backed and verified live (Section 4).

## 11. Quote flow integration (Step 10) — DONE, not just designed

**`server/modules/quote/service.ts` (`POST /api/quote`, the real Express endpoint) now genuinely resolves its base price from the reference-price repository**, not from a directly-imported JSON file. Verified end-to-end, live, against real Postgres data (not a mock):

```
$ curl -X POST /api/quote -d '{"deviceId":"...","condition":"like_new"}'
{"estimatedPrice":44000,...,"referenceStatus":"stale","referenceSource":"brand_snapshot:oppo/oppo_prices.json","referenceLastVerifiedAt":"2026-07-08T20:39:20.000Z"}
```

Also fixed the dependency that broke this file in the first place: it previously imported a server-local duplicate pricing engine (`./pricingCalculator`) that depended on an untracked config file lost to filesystem sync issues earlier in this project. Rather than reconstruct lost pricing constants (forbidden - that's guessing at business logic), it now imports the one real, canonical engine (`lib/pricingCalculator.ts` - the same one `app/quote/page.tsx` uses), closing the frontend/backend duplicate-implementation risk flagged in `PRODUCTION_READINESS_AUDIT.md`.

**Missing/stale behavior (Step 11) is implemented and configurable, not hardcoded:** `QUOTE_STRICT_REFERENCE_MODE` env var (default `false`, preserving today's live behavior exactly).
- **Default (off):** a device with `stale`/`refresh_failed`/`missing` status still gets a quote (falls back to `basePrice` if genuinely missing, exactly as before this system existed) — but the response now honestly reports `referenceStatus`, `referenceSource`, `referenceLastVerifiedAt` instead of hiding it. Verified live: a genuinely-missing device (Apple iPhone X 128GB) still returns `estimatedPrice: 9720` with `referenceStatus: "missing"`.
- **Strict mode (on):** a genuinely missing device returns `409 { error: "REFERENCE_PRICE_UNAVAILABLE" }` instead of a fabricated quote. Verified live with the same device under `QUOTE_STRICT_REFERENCE_MODE=true`.
- Devices with *some* reference (even stale) are never blocked by strict mode — only true `missing` is. Verified live.

**The client-side flow (`app/quote/page.tsx`) also now consumes the reference-price system**, via the materialized-view pattern rather than a live per-request call (Step 10 explicitly requires the quote path not synchronously depend on external lookups): `lib/cashify_prices.json` and `server/data/cashify_prices.json` are now both regenerated from the authoritative store by `scripts/reference-pricing/export-cashify-prices.ts`, verified byte-for-byte safe before being promoted (Section 9's ordering-bug fix made this: 1,191/1,191 existing values preserved exactly, 0 regressions, 924 legitimate new entries added, both files now identical - closing the 130-key frontend/backend drift found in the original security audit).

## 12. Business decision — narrowed, not eliminated

The **default** behavior for stale/missing devices is now settled (preserve existing behavior, exposed honestly - see Section 11), so this is no longer "undecided" in the sense of blocking anything. What remains a genuine product decision, not an engineering one:

(a) should `QUOTE_STRICT_REFERENCE_MODE` ever be turned on (and for which devices/conditions)?
(b) should the *client-side* quote page visibly show a staleness indicator to the user (it currently doesn't - the data feeding it is now honest and governed, but the UI itself wasn't touched, per the explicit "don't redesign the quote page" instruction)?

`lib/cashify_prices.meta.json` (freshness/match-confidence per device) already contains everything needed to implement either, whenever you decide to.

## 13. Testing

Four test suites now exist, each protecting a different layer, none redundant with another:

| Suite | File | Protects | Result |
|---|---|---|---|
| A (pre-existing) | `pricing.regression.test.ts` | The pricing formula itself | **27/27 pass, unchanged** |
| B (prior pass) | `pricing.cashify-comparison.test.ts` | Data completeness/consistency across the catalog | passes; missing-reference count now 85 (was 1,023) |
| C (prior pass, extended this pass) | `pricing.reference-data.test.ts` | Freshness classification, strict matching (incl. both trap cases), validation/anomaly policy, Phase-8 failure-preservation, **and the order-independence fix** | **28/28 pass** |
| D (new this pass) | `pricing.quote-integration.test.ts` | The REAL quote flow actually consumes the repository (not a bypassed path); OPPO Find X9s / OnePlus 15R without hardcoded screenshot values; 5 unrelated devices | **9/9 pass** |

Run all four: `npm run test:pricing:all`.

## 14. Files changed/added

```
prisma/schema.prisma                                       - +2 models (ReferencePrice, ReferencePriceHistory) - MIGRATED to live Postgres
lib/referencePricing/types.ts                               - new
lib/referencePricing/freshnessPolicy.ts                     - new
lib/referencePricing/matching.ts                             - new
lib/referencePricing/validation.ts                           - new
lib/referencePricing/store.ts                                - new (file-backed store + BufferedReferencePriceStore)
lib/referencePricing/postgresStore.ts                        - new: real Postgres-backed repository
lib/referencePricing/getStore.ts                              - new: the factory every consumer uses (Postgres if DATABASE_URL, else file)
lib/referencePricing/getBulkRepository.ts                     - new: bulk-script variant (buffers file writes; Postgres used directly)
lib/referencePricing/ingestion.ts                             - new (+ observedAt/order-independence fix this pass)
lib/referencePricing/sources/legacySnapshotSource.ts          - new (+ observedAt param)
lib/referencePricing/sources/manualSource.ts                  - new
scripts/reference-pricing/migrate-legacy-snapshots.ts         - new, one-time migration (+ concurrency fix this pass)
scripts/reference-pricing/import-brand-snapshots.ts           - new this pass: legal, automatable ingestion from 17 existing per-brand snapshot files
scripts/reference-pricing/categorize-missing.ts               - new, Phase 4 report
scripts/reference-pricing/export-cashify-prices.ts            - new, now promoted to drive the LIVE data files
scripts/reference-pricing/refresh-all.ts                      - new this pass: single entrypoint for migrate+import+export
scripts/test/pricing.reference-data.test.ts                   - Suite C, +2 order-independence tests this pass (28 total)
scripts/test/pricing.quote-integration.test.ts                - new this pass, Suite D
server/modules/referencePricing/{service,controller,routes}.ts - admin API, now Postgres-backed
server/modules/quote/service.ts                                - REWRITTEN this pass: now async, resolves reference price from the repository, uses the canonical lib/pricingCalculator.ts instead of a broken local duplicate
server/modules/quote/controller.ts                             - updated for the async signature + strict-mode 409 response
server/test_s25_ultra.ts                                       - trivial await fix for the async signature change (dead debug script)
server/server.ts                                               - +1 route registration
tsconfig.server.json                                           - rootDir widened to include lib/referencePricing (type-check only)
package.json                                                   - +10 npm scripts
lib/cashify_prices.json, server/data/cashify_prices.json      - REGENERATED from the verified store this pass (0 regressions, 924 legitimate additions, now identical to each other - closes the 130-key drift from the original audit)
lib/pricingCalculator.ts                                       - UNCHANGED
```

Data files generated by running the scripts (not hand-edited, reproducible from source): `lib/cashify_prices.generated.json`, `lib/cashify_prices.meta.json`, and (fallback-only path) `server/data/reference-prices/store.json`.

## 15. Production safety notes

- Concurrency, real (Postgres): verified directly - 3 concurrent `create()` calls for the same `deviceKey` correctly yielded exactly 1 success + 2 rejections via the unique constraint.
- Concurrency, file-store fallback: serializes writes via an in-process queue (tested), but does **not** solve cross-instance concurrency - documented in the class itself. Only relevant when `DATABASE_URL` is absent.
- Restart safety: verified directly - killed the server process, started a brand-new one, identical quote data returned.
- The order-independence bug (Section 9) was a real defect found and fixed during this pass, not a hypothetical - it actually altered 486 devices' data before the fix.
- Corrupt-file handling: a corrupted store file fails loudly (throws) rather than silently behaving as if all data is missing, which could otherwise mask real data loss as "everything just needs re-verification."
- Idempotency: re-running the migration script is safe — it re-derives the same records from the same source data and overwrites them identically (verified via the export round-trip check).
