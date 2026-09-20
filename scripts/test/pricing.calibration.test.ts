/** Offline empirical checks using only manually observed Cashify quotes. */
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
  comparabilityStatus?: 'COMPARABLE' | 'STALE_NOT_COMPARABLE';
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
const comparableRecords = evaluatedRecords.filter((entry) => entry.comparabilityStatus !== 'STALE_NOT_COMPARABLE');
const comparableControls = evaluatedControls.filter((entry) => entry.comparabilityStatus !== 'STALE_NOT_COMPARABLE');
let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  PASS  ${name}`);
}

test('all eight standardized observations are present', () => assert.equal(evaluatedRecords.length, 8));
test('all seven isolation observations have real Cashify values', () => assert.equal(evaluatedControls.length, 7));
test('stale questionnaire observations are excluded from comparable evidence', () => {
  assert.equal(comparableRecords.length, 7);
  assert.equal(comparableControls.length, 6);
});
test('raw standardized-profile MAE materially improves from the ₹4,488 baseline', () => {
  assert.ok(mae(evaluatedRecords) <= 1400, `MAE ${mae(evaluatedRecords).toFixed(0)} exceeds ₹1,400`);
});
test('comparable standardized-profile MAE stays below ₹500', () => {
  assert.ok(mae(comparableRecords) <= 500, `comparable MAE ${mae(comparableRecords).toFixed(0)} exceeds ₹500`);
});
test('OnePlus grouped MAE stays below ₹800', () => {
  assert.ok(mae(evaluatedRecords.filter((entry) => entry.brand === 'OnePlus')) <= 800);
});
test('Samsung slab/fold grouped MAE stays below ₹500', () => {
  assert.ok(mae(evaluatedRecords.filter((entry) => entry.brand === 'Samsung')) <= 500);
});
test('iPhone 15/16 Pro MAE stays below ₹500', () => {
  const currentPro = evaluatedRecords.filter((entry) => /iPhone (15|16) Pro/.test(entry.model));
  assert.ok(mae(currentPro) <= 500);
});
test('six comparable isolation controls stay below ₹500 aggregate MAE', () => {
  assert.ok(mae(comparableControls) <= 500, `control MAE ${mae(comparableControls).toFixed(0)} exceeds ₹500`);
});

console.log(`\n${passed} passed, 0 failed`);
