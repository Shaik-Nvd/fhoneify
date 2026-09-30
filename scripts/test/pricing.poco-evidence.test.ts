import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadPocoFixtures, summarizePocoFixtures } from '../pricing-research/poco-fixtures';

const rows = loadPocoFixtures();
const jsonRows = JSON.parse(fs.readFileSync(path.join(__dirname, '../pricing-research/poco-comparisons.json'), 'utf8'));
assert.deepEqual(jsonRows, rows, 'CSV and JSON evidence fixtures must remain identical');
assert.equal(rows.length, 46);
assert.equal(new Set(rows.map((row) => row.evidence)).size, rows.length);

for (const row of rows) {
  assert.equal(row.cashifyReference, null, 'A final quote is not a Get Upto reference');
  assert.equal(row.cashifyAnswers, null, 'Hidden Cashify answers must not be inferred');
  assert.equal(row.fhoneifyAnswers, null, 'Hidden Fhoneify answers must not be inferred');
  if (row.quality === 'unverified_answers') {
    assert.equal(row.cashifyRamGb, row.fhoneifyRamGb);
    assert.equal(row.cashifyStorageGb, row.fhoneifyStorageGb);
    assert.ok(row.cashifyFinal! > 0 && row.fhoneifyFinal! > 0);
  }
}

const mismatch = rows.find((row) => row.evidence === 'case 19.png')!;
assert.equal(mismatch.quality, 'variant_mismatch');
assert.equal(mismatch.cashifyStorageGb, 512);
assert.equal(mismatch.fhoneifyStorageGb, 256);
assert.equal(rows.find((row) => row.evidence === 'missing 2.png')!.quality, 'no_quote');

const summary = summarizePocoFixtures(rows);
assert.throws(() => summarizePocoFixtures([...rows, { ...rows[0], evidence: 'duplicate.png' }]));
assert.equal(summary.pricePairCount, 45);
assert.equal(summary.descriptiveMatchedVariantCount, 44);
assert.equal(summary.conditionVerifiedCount, 0);
assert.equal(summary.fhoneifyBelowCashify, 1);
assert.equal(summary.fhoneifyAboveCashify, 43);
assert.equal(summary.byCondition.unknown, 44);
console.log('POCO evidence fixture and comparability gates passed');
