/**
 * Offline empirical calibration checks. These use only the manually observed
 * Cashify values in cashify-comparisons.json and never access a database or
 * the network.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { priceDevice } from '../../lib/pricing/engine';

interface Observation {
  brand: string;
  model: string;
  referencePrice: number;
  cashifyActualFinalQuote: number;
  fhoneifyAnswers: Record<string, unknown>;
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../pricing/cashify-comparisons.json'), 'utf8'));
const records = data.records as Observation[];
const controls = (data.isolationCases as Observation[]).filter((entry) => entry.cashifyActualFinalQuote > 0);

const evaluate = (entry: Observation) => {
  const parsed = parseDiagnostics(entry.fhoneifyAnswers);
  assert.ok(parsed.ok, `${entry.model}: diagnostics must parse`);
  const equivalent = priceDevice(entry.brand, entry.model, entry.referencePrice, parsed.value).cashifyBasePrice;
  return { ...entry, equivalent, error: equivalent - entry.cashifyActualFinalQuote };
};

const mae = (items: ReturnType<typeof evaluate>[]) =>
  items.reduce((sum, item) => sum + Math.abs(item.error), 0) / items.length;

const evaluatedRecords = records.map(evaluate);
const evaluatedControls = controls.map(evaluate);
let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  PASS  ${name}`);
}

test('all eight standardized observations are present', () => assert.equal(evaluatedRecords.length, 8));
test('all six isolation controls have real Cashify values', () => assert.equal(evaluatedControls.length, 6));
test('standardized-profile MAE materially improves from the ₹4,488 baseline', () => {
  assert.ok(mae(evaluatedRecords) <= 1400, `MAE ${mae(evaluatedRecords).toFixed(0)} exceeds ₹1,400`);
});
test('OnePlus grouped MAE stays below ₹800', () => {
  assert.ok(mae(evaluatedRecords.filter((entry) => entry.brand === 'OnePlus')) <= 800);
});
test('Samsung slab/fold grouped MAE stays below ₹500', () => {
  assert.ok(mae(evaluatedRecords.filter((entry) => entry.brand === 'Samsung')) <= 500);
});
test('iPhone 15/16 Pro MAE stays below ₹500 without masking the unresolved 14 Pro Max', () => {
  const currentPro = evaluatedRecords.filter((entry) => /iPhone (15|16) Pro/.test(entry.model));
  assert.ok(mae(currentPro) <= 500);
});
test('six isolation controls stay below ₹500 aggregate MAE', () => {
  assert.ok(mae(evaluatedControls) <= 500, `control MAE ${mae(evaluatedControls).toFixed(0)} exceeds ₹500`);
});

console.log(`\n${passed} passed, 0 failed`);
