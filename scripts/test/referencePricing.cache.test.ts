/**
 * The in-memory read cache in front of the reference-price repository.
 *
 * It exists because the per-quote findUnique round trip to Supabase was ~58%
 * of the warm server time for a quote. It must speed reads up without ever
 * changing what a lookup returns, hiding a write, or inventing a price.
 */
import assert from 'node:assert/strict';
import { CachedReferencePriceStore } from '../../lib/referencePricing/cachedStore';
import type { ReferencePriceRepository } from '../../lib/referencePricing/store';
import type { ReferencePriceRecord, ReferencePriceHistoryEntry } from '../../lib/referencePricing/types';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${(error as Error).message}`);
  }
}

const record = (deviceKey: string, currentPrice: number): ReferencePriceRecord => ({
  deviceKey,
  brand: 'Oppo',
  model: 'OPPO Reno11 5G',
  storage: '8 GB/256 GB',
  source: 'cashify',
  sourceUrl: null,
  currentPrice,
  matchConfidence: 'exact',
  matchEvidence: null,
  status: 'fresh',
  lastVerifiedAt: '2026-09-20T00:00:00.000Z',
  lastAttemptedAt: null,
  lastFailureAt: null,
  lastFailureError: null,
  consecutiveFailures: 0,
  updatedAt: '2026-09-20T00:00:00.000Z',
}) as ReferencePriceRecord;

class FakeRepo implements ReferencePriceRepository {
  getCalls = 0;
  listCalls = 0;
  upsertCalls = 0;
  failListAll = false;
  constructor(public rows: Map<string, ReferencePriceRecord>) {}
  async get(deviceKey: string) {
    this.getCalls += 1;
    return this.rows.get(deviceKey) ?? null;
  }
  async upsert(r: ReferencePriceRecord) {
    this.upsertCalls += 1;
    this.rows.set(r.deviceKey, r);
  }
  async listAll() {
    this.listCalls += 1;
    if (this.failListAll) throw new Error('database unavailable');
    return [...this.rows.values()];
  }
  async appendHistory(_k: string, _e: ReferencePriceHistoryEntry) {}
  async getHistory(_k: string) {
    return [];
  }
}

const seeded = () => new FakeRepo(new Map([['oppo|reno11|8-256', record('oppo|reno11|8-256', 15930)]]));

(async () => {
  console.log('\nReference-price read cache');

  await test('a preloaded lookup returns the same record without touching the database', async () => {
    const inner = seeded();
    const cache = new CachedReferencePriceStore(inner);
    await cache.preload();
    const before = inner.getCalls;
    const hit = await cache.get('oppo|reno11|8-256');
    assert.equal(inner.getCalls, before, 'cache hit still queried the database');
    assert.deepEqual(hit, inner.rows.get('oppo|reno11|8-256'));
  });

  await test('a device missing from the snapshot still falls through to the database', async () => {
    const inner = seeded();
    const cache = new CachedReferencePriceStore(inner);
    await cache.preload();
    const before = inner.getCalls;
    const miss = await cache.get('vivo|unknown|8-128');
    assert.equal(miss, null);
    assert.equal(inner.getCalls, before + 1, 'a miss must ask the database rather than reporting missing from memory');
  });

  await test('a failed preload is not fatal and lookups keep working', async () => {
    const inner = seeded();
    inner.failListAll = true;
    const cache = new CachedReferencePriceStore(inner);
    const result = await cache.preload();
    assert.ok(result.error, 'a failed preload should report its error');
    const hit = await cache.get('oppo|reno11|8-256');
    assert.equal(hit?.currentPrice, 15930, 'lookups must still work with an empty cache');
  });

  await test('an upsert is visible immediately, not after the TTL', async () => {
    const inner = seeded();
    const cache = new CachedReferencePriceStore(inner);
    await cache.preload();
    await cache.upsert(record('oppo|reno11|8-256', 14000));
    const hit = await cache.get('oppo|reno11|8-256');
    assert.equal(hit?.currentPrice, 14000, 'a write must not be hidden behind the cache');
    assert.equal(inner.upsertCalls, 1, 'the write must still reach the real repository');
  });

  await test('an expired cache serves the request from the database rather than waiting', async () => {
    const inner = seeded();
    const cache = new CachedReferencePriceStore(inner, 0); // instantly stale
    await cache.preload();
    const before = inner.getCalls;
    const hit = await cache.get('oppo|reno11|8-256');
    assert.equal(hit?.currentPrice, 15930);
    assert.equal(inner.getCalls, before + 1, 'a stale cache must not serve a stale value');
  });

  await test('the cache never invents a record for an unknown device', async () => {
    const inner = new FakeRepo(new Map());
    const cache = new CachedReferencePriceStore(inner);
    await cache.preload();
    assert.equal(await cache.get('nothing|at|all'), null);
  });

  await test('listAll, history and stats pass straight through', async () => {
    const inner = seeded();
    const cache = new CachedReferencePriceStore(inner);
    await cache.preload();
    assert.equal((await cache.listAll()).length, 1);
    assert.deepEqual(await cache.getHistory('oppo|reno11|8-256'), []);
    assert.equal(cache.stats().size, 1);
    assert.equal(cache.stats().fresh, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
