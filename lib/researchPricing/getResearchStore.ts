import type { ResearchStore } from './store';

// Standalone campaign scripts invoke this module directly, without going
// through server/config.ts's dotenv.config() call - see the identical
// comment in lib/referencePricing/getStore.ts.
require('dotenv').config();

/**
 * Postgres-only, one-time campaign - no file-store fallback. Throws if
 * DATABASE_URL is missing rather than silently degrading to a fallback
 * that would make claimNext's concurrency guarantees meaningless.
 */
let cached: ResearchStore | null = null;
let cachedPrismaClient: any = null;

export function getResearchStore(): ResearchStore {
  if (cached) return cached;

  if (!process.env.DATABASE_URL) {
    throw new Error('[researchPricing] DATABASE_URL is required for the Cashify pricing research campaign store.');
  }

  const { PrismaClient } = require('@prisma/client');
  const { PostgresResearchStore } = require('./store');
  const prisma = new PrismaClient();
  cachedPrismaClient = prisma;
  cached = new PostgresResearchStore(prisma);
  return cached!;
}

/** Test-only: clears the cached instance so a test can force re-evaluation
 * of DATABASE_URL. */
export function _resetResearchStoreCacheForTests(): void {
  cached = null;
  cachedPrismaClient = null;
}

/** Test-only: pins the store to an explicit instance, bypassing
 * DATABASE_URL entirely. */
export function _setResearchStoreForTests(store: ResearchStore): void {
  cached = store;
}
