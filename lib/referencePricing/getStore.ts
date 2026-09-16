import { ReferencePriceRepository, getDefaultReferencePriceStore } from './store';

// Standalone scripts (scripts/reference-pricing/*.ts) invoke this module
// directly, without going through server/config.ts's dotenv.config() call -
// so DATABASE_URL would silently read as undefined and this factory would
// silently fall back to the file store with no error, even when a real
// database is configured. Loading .env here, once, covers every entry
// point (the app, which already loads it again harmlessly via
// server/config.ts, and every standalone script) consistently.
require('dotenv').config();

/**
 * The single factory every real consumer (the app, the migration/import
 * scripts) should use - NOT getDefaultReferencePriceStore() directly,
 * which is always file-backed and exists for tests/tooling that
 * specifically want that.
 *
 * Returns the Postgres-backed repository when DATABASE_URL is configured
 * (verified reachable in this environment - see
 * PRICING_REFERENCE_DATA_ARCHITECTURE.md Section 12), falling back to the
 * file-backed store otherwise (local dev without a database, or if the
 * Postgres client fails to load for any reason). This is exactly the
 * "repository abstraction fully designed so the file-backed store can be
 * replaced by Postgres without changing pricingCalculator.ts" requirement
 * - satisfied by construction, since every consumer already only depends
 * on the ReferencePriceRepository interface.
 */
let cached: ReferencePriceRepository | null = null;

export function getReferencePriceRepository(): ReferencePriceRepository {
  if (cached) return cached;

  let resolved: ReferencePriceRepository | undefined;

  if (process.env.DATABASE_URL) {
    try {
      // Lazy require so environments without @prisma/client generated
      // (or without DATABASE_URL) never pay the cost/risk of loading it.
      const { PrismaClient } = require('@prisma/client');
      const { PostgresReferencePriceStore } = require('./postgresStore');
      const prisma = new PrismaClient();
      resolved = new PostgresReferencePriceStore(prisma);
    } catch (err: any) {
      console.error('[referencePricing] DATABASE_URL is set but the Postgres store failed to initialize; falling back to the file-backed store:', err.message);
    }
  }

  cached = resolved ?? getDefaultReferencePriceStore();
  return cached;
}

/** Test-only: clears the cached instance so a test can force
 * re-evaluation of DATABASE_URL (e.g. after temporarily unsetting it). */
export function _resetReferencePriceRepositoryCacheForTests(): void {
  cached = null;
}

/**
 * Test-only: pins the repository to an explicit instance, bypassing
 * DATABASE_URL entirely.
 *
 * This exists because unsetting DATABASE_URL is NOT sufficient to keep a test
 * off the production database. `server/lib/prisma.ts` constructs a
 * PrismaClient at import time, and Prisma searches parent directories for a
 * .env - so merely importing anything in the server module graph can silently
 * re-inject a production DATABASE_URL before this factory ever runs. Any test
 * that touches the quote flow must call this FIRST and then import the quote
 * service dynamically, so "this test cannot write to production" is
 * structurally true rather than a matter of import ordering.
 */
export function _setReferencePriceRepositoryForTests(repo: ReferencePriceRepository): void {
  cached = repo;
}
