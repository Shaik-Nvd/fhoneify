/**
 * Team QA fixture (scripts/pricing/team-qa-observations.json): real Cashify
 * final quotes recorded against the Fhoneify answers that reproduce the
 * tester's on-screen figure exactly. The target is the Cashify condition
 * equivalent, never the uplifted Fhoneify price.
 *
 * Run: npm run test:pricing:team-qa   (no database needed)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applyCompetitorUplift, calculateFhoneifyPrice } from '../../lib/pricingCalculator';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { customerPayout } from '../../lib/pricing/payout';
import { PERFECT_CONDITION_DIAGNOSTICS, resolveReference } from '../../lib/pricing/engine';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { UNKNOWN_QUESTIONNAIRE } from '../../lib/pricing/questionnaireSemantics';
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

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../pricing/team-qa-observations.json'), 'utf8'));
const comparable = fixture.observations.filter((o: any) => o.comparisonStatus === 'COMPARABLE');

const priced = comparable.map((o: any) => {
  const parsed = parseDiagnostics(o.fhoneifyAnswers);
  if (!parsed.ok) throw new Error(`${o.id}: ${parsed.error}`);
  // Priced under the questionnaire Cashify showed for the model.
  const result = calculateFhoneifyPrice(o.brand, o.model, o.referencePrice, parsed.value, o.cashifyQuestionnaire ?? UNKNOWN_QUESTIONNAIRE);
  return { o, result, error: result.cashifyConditionEquivalent - o.cashifyFinal };
});

console.log('\nSuite H - team QA Cashify observations\n');

test("fixture holds the comparable observations with reproduced answers", () => {
  assert.ok(comparable.length >= 14, `${comparable.length} comparable`);
  for (const o of comparable) assert.ok(o.fhoneifyAnswers && o.referencePrice > 0 && o.cashifyFinal > 0, o.id);
});

test('every comparable Cashify equivalent is within ₹2,000 of the real Cashify quote', () => {
  for (const { o, error } of priced) assert.ok(Math.abs(error) <= 2000, `${o.id}: equivalent error ₹${error}`);
});

test('no systematic bias: mean error within ±₹500 and mean absolute error under ₹750', () => {
  const mean = priced.reduce((sum: number, p: any) => sum + p.error, 0) / priced.length;
  const mae = priced.reduce((sum: number, p: any) => sum + Math.abs(p.error), 0) / priced.length;
  assert.ok(Math.abs(mean) <= 500, `mean error ₹${mean.toFixed(0)}`);
  assert.ok(mae < 750, `MAE ₹${mae.toFixed(0)}`);
});

test('the final offer is the Cashify equivalent plus the existing uplift, applied once', () => {
  for (const { o, result } of priced) {
    assert.equal(result.fhoneifyPrice, applyCompetitorUplift(o.referencePrice, result.cashifyConditionEquivalent), o.id);
    assert.ok(o.cashifyQuestionnaire, `${o.id}: comparable observations must record the Cashify questionnaire`);
  }
});

test('whole catalog: warranty answers are monotonic (Oppo included; no-bill never rewards "no warranty")', () => {
  const base = { ...PERFECT_CONDITION_DIAGNOSTICS, mobileAge: 'below3' };
  let checked = 0;
  for (const device of SEED_DEVICES as CatalogDevice[]) {
    const reference = resolveReference({ device });
    if (!device.brand || !reference) continue;
    const price = (d: object) => calculateFhoneifyPrice(device.brand, device.model, reference.cashifyGetUptoReference, { ...base, ...d } as any).cashifyConditionEquivalent;
    const young = price({ warranty: true, validBill: true });
    const youngNoBill = price({ warranty: true, validBill: false, accessories: ['box', 'charger'] });
    const old = price({ warranty: false, mobileAge: 'above11', validBill: true });
    const oldNoBill = price({ warranty: false, mobileAge: 'above11', validBill: false, accessories: ['box', 'charger'] });
    const name = `${device.model} ${device.storage}`;
    assert.ok(old <= young, `${name}: out of warranty ${old} > in warranty ${young}`);
    assert.ok(oldNoBill <= youngNoBill, `${name}: no warranty ${oldNoBill} > warranty without bill ${youngNoBill}`);
    checked++;
  }
  assert.ok(checked > 2000, `checked ${checked}`);
});

test('Oppo out of warranty is no longer priced as new (Reno12 Pro, K12x, A6)', () => {
  for (const [model, reference] of [['OPPO Reno12 Pro 5G', 20250], ['OPPO K12x 5G', 8680], ['OPPO A6 5G', 14370]] as [string, number][]) {
    const old = calculateFhoneifyPrice('Oppo', model, reference, { ...PERFECT_CONDITION_DIAGNOSTICS, warranty: false, mobileAge: 'above11', accessories: [] } as any);
    assert.ok(old.cashifyConditionEquivalent <= Math.round(reference * 0.72), `${model}: ${old.cashifyConditionEquivalent}`);
  }
});

test('the ₹99 display rule explains the on-screen figure (payout = quote − ₹99)', () => {
  assert.equal(customerPayout(8554, false).payout, 8455);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
