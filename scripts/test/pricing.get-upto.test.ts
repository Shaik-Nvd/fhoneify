/**
 * Get Upto semantics (2026-09-23).
 *
 * ReferencePrice.currentPrice is Cashify's live public "Get Upto". Fhoneify's
 * Get Upto is that figure plus the existing uplift (4/6/8%, extra capped at
 * ₹2,000) and nothing else - no age, warranty, bill, box, charger or
 * condition rule. Final offers are a separate path and are not tested here.
 *
 * Run: npm run test:pricing:get-upto   (no database needed)
 */
import assert from 'node:assert/strict';
import { applyCompetitorUplift, DiagnosticsType } from '../../lib/pricingCalculator';
import { computeFhoneifyGetUpto, PERFECT_CONDITION_DIAGNOSTICS, resolveReference } from '../../lib/pricing/engine';
import { createPricingService } from '../../lib/pricing/pricingService';
import { deviceKey, ReferencePriceRecord } from '../../lib/referencePricing/types';
import { SEED_DEVICES } from '../../lib/seed_devices';
import type { CatalogDevice } from '../../lib/pricing/catalog';

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

/** Cashify Get Upto values read from Supabase ReferencePrice (source
 * "cashify", verified 2026-09-20). */
const LIVE: [string, string, string, number][] = [
  ['Apple', 'Apple iPhone 15', '512GB', 45570],
  ['Apple', 'Apple iPhone 14', '128GB', 27220],
  ['Apple', 'Apple iPhone 14 Pro Max', '256GB', 45080],
  ['Apple', 'Apple iPhone 16 Pro', '256GB', 76920],
  ['Samsung', 'Samsung Galaxy S24 5G', '8 GB/256 GB', 34710],
  ['OnePlus', 'OnePlus 13', '16 GB/512 GB', 43300],
  ['OnePlus', 'OnePlus Nord 4', '12 GB/256 GB', 20540],
  ['Oppo', 'OPPO Reno11 5G', '8 GB/256 GB', 16670],
  ['Oppo', 'OPPO Find X8 Pro 5G', '16 GB/512 GB', 45320],
  ['Vivo', 'Vivo V30 Pro', '8 GB/256 GB', 20940],
  ['Xiaomi', 'Xiaomi Redmi Note 13 Pro 5G', '8 GB/256 GB', 13550],
  ['Realme', 'Realme 12 Pro 5G', '12 GB/256 GB', 15210],
];

const expectedGetUpto = (reference: number) => {
  const tier = reference <= 20000 ? 0.08 : reference <= 50000 ? 0.06 : 0.04;
  return Math.round(reference + Math.min(reference * tier, 2000));
};

class Repo {
  records = new Map<string, ReferencePriceRecord>();
  async get(key: string) { return this.records.get(key) ?? null; }
  async listAll() { return [...this.records.values()]; }
  async upsert(): Promise<never> { throw new Error('read-only'); }
}

async function run() {
  console.log('\nSuite G - Get Upto semantics\n');

  await test('Get Upto = Cashify Get Upto + 4/6/8% uplift (extra capped at ₹2,000), all 7 brands', () => {
    const brands = new Set<string>();
    for (const [brand, model, , reference] of LIVE) {
      const getUpto = computeFhoneifyGetUpto(reference);
      assert.equal(getUpto, expectedGetUpto(reference), model);
      assert.equal(getUpto, applyCompetitorUplift(reference, reference), model);
      assert.ok(getUpto > reference, `${model}: Fhoneify ${getUpto} must be above Cashify ${reference}`);
      brands.add(brand);
    }
    for (const brand of ['Apple', 'Samsung', 'OnePlus', 'Oppo', 'Vivo', 'Xiaomi', 'Realme']) assert.ok(brands.has(brand), brand);
  });

  await test('THE BUG: iPhone 15 512GB Get Upto is ₹47,570, not the depreciated ₹36,540', () => {
    assert.equal(computeFhoneifyGetUpto(45570), 47570);
  });

  await test('the cap limits only the extra uplift, never the price back to Cashify', () => {
    assert.equal(computeFhoneifyGetUpto(120000), 122000);
    assert.equal(computeFhoneifyGetUpto(76920), 78920);
  });

  await test('API startingPrice = uplift(ReferencePrice) for every device, whatever the answers', async () => {
    const repo = new Repo();
    const at = new Date().toISOString();
    for (const [brand, model, storage, currentPrice] of LIVE) {
      repo.records.set(deviceKey({ brand, model, storage }), {
        deviceKey: deviceKey({ brand, model, storage }), brand, model, storage, source: 'cashify',
        currentPrice, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at, lastFailureAt: null,
        lastFailureError: null, consecutiveFailures: 0, createdAt: at, updatedAt: at,
      } as unknown as ReferencePriceRecord);
    }
    const svc = createPricingService({
      repository: repo as any, signingSecret: 'x'.repeat(32), tokenTtlSeconds: 600, strictReferenceMode: false,
      referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} },
    });
    const damaged: DiagnosticsType = {
      ...PERFECT_CONDITION_DIAGNOSTICS, touch: false, defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken',
      warranty: false, validBill: false, accessories: [], mobileAge: 'above11', hardware: ['back_camera'],
    };
    for (const [, model, storage, reference] of LIVE) {
      const brand = LIVE.find((row) => row[1] === model)![0];
      for (const diagnostics of [PERFECT_CONDITION_DIAGNOSTICS, damaged]) {
        const q = await svc.quote({ brand, model, storage, diagnostics });
        assert.ok(q.ok, `${model}: ${!q.ok ? q.code : ''}`);
        if (q.ok) assert.equal(q.startingPrice, expectedGetUpto(reference), `${model}: startingPrice`);
      }
    }
  });

  await test('whole catalog: Get Upto is exactly uplift(resolved reference) and above it', () => {
    let checked = 0;
    for (const device of SEED_DEVICES as CatalogDevice[]) {
      const reference = resolveReference({ device });
      if (!reference) continue;
      const getUpto = computeFhoneifyGetUpto(reference.cashifyGetUptoReference);
      assert.equal(getUpto, expectedGetUpto(reference.cashifyGetUptoReference), `${device.model} ${device.storage}`);
      assert.ok(getUpto > reference.cashifyGetUptoReference, `${device.model} ${device.storage}`);
      checked++;
    }
    assert.ok(checked > 2000, `checked ${checked}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
