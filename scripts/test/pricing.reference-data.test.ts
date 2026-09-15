/**
 * Tests for the reference-pricing infrastructure (schema, freshness,
 * matching, ingestion, failure handling). This is Suite C, distinct from:
 *   Suite A (pricing.regression.test.ts) - protects the pricing FORMULA
 *   Suite B (pricing.cashify-comparison.test.ts) - checks data coverage
 * This suite protects the LIFECYCLE code that supplies the formula with a
 * reference price: freshness classification, safe matching, and the
 * failure-must-not-destroy-valid-data guarantee.
 *
 * Uses a throwaway temp file for the store in every test so tests never
 * touch the real server/data/reference-prices/store.json, and node:assert
 * so no new test-framework dependency is introduced.
 *
 * Run: npx tsx scripts/test/pricing.reference-data.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileReferencePriceStore } from '../../lib/referencePricing/store';
import { classifyFreshness, isUsableForPricing, FRESHNESS_POLICY } from '../../lib/referencePricing/freshnessPolicy';
import { matchDevices, legacyLookupKey, findLegacyMatch } from '../../lib/referencePricing/matching';
import { validatePriceObservation } from '../../lib/referencePricing/validation';
import { refreshDevice, refreshCatalog, PriceSource } from '../../lib/referencePricing/ingestion';
import { deviceKey } from '../../lib/referencePricing/types';

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

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function tempStore(): FileReferencePriceStore {
  const file = path.join(os.tmpdir(), `fhoneify-refprice-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  return new FileReferencePriceStore(file);
}

async function run() {
  console.log('=== Freshness classification ===\n');

  await test('a record verified today is fresh', () => {
    const status = classifyFreshness({ lastVerifiedAt: new Date().toISOString(), consecutiveFailures: 0 });
    assert.equal(status, 'fresh');
  });

  await test(`a record verified ${FRESHNESS_POLICY.warningAgeDays + 1} days ago is approaching_stale`, () => {
    const status = classifyFreshness({ lastVerifiedAt: daysAgo(FRESHNESS_POLICY.warningAgeDays + 1), consecutiveFailures: 0 });
    assert.equal(status, 'approaching_stale');
  });

  await test(`a record verified ${FRESHNESS_POLICY.maxAgeDays + 1} days ago is stale`, () => {
    const status = classifyFreshness({ lastVerifiedAt: daysAgo(FRESHNESS_POLICY.maxAgeDays + 1), consecutiveFailures: 0 });
    assert.equal(status, 'stale');
  });

  await test('a record with no lastVerifiedAt is missing', () => {
    const status = classifyFreshness({ lastVerifiedAt: null, consecutiveFailures: 0 });
    assert.equal(status, 'missing');
  });

  await test('a record with ongoing failures is refresh_failed even if recently verified', () => {
    const status = classifyFreshness({ lastVerifiedAt: new Date().toISOString(), consecutiveFailures: 3 });
    assert.equal(status, 'refresh_failed');
  });

  await test('THE EXACT BUG: a record verified 10-12 weeks ago (like OPPO/OnePlus were) is correctly detected as stale, not silently treated as fine', () => {
    const status = classifyFreshness({ lastVerifiedAt: daysAgo(75), consecutiveFailures: 0 }); // ~10-11 weeks
    assert.equal(status, 'stale', 'this is precisely the case the old system had no mechanism to detect');
  });

  await test('isUsableForPricing: fresh/approaching_stale/refresh_failed are usable, stale/missing are not (policy decision, not silently changed)', () => {
    assert.equal(isUsableForPricing('fresh'), true);
    assert.equal(isUsableForPricing('approaching_stale'), true);
    assert.equal(isUsableForPricing('refresh_failed'), true);
    assert.equal(isUsableForPricing('stale'), false);
    assert.equal(isUsableForPricing('missing'), false);
  });

  console.log('\n=== Matching ===\n');

  await test('identical devices match exact', () => {
    const r = matchDevices({ brand: 'Apple', model: 'iPhone 14', storage: '128GB' }, { brand: 'Apple', model: 'iPhone 14', storage: '128GB' });
    assert.equal(r.confidence, 'exact');
  });

  await test('formatting-only differences match high, not exact', () => {
    const r = matchDevices({ brand: 'apple', model: 'IPHONE 14', storage: '128 gb' }, { brand: 'Apple', model: 'iPhone 14', storage: '128GB' });
    assert.equal(r.confidence, 'high');
  });

  await test('CRITICAL: OnePlus 15R must never match OnePlus 15 (the exact trap case this module exists to prevent)', () => {
    const r = matchDevices(
      { brand: 'OnePlus', model: 'OnePlus 15R', storage: '12GB/512GB' },
      { brand: 'OnePlus', model: 'OnePlus 15', storage: '8GB/256GB' }
    );
    assert.equal(r.confidence, 'unmatched');
  });

  await test('CRITICAL: different storage variants of the same model never silently match', () => {
    const r = matchDevices(
      { brand: 'Apple', model: 'iPhone 15 Pro', storage: '128GB' },
      { brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB' }
    );
    assert.equal(r.confidence, 'unmatched');
  });

  await test('different brands never match', () => {
    const r = matchDevices({ brand: 'Apple', model: 'X', storage: 'Y' }, { brand: 'Samsung', model: 'X', storage: 'Y' });
    assert.equal(r.confidence, 'unmatched');
  });

  await test('legacyLookupKey reproduces the exact algorithm used in app/quote/page.tsx (verified against a known real key)', () => {
    const key = legacyLookupKey('Oneplus 15R', '12 GB/512 GB');
    assert.equal(key, 'oneplus-15r-12-gb-512-gb');
  });

  await test('findLegacyMatch finds an existing key and reports it as exact', () => {
    const table = { 'oneplus-15r-12-gb-512-gb': 36300 };
    const result = findLegacyMatch({ brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/512 GB' }, table);
    assert.ok(result);
    assert.equal(result!.price, 36300);
  });

  await test('findLegacyMatch returns null (not a guess) when no key exists - this is the OPPO Find X9s case', () => {
    const table = {};
    const result = findLegacyMatch({ brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/512 GB' }, table);
    assert.equal(result, null);
  });

  console.log('\n=== Validation / anomaly policy ===\n');

  await test('a normal price is valid and not flagged', () => {
    const r = validatePriceObservation({ price: 40000, previousPrice: 42000 });
    assert.equal(r.valid, true);
    assert.equal(r.flagged, undefined);
  });

  await test('a large drop is ACCEPTED (not rejected) but flagged - a real 3x crash like OPPO/OnePlus must not be blocked', () => {
    const r = validatePriceObservation({ price: 15140, previousPrice: 45000 });
    assert.equal(r.valid, true);
    assert.equal(r.flagged, true);
  });

  await test('a non-finite/negative price is rejected outright', () => {
    assert.equal(validatePriceObservation({ price: -100 }).valid, false);
    assert.equal(validatePriceObservation({ price: NaN }).valid, false);
  });

  await test('an absurdly large price (parsing garbage) is rejected', () => {
    assert.equal(validatePriceObservation({ price: 99999999 }).valid, false);
  });

  console.log('\n=== Ingestion / failure handling ===\n');

  await test('a successful refresh stores the price with fresh status and history', async () => {
    const store = tempStore();
    const source: PriceSource = { name: 'test', fetch: async () => ({ price: 40000, matchConfidence: 'exact' }) };
    const outcome = await refreshDevice(store, { brand: 'Apple', model: 'iPhone 14', storage: '128GB' }, source);
    assert.equal(outcome.accepted, true);
    const record = await store.get(deviceKey({ brand: 'Apple', model: 'iPhone 14', storage: '128GB' }));
    assert.ok(record);
    assert.equal(record!.currentPrice, 40000);
    assert.equal(record!.status, 'fresh');
    const history = await store.getHistory(record!.deviceKey);
    assert.equal(history.length, 1);
  });

  await test('THE PHASE-8 GUARANTEE: a failed refresh preserves the last verified price and timestamp, never nulls/zeros it', async () => {
    const store = tempStore();
    const identity = { brand: 'OnePlus', model: 'OnePlus 15R', storage: '512GB' };
    const goodSource: PriceSource = { name: 'good', fetch: async () => ({ price: 30000, matchConfidence: 'exact' }) };
    await refreshDevice(store, identity, goodSource);

    const before = await store.get(deviceKey(identity));
    assert.equal(before!.currentPrice, 30000);
    const verifiedAtBefore = before!.lastVerifiedAt;

    const failingSource: PriceSource = { name: 'failing', fetch: async () => { throw new Error('source unreachable'); } };
    const outcome = await refreshDevice(store, identity, failingSource, { maxRetries: 0 });
    assert.equal(outcome.accepted, false);

    const after = await store.get(deviceKey(identity));
    assert.equal(after!.currentPrice, 30000, 'price must be untouched by a failed refresh');
    assert.equal(after!.lastVerifiedAt, verifiedAtBefore, 'lastVerifiedAt must be untouched by a failed refresh');
    assert.equal(after!.consecutiveFailures, 1);
    assert.equal(after!.status, 'refresh_failed');
  });

  await test('a device with no prior record and a failed refresh is recorded as missing, not fabricated', async () => {
    const store = tempStore();
    const failingSource: PriceSource = { name: 'failing', fetch: async () => { throw new Error('nope'); } };
    await refreshDevice(store, { brand: 'X', model: 'Y', storage: 'Z' }, failingSource, { maxRetries: 0 });
    const record = await store.get(deviceKey({ brand: 'X', model: 'Y', storage: 'Z' }));
    assert.equal(record!.status, 'missing');
    assert.equal(record!.currentPrice, 0);
  });

  await test('a source returning null (genuinely not found) is recorded without retry storms and without a price', async () => {
    const store = tempStore();
    let callCount = 0;
    const source: PriceSource = { name: 'notfound', fetch: async () => { callCount++; return null; } };
    await refreshDevice(store, { brand: 'X', model: 'Y', storage: 'Z' }, source, { maxRetries: 3 });
    assert.equal(callCount, 1, 'a genuine not-found should not be retried like a transient error');
  });

  await test('refresh is idempotent: refreshing twice with the same price does not duplicate history entries incorrectly', async () => {
    const store = tempStore();
    const source: PriceSource = { name: 'test', fetch: async () => ({ price: 20000, matchConfidence: 'exact' }) };
    const identity = { brand: 'A', model: 'B', storage: 'C' };
    await refreshDevice(store, identity, source);
    await refreshDevice(store, identity, source);
    const history = await store.getHistory(deviceKey(identity));
    assert.equal(history.length, 2, 'each refresh call is one history entry (this is correct - it is a log of observations, not deduped snapshots)');
    const record = await store.get(deviceKey(identity));
    assert.equal(record!.currentPrice, 20000);
  });

  await test('refreshCatalog processes multiple devices with bounded concurrency and returns one outcome per device', async () => {
    const store = tempStore();
    const source: PriceSource = { name: 'test', fetch: async (d) => ({ price: 1000, matchConfidence: 'exact' }) };
    const devices = Array.from({ length: 10 }, (_, i) => ({ brand: 'B', model: `M${i}`, storage: 'S' }));
    const outcomes = await refreshCatalog(store, devices, source, { concurrency: 3 });
    assert.equal(outcomes.length, 10);
    assert.ok(outcomes.every((o) => o.accepted));
  });

  console.log('\n=== Store durability ===\n');

  await test('store data survives being re-read via a new store instance pointed at the same file (simulates a process restart)', async () => {
    const file = path.join(os.tmpdir(), `fhoneify-refprice-durability-${Date.now()}.json`);
    const store1 = new FileReferencePriceStore(file);
    const source: PriceSource = { name: 'test', fetch: async () => ({ price: 5000, matchConfidence: 'exact' }) };
    await refreshDevice(store1, { brand: 'X', model: 'Y', storage: 'Z' }, source);

    const store2 = new FileReferencePriceStore(file); // fresh instance, same file - simulates a restart
    const record = await store2.get(deviceKey({ brand: 'X', model: 'Y', storage: 'Z' }));
    assert.ok(record, 'data must survive a simulated process restart via the same backing file');
    assert.equal(record!.currentPrice, 5000);
    fs.unlinkSync(file);
  });

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run();
