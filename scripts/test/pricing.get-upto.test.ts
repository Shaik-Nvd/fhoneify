/**
 * Get Upto semantics (2026-09-23).
 *
 * ReferencePrice.currentPrice is Cashify's live public "Get Upto". Fhoneify's
 * Get Upto must be that figure plus the existing uplift - never a depreciated
 * version of it - and every final offer must stay at or below it.
 *
 * Run: npm run test:pricing:get-upto   (no database needed)
 */
import assert from 'node:assert/strict';
import { applyCompetitorUplift, calculateFhoneifyPrice, DiagnosticsType } from '../../lib/pricingCalculator';
import { computeGetUpto, PERFECT_CONDITION_DIAGNOSTICS, priceDevice, resolveReference } from '../../lib/pricing/engine';
import { SEED_DEVICES } from '../../lib/seed_devices';
import type { CatalogDevice } from '../../lib/pricing/catalog';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
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

const answers = (overrides: Partial<DiagnosticsType> = {}): DiagnosticsType => ({
  ...PERFECT_CONDITION_DIAGNOSTICS,
  mobileAge: 'below3',
  ...overrides,
});

const DAMAGE: [string, Partial<DiagnosticsType>][] = [
  ['cracked screen', { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' }],
  ['visible display lines', { defects: ['screen_spot'], screenLines: 'Visible line(s) on display' }],
  ['broken back panel', { defects: ['panel_missing'], bodyPanel: 'Cracked/ broken side or back panel' }],
  ['bent frame', { bodyBent: 'Bent/ curved panel' }],
  ['touch not working', { touch: false }],
  ['back camera faulty', { hardware: ['back_camera'] }],
  ['old, out of warranty', { mobileAge: 'above11', warranty: false }],
  ['no box', { accessories: ['bill', 'charger'] }],
];

console.log('\nSuite G - Get Upto semantics\n');

test('Get Upto = Cashify Get Upto + existing uplift, for all 7 brands', () => {
  const brands = new Set<string>();
  for (const [brand, model, , reference] of LIVE) {
    const getUpto = computeGetUpto(reference);
    assert.equal(getUpto, applyCompetitorUplift(reference, reference), model);
    assert.ok(getUpto > reference, `${model}: Fhoneify ${getUpto} must be above Cashify ${reference}`);
    const tier = reference <= 20000 ? 0.08 : reference <= 50000 ? 0.06 : 0.04;
    assert.equal(getUpto - reference, Math.round(Math.min(reference * tier, 2000)), `${model}: uplift`);
    brands.add(brand);
  }
  for (const brand of ['Apple', 'Samsung', 'OnePlus', 'Oppo', 'Vivo', 'Xiaomi', 'Realme']) assert.ok(brands.has(brand), brand);
});

test('THE BUG: Get Upto no longer runs age/perfect-condition depreciation (iPhone 15 512GB)', () => {
  // Old flow: 45,570 x 0.7496 (Apple age multiplier) + 380 = 34,540 -> +2,000 = 36,540.
  assert.equal(computeGetUpto(45570), 47570);
});

test('no final offer exceeds the Get Upto; the perfect offer never exceeds it either', () => {
  for (const [brand, model, , reference] of LIVE) {
    const getUpto = computeGetUpto(reference);
    const perfect = priceDevice(brand, model, reference, answers());
    assert.ok(perfect.cashifyConditionEquivalent <= reference, `${model}: equivalent above Cashify Get Upto`);
    assert.ok(perfect.fhoneifyPrice <= getUpto, `${model}: perfect offer above Get Upto`);
    for (const [label, fields] of DAMAGE) {
      const damaged = priceDevice(brand, model, reference, answers(fields));
      assert.ok(damaged.fhoneifyPrice <= getUpto, `${model} ${label}: above Get Upto`);
      assert.equal(damaged.fhoneifyPrice, applyCompetitorUplift(reference, damaged.cashifyConditionEquivalent), `${model} ${label}: uplift`);
    }
  }
});

test('meaningful damage lowers the offer below the perfect-condition offer', () => {
  for (const [brand, model, , reference] of LIVE) {
    const perfect = priceDevice(brand, model, reference, answers()).fhoneifyPrice;
    for (const [label, fields] of DAMAGE) {
      // Existing age rules, unchanged here: Apple 14/15 base is flat across
      // age, and the Oppo formula never reads warranty/above11.
      if (label === 'old, out of warranty' && (brand === 'Apple' || brand === 'Oppo')) continue;
      const damaged = priceDevice(brand, model, reference, answers(fields)).fhoneifyPrice;
      assert.ok(damaged < perfect, `${model} ${label}: ${damaged} must be below ${perfect}`);
    }
  }
});

test('missing box and charger always cost at least the existing ₹380 box value', () => {
  for (const [brand, model, , reference] of LIVE) {
    const withBox = calculateFhoneifyPrice(brand, model, reference, answers()).cashifyConditionEquivalent;
    const noBox = calculateFhoneifyPrice(brand, model, reference, answers({ accessories: ['bill'] })).cashifyConditionEquivalent;
    assert.ok(withBox - noBox >= 380, `${model}: box worth ${withBox - noBox}`);
  }
});

test('whole catalog: Get Upto above the resolved Cashify reference; no offer above Get Upto', () => {
  let checked = 0;
  for (const device of SEED_DEVICES as CatalogDevice[]) {
    const reference = resolveReference({ device });
    if (!reference) continue;
    const getUpto = computeGetUpto(reference.cashifyGetUptoReference);
    assert.ok(getUpto > reference.cashifyGetUptoReference, `${device.model} ${device.storage}`);
    for (const d of [answers(), answers(DAMAGE[0][1]), answers({ calls: false })]) {
      const offer = priceDevice(device.brand, device.model, reference.cashifyGetUptoReference, d).fhoneifyPrice;
      assert.ok(offer <= getUpto, `${device.model} ${device.storage}: offer ${offer} > Get Upto ${getUpto}`);
    }
    checked++;
  }
  assert.ok(checked > 2000, `checked ${checked}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
