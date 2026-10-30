import assert from 'node:assert/strict';
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { toMeasurements } from '../pricing-evidence/import-new-data';

const clean = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['box'], box: true, warranty: true, validBill: true, mobileAge: 'below3' } as any;
for (const [gb, reference] of [[64, 9700], [256, 10020]]) {
  const present = appleEvidenceQuote('iPhone X', `${gb}GB`, reference, { ...clean, charger: true, accessories: ['box', 'charger'] })!;
  const missing = appleEvidenceQuote('iPhone X', `${gb}GB`, reference, { ...clean, charger: false })!;
  assert.equal(present.outcome.price - missing.outcome.price, 300, 'controlled charger pairs must not drift while fitting mixed faults');
}
for (const [gb, reference] of [[64, 14430], [128, 16010], [256, 16660]]) {
  const base = appleEvidenceQuote('iPhone 12 Mini', `${gb}GB`, reference, clean)!;
  const faulty = appleEvidenceQuote('iPhone 12 Mini', `${gb}GB`, reference, { ...clean, hardware: ['front_camera'] })!;
  assert.equal(base.source, 'model');
  assert.equal(faulty.source, 'model');
  assert.ok(Math.abs(base.outcome.price - faulty.outcome.price - 1250) <= 10, `12 Mini ${gb}GB must use its observed ₹1,250 camera repair, not inherited iPhone 12 pricing`);
}

// A report whose flawless condition explicitly includes the charger already
// provides the whole reference proxy. Do not add an unrelated missing-charger offset.
const row: any = { model: 'iPhone 11', storage_gb: 64, case_id: '0', family: 'individual_condition', selling: 10000, base: 10020, imei: 20,
  inputs: { calls: true, touch: true, originalScreen: true, warranty: null, validBill: null, box: true, charger: true, age: null, esim: null, codes: [] },
  status: 'priced', archive: 'explicit-charger.zip', member: 'cases.txt', line: 1, date: '2026-10-28', raw_sha256: 'test', sources: [] };
const result = toMeasurements([row], { referenceOffsets: {} });
assert.equal(result.measurements[0].variant_get_upto, 10020, 'explicit clean charger must not become a reference offset');
console.log('Final iPhone intake: own-model Mini deductions and explicit reference basis passed');
