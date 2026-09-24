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
let cachedPrismaClient: any = null;
let backend: 'postgres' | 'file' = 'file';

export interface ReferenceStoreHealth {
  backend: 'postgres' | 'file';
  /** Postgres only: whether the last warm-up/connection attempt succeeded.
   * Always true for the file store, which needs no connection. */
  connected: boolean;
  error?: string;
  checkedAt: string | null;
}

let lastHealth: ReferenceStoreHealth = { backend: 'file', connected: true, checkedAt: null };

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
      cachedPrismaClient = prisma;
      backend = 'postgres';
      resolved = new PostgresReferencePriceStore(prisma);
    } catch (err: any) {
      console.error('[referencePricing] DATABASE_URL is set but the Postgres store failed to initialize; falling back to the file-backed store:', err.message);
    }
  }

  cached = resolved ?? getDefaultReferencePriceStore();
  return cached;
}

/**
 * Opens the database connection at startup instead of on the first quote.
 *
 * Prisma connects lazily, so the first reference lookup after boot paid the
 * whole connection+engine cost and could exceed the (deliberately tight)
 * REFERENCE_PRICE_LOOKUP_TIMEOUT_MS, degrading that one request to the
 * snapshot fallback for no real reason. `SELECT 1` after $connect() forces
 * the query engine and pool to be fully ready, not just dialled.
 *
 * Never throws: if the database is unavailable at boot the app still starts
 * and serves quotes from the snapshot fallback, and Prisma reconnects by
 * itself on a later query once the database is back. The returned health is
 * reported truthfully so nothing claims Postgres is up when it is not.
 */
export async function warmReferencePriceRepository(
  timeoutMs = Number(process.env.REFERENCE_PRICE_WARMUP_TIMEOUT_MS ?? 10000)
): Promise<ReferenceStoreHealth> {
  getReferencePriceRepository();

  if (backend !== 'postgres' || !cachedPrismaClient) {
    lastHealth = { backend: 'file', connected: true, checkedAt: new Date().toISOString() };
    return lastHealth;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (async () => {
        await cachedPrismaClient.$connect();
        await cachedPrismaClient.$queryRaw`SELECT 1`;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`warm-up timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    lastHealth = { backend: 'postgres', connected: true, checkedAt: new Date().toISOString() };
  } catch (err: any) {
    lastHealth = { backend: 'postgres', connected: false, error: err?.message ?? String(err), checkedAt: new Date().toISOString() };
  } finally {
    if (timer) clearTimeout(timer);
  }

  return lastHealth;
}

let cachedQuestionnaireStore: import('./questionnaire/store').QuestionnaireProfileStore | null = null;

/**
 * Cashify questionnaire profiles, on the same Prisma client as the reference
 * prices. Without a database (tests, local runs with no DATABASE_URL) this is
 * an empty in-memory store, so every model reads as UNKNOWN - the explicit,
 * ask-everything fallback - never as "not asked".
 */
export function getQuestionnaireProfileStore(): import('./questionnaire/store').QuestionnaireProfileStore {
  if (cachedQuestionnaireStore) return cachedQuestionnaireStore;
  getReferencePriceRepository();
  const { PostgresQuestionnaireProfileStore, InMemoryQuestionnaireProfileStore } = require('./questionnaire/store');
  cachedQuestionnaireStore = backend === 'postgres' && cachedPrismaClient
    ? new PostgresQuestionnaireProfileStore(cachedPrismaClient)
    : new InMemoryQuestionnaireProfileStore();
  return cachedQuestionnaireStore!;
}

/** Test-only: pins the questionnaire profile store. */
export function _setQuestionnaireProfileStoreForTests(store: import('./questionnaire/store').QuestionnaireProfileStore | null): void {
  cachedQuestionnaireStore = store;
}

/** Result of the most recent warm-up attempt. Never asserts more than was
 * actually observed. */
export function getReferenceStoreHealth(): ReferenceStoreHealth {
  return lastHealth;
}

/** Graceful shutdown: releases the pool this module owns. Safe to call when
 * there is no Postgres client. */
export async function disconnectReferencePriceRepository(): Promise<void> {
  if (!cachedPrismaClient) return;
  try {
    await cachedPrismaClient.$disconnect();
  } catch {
    // Shutdown must not fail because the connection was already gone.
  }
}

/** Test-only: clears the cached instance so a test can force
 * re-evaluation of DATABASE_URL (e.g. after temporarily unsetting it). */
export function _resetReferencePriceRepositoryCacheForTests(): void {
  cached = null;
  cachedPrismaClient = null;
  backend = 'file';
  lastHealth = { backend: 'file', connected: true, checkedAt: null };
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
