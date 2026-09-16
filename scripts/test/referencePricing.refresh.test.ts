/**
 * Behaviour of the scheduled reference-price refresh.
 *
 * Covers the twenty scenarios the refresh has to get right, using the REAL
 * ingestion pipeline, the REAL job orchestrator, the REAL Cashify source and
 * the REAL lock - only the browser is replaced by a fake page fetcher, and the
 * store is a throwaway file in a temp directory.
 *
 * DATABASE_URL is deleted before anything is imported, so this suite can never
 * reach a production database no matter how the environment is configured.
 *
 * Run: npm run test:pricing:refresh
 */
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { FileReferencePriceStore } from '../../lib/referencePricing/store';
import { deviceKey, DeviceIdentity, ReferencePriceRecord } from '../../lib/referencePricing/types';
import { refreshDevice, PriceSource } from '../../lib/referencePricing/ingestion';
import { createCashifyPriceSource } from '../../lib/referencePricing/sources/cashifySource';
import { CashifyPageSnapshot } from '../../lib/referencePricing/sources/cashifyIdentity';
import { runRefreshJob } from '../../lib/referencePricing/refreshJob';
import { acquireFileLock, makeHolderId } from '../../lib/referencePricing/refreshLock';
import { classifyOutcome, decideStatus } from '../../lib/referencePricing/refreshRun';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

// --- fixtures ---------------------------------------------------------------

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'fhoneify-refresh-test-'));
let storeCounter = 0;

function freshStore(): FileReferencePriceStore {
  return new FileReferencePriceStore(path.join(TMP_ROOT, `store-${storeCounter++}.json`));
}

const OPPO: DeviceIdentity = { brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/512 GB' };
const ONEPLUS: DeviceIdentity = { brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/512 GB' };
const PIXEL: DeviceIdentity = { brand: 'Google', model: 'Google Pixel 8', storage: '8 GB/128 GB' };

function pageFor(device: DeviceIdentity, price: string, over: Partial<CashifyPageSnapshot> = {}): CashifyPageSnapshot {
  return {
    url: `https://www.cashify.in/sell-old-mobile-phone/used-${device.model.toLowerCase().replace(/\s+/g, '-')}`,
    deviceName: device.model,
    selectedVariant: device.storage,
    priceText: price,
    ...over,
  };
}

/** A fake Cashify browser: a map of deviceKey -> what the page shows, or a
 * thrown error / null to simulate a failure or a missing device. */
function fakeCashify(
  pages: Record<string, CashifyPageSnapshot | null | (() => CashifyPageSnapshot | null)>
): PriceSource {
  return createCashifyPriceSource({
    fetchSnapshot: async (device) => {
      const entry = pages[deviceKey(device)];
      if (entry === undefined) return null;
      return typeof entry === 'function' ? entry() : entry;
    },
  });
}

/** Seeds a device with an existing, known-good verified price. */
async function seedPrice(store: FileReferencePriceStore, device: DeviceIdentity, price: number, verifiedAt?: string) {
  const now = verifiedAt ?? new Date(Date.now() - 86400000).toISOString();
  const record: ReferencePriceRecord = {
    deviceKey: deviceKey(device),
    brand: device.brand,
    model: device.model,
    storage: device.storage,
    source: 'cashify',
    currentPrice: price,
    matchConfidence: 'exact',
    status: 'fresh',
    lastVerifiedAt: now,
    lastAttemptedAt: now,
    lastFailureAt: null,
    lastFailureError: null,
    consecutiveFailures: 0,
    createdAt: now,
    updatedAt: now,
  };
  await store.upsert(record);
  return record;
}

async function run() {
  // ========================================================================
  console.log('\n=== 1-4: a successful refresh, changed / unchanged / exact match ===\n');
  // ========================================================================

  await test('1. successful refresh: a device with no prior price gets one, marked fresh and exact', async () => {
    const store = freshStore();
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.newPrice, 15140);

    const record = await store.get(deviceKey(OPPO));
    assert.equal(record!.currentPrice, 15140);
    assert.equal(record!.status, 'fresh');
    assert.equal(record!.matchConfidence, 'exact');
    assert.equal(record!.source, 'cashify');
    assert.ok(record!.lastVerifiedAt, 'a successful refresh must record when it was verified');
    assert.equal(record!.consecutiveFailures, 0);
  });

  await test('2. price changed: the new price replaces the old one and the move is reported', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 16000);
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.previousPrice, 16000);
    assert.equal(outcome.newPrice, 15140);
    assert.equal(classifyOutcome(outcome), 'updated');
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('3. price unchanged: the value stays put but freshness is renewed', async () => {
    const store = freshStore();
    const seeded = await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, true);
    assert.equal(classifyOutcome(outcome), 'unchanged');

    const record = await store.get(deviceKey(OPPO));
    assert.equal(record!.currentPrice, 15140);
    assert.ok(
      record!.lastVerifiedAt! > seeded.lastVerifiedAt!,
      'an unchanged price must still be re-verified - that is what keeps it from ageing into "stale"'
    );
  });

  await test('4. exact device match: the stored evidence names the page it was verified against', async () => {
    const store = freshStore();
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });
    await refreshDevice(store, OPPO, source);

    const record = await store.get(deviceKey(OPPO));
    assert.equal(record!.matchConfidence, 'exact');
    assert.match(record!.matchEvidence!, /OPPO Find X9s/);
    assert.match(record!.matchEvidence!, /12 GB\/512 GB/);
  });

  // ========================================================================
  console.log('\n=== 5-8: wrong device / storage / RAM / variant are refused ===\n');
  // ========================================================================

  await test('5. WRONG MODEL: a OnePlus 15 page is refused for a OnePlus 15R request, price preserved', async () => {
    const store = freshStore();
    await seedPrice(store, ONEPLUS, 34000);
    const source = fakeCashify({
      [deviceKey(ONEPLUS)]: pageFor(ONEPLUS, '₹52,000', { deviceName: 'OnePlus 15' }),
    });

    const outcome = await refreshDevice(store, ONEPLUS, source);
    assert.equal(outcome.accepted, false);
    assert.match(outcome.reason!, /device-name mismatch/);

    const record = await store.get(deviceKey(ONEPLUS));
    assert.equal(record!.currentPrice, 34000, 'the wrong device price must NEVER be written');
    assert.equal(classifyOutcome(outcome), 'rejected');
  });

  await test('6. WRONG STORAGE: a 12/256 page is refused for a 12/512 request, price preserved', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '₹13,000', { selectedVariant: '12 GB/256 GB' }),
    });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.match(outcome.reason!, /storage mismatch/);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('7. WRONG RAM: an 8/512 page is refused for a 12/512 request, price preserved', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '₹12,000', { selectedVariant: '8 GB/512 GB' }),
    });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.match(outcome.reason!, /RAM mismatch/);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('8. VARIANT NOT OFFERED: the run refuses rather than reading whatever was selected', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '', {
        selectedVariant: '',
        availableVariants: ['12 GB/256 GB', '16 GB/512 GB'],
      }),
    });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.match(outcome.reason!, /variant rejected/);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  // ========================================================================
  console.log('\n=== 9-10: invalid and suspicious prices ===\n');
  // ========================================================================

  await test('9a. INVALID PRICE (zero) is refused and the previous price survives', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹0') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('9b. INVALID PRICE (missing) is refused and the previous price survives', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('9c. WRONG CURRENCY is refused - a dollar figure never becomes a rupee price', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '$180') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('9d. MALFORMED/absurd price is refused by the sanity ceiling', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    // A stray extra digit: 151400000 is not a phone buyback price.
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹1,51,40,00,000') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, false);
    assert.match(outcome.reason!, /maximum sane value/);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('10. SUSPICIOUS but plausible change is ACCEPTED and FLAGGED, not silently dropped', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 45000);
    // The real case this system exists for: Cashify's price genuinely fell ~3x.
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    const outcome = await refreshDevice(store, OPPO, source);
    assert.equal(outcome.accepted, true, 'a large but real drop must not be auto-rejected');
    assert.equal(outcome.flagged, true, 'but it must be flagged for a human to look at');
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);

    const history = await store.getHistory(deviceKey(OPPO));
    assert.match(history[history.length - 1].note!, /flagged for review/);
  });

  // ========================================================================
  console.log('\n=== 11-14: failure isolation, preservation, retries ===\n');
  // ========================================================================

  await test('11. ONE DEVICE FAILS: the others still refresh and the failed one keeps its price', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    await seedPrice(store, ONEPLUS, 34000);
    await seedPrice(store, PIXEL, 21000);

    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '₹14,900'),
      [deviceKey(ONEPLUS)]: () => {
        throw new Error('net::ERR_CONNECTION_RESET');
      },
      [deviceKey(PIXEL)]: pageFor(PIXEL, '₹20,500'),
    });

    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO, ONEPLUS, PIXEL],
      source,
      trigger: 'test',
      options: { concurrency: 3, maxRetries: 1, retryDelayMs: 1 },
      log: () => {},
    });

    assert.equal(result.report!.updated, 2);
    assert.equal(result.report!.failed, 1);
    assert.equal(result.report!.status, 'PARTIAL');
    assert.equal((await store.get(deviceKey(ONEPLUS)))!.currentPrice, 34000, 'the failed device keeps its price');
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 14900);
    assert.equal((await store.get(deviceKey(PIXEL)))!.currentPrice, 20500);
  });

  await test('12. COMPLETE SCRAPER FAILURE: every price survives and the run reports FAILED', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    await seedPrice(store, ONEPLUS, 34000);
    await seedPrice(store, PIXEL, 21000);

    const source = fakeCashify({
      [deviceKey(OPPO)]: () => {
        throw new Error('Cashify sessions all rejected');
      },
      [deviceKey(ONEPLUS)]: () => {
        throw new Error('Cashify sessions all rejected');
      },
      [deviceKey(PIXEL)]: () => {
        throw new Error('Cashify sessions all rejected');
      },
    });

    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO, ONEPLUS, PIXEL],
      source,
      trigger: 'test',
      options: { concurrency: 3, maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });

    assert.equal(result.report!.status, 'FAILED');
    assert.equal(result.report!.failed, 3);
    assert.equal(result.report!.updated, 0);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
    assert.equal((await store.get(deviceKey(ONEPLUS)))!.currentPrice, 34000);
    assert.equal((await store.get(deviceKey(PIXEL)))!.currentPrice, 21000);
  });

  await test('13. PRESERVATION is explicit: nothing is zeroed, nulled or deleted on failure', async () => {
    const store = freshStore();
    // The exact case from the brief: OPPO Find X9s 12/512 at ₹15,140.
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({
      [deviceKey(OPPO)]: () => {
        throw new Error('scraper exploded');
      },
    });

    const outcome = await refreshDevice(store, OPPO, source, { maxRetries: 0 });
    const record = await store.get(deviceKey(OPPO));

    assert.equal(record!.currentPrice, 15140);
    assert.notEqual(record!.currentPrice, 0);
    assert.ok(record!.lastVerifiedAt, 'lastVerifiedAt must not be wiped by a failure');
    assert.equal(record!.status, 'refresh_failed', 'the failure must be VISIBLE, not hidden');
    assert.equal(record!.consecutiveFailures, 1);
    assert.equal(outcome.preservedPreviousPrice, true);
  });

  await test('14. RETRIES: a transient failure is retried and succeeds, without retrying forever', async () => {
    const store = freshStore();
    let attempts = 0;
    const source = fakeCashify({
      [deviceKey(OPPO)]: () => {
        attempts++;
        if (attempts < 3) throw new Error('timeout');
        return pageFor(OPPO, '₹15,140');
      },
    });

    const outcome = await refreshDevice(store, OPPO, source, { maxRetries: 3, retryDelayMs: 1 });
    assert.equal(outcome.accepted, true);
    assert.equal(attempts, 3);

    // ...and the retry budget is bounded.
    let forever = 0;
    const alwaysFails = fakeCashify({
      [deviceKey(PIXEL)]: () => {
        forever++;
        throw new Error('always down');
      },
    });
    const failure = await refreshDevice(store, PIXEL, alwaysFails, { maxRetries: 2, retryDelayMs: 1 });
    assert.equal(failure.accepted, false);
    assert.equal(forever, 3, 'maxRetries: 2 means exactly 3 attempts, then stop');
  });

  await test('14b. a REJECTION is not retried - the page loaded, it is just the wrong device', async () => {
    const store = freshStore();
    let calls = 0;
    const source = fakeCashify({
      [deviceKey(ONEPLUS)]: () => {
        calls++;
        return pageFor(ONEPLUS, '₹52,000', { deviceName: 'OnePlus 15' });
      },
    });

    await refreshDevice(store, ONEPLUS, source, { maxRetries: 3, retryDelayMs: 1 });
    assert.equal(calls, 1, 'refetching the same wrong page would only waste time');
  });

  // ========================================================================
  console.log('\n=== 15-16: idempotency and concurrency ===\n');
  // ========================================================================

  await test('15. DUPLICATE EXECUTION: running the same successful scrape twice changes nothing', async () => {
    const store = freshStore();
    const source = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    await runRefreshJob({ repo: store, devices: [OPPO], source, trigger: 'test', log: () => {} });
    const afterFirst = await store.get(deviceKey(OPPO));

    await runRefreshJob({ repo: store, devices: [OPPO], source, trigger: 'test', log: () => {} });
    const afterSecond = await store.get(deviceKey(OPPO));

    assert.equal(afterSecond!.currentPrice, afterFirst!.currentPrice, 'the price must not drift');
    assert.equal(afterSecond!.deviceKey, afterFirst!.deviceKey);
    assert.equal(afterSecond!.consecutiveFailures, 0);
    assert.equal(afterSecond!.createdAt, afterFirst!.createdAt, 'the record must be updated, not recreated');

    const all = await store.listAll();
    assert.equal(
      all.filter((r) => r.deviceKey === deviceKey(OPPO)).length,
      1,
      'a second run must not create a duplicate current record'
    );
  });

  await test('16. CONCURRENT EXECUTION: the second run is refused and touches nothing', async () => {
    const store = freshStore();
    const lockPath = path.join(TMP_ROOT, `lock-${storeCounter++}.lock`);
    await seedPrice(store, OPPO, 15140);

    const holderA = makeHolderId('test-a');
    const first = await acquireFileLock({ holder: holderA, ttlMs: 60000, lockPath });
    assert.equal(first.acquired, true);

    let secondRunTouchedAnything = false;
    const source = fakeCashify({
      [deviceKey(OPPO)]: () => {
        secondRunTouchedAnything = true;
        return pageFor(OPPO, '₹1');
      },
    });

    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO],
      source,
      trigger: 'test-b',
      acquireLock: () => acquireFileLock({ holder: makeHolderId('test-b'), ttlMs: 60000, lockPath }),
      log: () => {},
    });

    assert.equal(result.ran, false, 'the second run must refuse to start');
    assert.ok(result.lockedBy?.includes('test-a'));
    assert.equal(secondRunTouchedAnything, false, 'it must not have scraped anything');
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);

    // And once the holder releases, a later run proceeds normally.
    await first.lock!.release();
    const after = await runRefreshJob({
      repo: store,
      devices: [OPPO],
      source: fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹14,000') }),
      trigger: 'test-c',
      acquireLock: () => acquireFileLock({ holder: makeHolderId('test-c'), ttlMs: 60000, lockPath }),
      log: () => {},
    });
    assert.equal(after.ran, true);
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 14000);
  });

  await test('16c. POSTGRES LOCK (production path): acquire, refuse while held, heartbeat, holder-scoped release, expiry takeover', async () => {
    // An in-memory double with the same semantics Postgres gives the real
    // queries: create() fails on an existing primary key, and updateMany()
    // applies its WHERE atomically and reports how many rows it changed.
    const rows = new Map<string, { name: string; holder: string; acquiredAt: Date; expiresAt: Date }>();
    const matches = (row: any, where: any) =>
      row.name === where.name &&
      (where.holder === undefined || row.holder === where.holder) &&
      (where.expiresAt?.lt === undefined || row.expiresAt < where.expiresAt.lt);
    const prisma = {
      referencePriceRefreshLock: {
        async updateMany({ where, data }: any) {
          const row = rows.get(where.name);
          if (!row || !matches(row, where)) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
        async create({ data }: any) {
          if (rows.has(data.name)) throw new Error('Unique constraint failed on the fields: (`name`)');
          rows.set(data.name, { ...data });
          return data;
        },
        async findUnique({ where }: any) {
          return rows.get(where.name) ?? null;
        },
        async deleteMany({ where }: any) {
          const row = rows.get(where.name);
          if (row && matches(row, where)) {
            rows.delete(where.name);
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
    };

    const { acquirePostgresLock } = await import('../../lib/referencePricing/refreshLock');

    const a = await acquirePostgresLock(prisma, { holder: 'runner-a', ttlMs: 60000 });
    assert.equal(a.acquired, true, 'first acquirer wins (row created)');

    const b = await acquirePostgresLock(prisma, { holder: 'runner-b', ttlMs: 60000 });
    assert.equal(b.acquired, false, 'a second runner is refused while the lock is live');
    assert.equal(b.heldBy, 'runner-a');

    const before = rows.get('reference-price-refresh')!.expiresAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    await a.lock!.heartbeat();
    assert.ok(rows.get('reference-price-refresh')!.expiresAt.getTime() > before, 'heartbeat extends the expiry');

    // Simulate runner-a's lock expiring and runner-c taking over.
    rows.get('reference-price-refresh')!.expiresAt = new Date(Date.now() - 1000);
    const c = await acquirePostgresLock(prisma, { holder: 'runner-c', ttlMs: 60000 });
    assert.equal(c.acquired, true, 'an expired lock is taken over');

    // The stale runner-a finishing late must NOT delete runner-c's lock.
    await a.lock!.release();
    assert.equal(rows.get('reference-price-refresh')?.holder, 'runner-c', 'release is scoped to its own holder');

    await c.lock!.release();
    assert.equal(rows.has('reference-price-refresh'), false, 'the real holder can release');
  });

  await test('16b. an EXPIRED lock is taken over, so a killed runner cannot wedge the pipeline', async () => {
    const lockPath = path.join(TMP_ROOT, `lock-expired-${storeCounter++}.lock`);
    const dead = await acquireFileLock({ holder: 'dead-runner', ttlMs: 1, lockPath });
    assert.equal(dead.acquired, true);
    await new Promise((r) => setTimeout(r, 20));

    const next = await acquireFileLock({ holder: 'live-runner', ttlMs: 60000, lockPath });
    assert.equal(next.acquired, true, 'an expired lock must be reclaimable');
  });

  // ========================================================================
  console.log('\n=== 17-20: history, missing devices, database failure, recovery ===\n');
  // ========================================================================

  await test('17. HISTORY: every accepted observation is traceable, with price, source and time', async () => {
    const store = freshStore();
    const source1 = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹16,000') });
    const source2 = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') });

    await refreshDevice(store, OPPO, source1);
    await refreshDevice(store, OPPO, source2);

    const history = await store.getHistory(deviceKey(OPPO));
    assert.equal(history.length, 2);
    assert.equal(history[0].price, 16000, 'the previous price is still recoverable from history');
    assert.equal(history[1].price, 15140);
    for (const entry of history) {
      assert.equal(entry.source, 'cashify');
      assert.ok(entry.recordedAt, 'every entry must carry when it was observed');
    }
  });

  await test('17b. a REJECTED observation is not written into history as if it were real', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);
    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '₹13,000', { selectedVariant: '12 GB/256 GB' }),
    });

    await refreshDevice(store, OPPO, source);
    const history = await store.getHistory(deviceKey(OPPO));
    assert.equal(history.length, 0, 'a wrong-variant price must not pollute the price history');

    // ...but the reason is still recorded on the record itself.
    const record = await store.get(deviceKey(OPPO));
    assert.match(record!.lastFailureError!, /storage mismatch/);
    assert.ok(record!.lastFailureAt);
  });

  await test('18. MISSING DEVICE: a device Cashify does not list is reported missing, never invented', async () => {
    const store = freshStore();
    const source = fakeCashify({ [deviceKey(PIXEL)]: null }); // page 404s

    const outcome = await refreshDevice(store, PIXEL, source);
    assert.equal(outcome.accepted, false);
    assert.equal(classifyOutcome(outcome), 'missing');

    const record = await store.get(deviceKey(PIXEL));
    assert.equal(record!.status, 'missing');
    assert.equal(record!.currentPrice, 0, 'a device with no price must read as 0/missing, not a fabricated number');
    assert.equal(record!.lastVerifiedAt, null, 'it must never claim to have been verified');
  });

  await test('19. DATABASE FAILURE: the run reports FAILED and no price is corrupted', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);

    // A repository whose writes fail, exactly as a dead database would.
    const brokenRepo = {
      get: (k: string) => store.get(k),
      listAll: () => store.listAll(),
      getHistory: (k: string) => store.getHistory(k),
      async upsert() {
        throw new Error('ECONNREFUSED: could not reach the database');
      },
      async appendHistory() {
        throw new Error('ECONNREFUSED: could not reach the database');
      },
    };

    const result = await runRefreshJob({
      repo: brokenRepo,
      devices: [OPPO],
      source: fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹14,000') }),
      trigger: 'test',
      options: { maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });

    assert.equal(result.report!.status, 'FAILED');
    assert.equal(result.report!.failed, 1, 'a storage failure is a failure...');
    assert.equal(result.report!.missing, 0, '...never "missing", which would falsely claim the device has no price');
    // The underlying store was never written, so the real price is intact.
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
  });

  await test('19b. DATABASE DIES MID-RUN: no worker keeps writing after the job returns and the lock is released', async () => {
    // Regression guard for a real bug found in review: a repository throw used
    // to reject Promise.all, handing control back (lock released, report
    // printed) while sibling workers were STILL running and writing.
    const lockPath = path.join(TMP_ROOT, `lock-dbdie-${storeCounter++}.lock`);
    const devices: DeviceIdentity[] = Array.from({ length: 40 }, (_, i) => ({
      brand: 'Oppo', model: `OPPO Test ${i}`, storage: '8 GB/128 GB',
    }));

    let jobReturned = false;
    let writesAfterReturn = 0;
    let calls = 0;

    const dyingRepo = {
      async get() { return null; },
      async listAll() { return []; },
      async getHistory() { return []; },
      async upsert() {
        calls++;
        if (jobReturned) writesAfterReturn++;
        // Slow, so sibling workers are genuinely mid-flight when one fails.
        await new Promise((r) => setTimeout(r, 5));
        throw new Error('ECONNRESET: server closed the connection unexpectedly');
      },
      async appendHistory() {
        if (jobReturned) writesAfterReturn++;
        throw new Error('ECONNRESET');
      },
    };

    const source = createCashifyPriceSource({
      fetchSnapshot: async (d) => pageFor(d, '₹10,000'),
    });

    const result = await runRefreshJob({
      repo: dyingRepo,
      devices,
      source,
      trigger: 'test',
      acquireLock: () => acquireFileLock({ holder: makeHolderId('dbdie'), ttlMs: 60000, lockPath }),
      options: { concurrency: 4, maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });
    jobReturned = true;
    const callsAtReturn = calls;
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(writesAfterReturn, 0, 'nothing may write after the run has returned');
    assert.equal(calls, callsAtReturn, 'no worker may still be running');
    assert.equal(result.report!.status, 'FAILED');
    assert.match(result.report!.error ?? '', /consecutive repository errors/);
    assert.ok(result.report!.notAttempted > 0, 'the run should stop early rather than hammer a dead database');
    assert.equal(fs.existsSync(lockPath), false, 'the lock must be released once the run has fully stopped');
  });

  await test('19d. CASHIFY BLOCKED / SESSION EXPIRED: the run stops safely after a failure streak, prices preserved', async () => {
    const store = freshStore();
    const devices: DeviceIdentity[] = Array.from({ length: 60 }, (_, i) => ({
      brand: 'Oppo', model: `OPPO Blocked ${i}`, storage: '8 GB/128 GB',
    }));
    for (const d of devices.slice(0, 10)) await seedPrice(store, d, 20000);

    let fetches = 0;
    const blocked = createCashifyPriceSource({
      fetchSnapshot: async () => {
        fetches++;
        throw new Error('Cashify page rendered no device heading (possible bot challenge)');
      },
    });

    const result = await runRefreshJob({
      repo: store,
      devices,
      source: blocked,
      trigger: 'test',
      options: { concurrency: 1, maxRetries: 0, retryDelayMs: 1, maxConsecutiveSourceFailures: 5 },
      log: () => {},
    });

    assert.equal(result.report!.status, 'FAILED');
    assert.match(result.report!.error ?? '', /consecutive source failures/);
    assert.equal(fetches, 5, 'it must stop after the streak, not scrape the remaining 55 pages');
    assert.equal(result.report!.notAttempted, 55);
    for (const d of devices.slice(0, 5)) {
      const r = await store.get(deviceKey(d));
      assert.equal(r!.currentPrice, 20000, 'failed devices keep their previous price');
      assert.ok(r!.lastVerifiedAt, 'and their previous lastVerifiedAt');
    }
    for (const d of devices.slice(5, 10)) {
      const r = await store.get(deviceKey(d));
      assert.equal(r!.consecutiveFailures, 0, 'devices never reached are not marked failed at all');
    }
  });

  await test('19e. scattered failures, rejections and not-listed devices do NOT trip the breaker', async () => {
    const store = freshStore();
    const devices: DeviceIdentity[] = Array.from({ length: 30 }, (_, i) => ({
      brand: 'Oppo', model: `OPPO Mixed ${i}`, storage: '8 GB/128 GB',
    }));
    const source = createCashifyPriceSource({
      fetchSnapshot: async (d) => {
        const i = Number(d.model.split(' ').pop());
        if (i % 3 === 0) throw new Error('timeout'); // transport failure
        if (i % 3 === 1) return pageFor(d, '₹10,000', { deviceName: 'OPPO Something Else' }); // rejection
        return null; // not listed on Cashify
      },
    });

    const result = await runRefreshJob({
      repo: store,
      devices,
      source,
      trigger: 'test',
      options: { concurrency: 1, maxRetries: 0, retryDelayMs: 1, maxConsecutiveSourceFailures: 3 },
      log: () => {},
    });

    assert.equal(result.report!.error, undefined, 'no streak of 3 transport failures ever occurred');
    assert.equal(result.report!.notAttempted, 0, 'every device must be attempted');
  });

  await test('19c. a failing RUN RECORDER cannot leak the lock or break the refresh', async () => {
    const store = freshStore();
    const lockPath = path.join(TMP_ROOT, `lock-recorder-${storeCounter++}.lock`);
    const logs: string[] = [];

    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO],
      source: fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140') }),
      trigger: 'test',
      acquireLock: () => acquireFileLock({ holder: makeHolderId('rec'), ttlMs: 60000, lockPath }),
      recorder: {
        describe: () => 'broken',
        async start() { throw new Error('run table missing'); },
        async finish() { throw new Error('run table missing'); },
      },
      log: (m) => logs.push(m),
    });

    assert.equal(result.report!.status, 'SUCCESS', 'monitoring failure must not fail the price refresh');
    assert.equal((await store.get(deviceKey(OPPO)))!.currentPrice, 15140);
    assert.equal(fs.existsSync(lockPath), false, 'the lock must still be released');
    assert.ok(logs.some((l) => l.includes('FHONEIFY CASHIFY REFRESH')), 'the report must still be printed');
  });

  await test('20. RECOVERY: after failures, a good run restores fresh status and clears the failure count', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140);

    const broken = fakeCashify({
      [deviceKey(OPPO)]: () => {
        throw new Error('down');
      },
    });
    await refreshDevice(store, OPPO, broken, { maxRetries: 0 });
    await refreshDevice(store, OPPO, broken, { maxRetries: 0 });

    let record = await store.get(deviceKey(OPPO));
    assert.equal(record!.consecutiveFailures, 2);
    assert.equal(record!.status, 'refresh_failed');
    assert.equal(record!.currentPrice, 15140, 'still preserved after repeated failures');

    const recovered = fakeCashify({ [deviceKey(OPPO)]: pageFor(OPPO, '₹14,800') });
    const outcome = await refreshDevice(store, OPPO, recovered);

    assert.equal(outcome.accepted, true);
    record = await store.get(deviceKey(OPPO));
    assert.equal(record!.currentPrice, 14800);
    assert.equal(record!.consecutiveFailures, 0, 'recovery must clear the failure counter');
    assert.equal(record!.status, 'fresh');
    assert.equal(record!.lastFailureError, null, 'and clear the stale error message');
  });

  // ========================================================================
  console.log('\n=== Run report and status classification ===\n');
  // ========================================================================

  await test('report counts every bucket and distinguishes "failed but preserved" from "missing"', async () => {
    const store = freshStore();
    await seedPrice(store, OPPO, 15140); // will fail -> preserved -> "failed"
    await seedPrice(store, ONEPLUS, 34000); // will change -> "updated"
    // PIXEL has no prior price and 404s -> "missing"

    const source = fakeCashify({
      [deviceKey(OPPO)]: () => {
        throw new Error('down');
      },
      [deviceKey(ONEPLUS)]: pageFor(ONEPLUS, '₹33,000'),
      [deviceKey(PIXEL)]: null,
    });

    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO, ONEPLUS, PIXEL],
      source,
      trigger: 'test',
      options: { concurrency: 1, maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });

    const report = result.report!;
    assert.equal(report.devicesDiscovered, 3);
    assert.equal(report.updated, 1);
    assert.equal(report.failed, 1);
    assert.equal(report.missing, 1);
    assert.equal(report.status, 'PARTIAL');
    assert.ok(report.samples.failed.some((f) => f.pricePreserved), 'the report must say the price was preserved');
  });

  await test('a run where everything succeeded is SUCCESS; one where nothing did is FAILED', () => {
    const base = { error: undefined, updated: 0, unchanged: 0, rejected: 0, failed: 0, missing: 0, notAttempted: 0, devicesDiscovered: 3 };
    assert.equal(decideStatus({ ...base, updated: 2, unchanged: 1 }), 'SUCCESS');
    assert.equal(decideStatus({ ...base, updated: 2, failed: 1 }), 'PARTIAL');
    assert.equal(decideStatus({ ...base, failed: 3 }), 'FAILED');
    assert.equal(decideStatus({ ...base, updated: 3, error: 'browser never launched' } as any), 'FAILED');
  });

  await test('a time-capped run reports the devices it never reached, and they keep their prices', async () => {
    const store = freshStore();
    await seedPrice(store, ONEPLUS, 34000);
    await seedPrice(store, PIXEL, 21000);

    const source = fakeCashify({
      [deviceKey(OPPO)]: pageFor(OPPO, '₹15,140'),
      [deviceKey(ONEPLUS)]: pageFor(ONEPLUS, '₹33,000'),
      [deviceKey(PIXEL)]: pageFor(PIXEL, '₹20,000'),
    });

    // A budget of 0ms stops the run before the first device is claimed.
    const result = await runRefreshJob({
      repo: store,
      devices: [OPPO, ONEPLUS, PIXEL],
      source,
      trigger: 'test',
      maxDurationMs: 0,
      options: { concurrency: 1 },
      log: () => {},
    });

    assert.equal(result.report!.notAttempted, 3);
    assert.equal((await store.get(deviceKey(ONEPLUS)))!.currentPrice, 34000);
    assert.equal((await store.get(deviceKey(PIXEL)))!.currentPrice, 21000);
  });

  console.log(`\n${passed} passed, ${failed} failed.\n`);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  if (failed > 0) process.exit(1);
}

run();
