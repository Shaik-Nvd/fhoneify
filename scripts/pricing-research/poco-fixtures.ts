/** Evidence transcription and descriptive statistics, never pricing calibration input by default. */
import fs from 'node:fs';
import path from 'node:path';

export type Quality = 'unverified_answers' | 'variant_mismatch' | 'no_quote';
export interface PocoFixture {
  evidence: string;
  model: string | null;
  cashifyRamGb: number | null;
  cashifyStorageGb: number | null;
  fhoneifyRamGb: number | null;
  fhoneifyStorageGb: number | null;
  cashifyReference: number | null;
  cashifyFinal: number | null;
  fhoneifyFinal: number | null;
  cashifyAnswers: null;
  fhoneifyAnswers: null;
  quality: Quality;
  note: string;
}

const csvPath = path.join(__dirname, 'poco-comparisons.csv');
const numberOrNull = (value: string): number | null => value === '' ? null : Number(value);
const textOrNull = (value: string): string | null => value === '' ? null : value;

export function loadPocoFixtures(): PocoFixture[] {
  const lines = fs.readFileSync(csvPath, 'utf8').trimEnd().split(/\r?\n/);
  const expectedHeader = 'evidence,model,cashify_ram_gb,cashify_storage_gb,fhoneify_ram_gb,fhoneify_storage_gb,cashify_reference,cashify_final,fhoneify_final,cashify_answers,fhoneify_answers,quality,note';
  if (lines.shift() !== expectedHeader) throw new Error('Unexpected POCO fixture header');
  return lines.map((line) => {
    const values = line.split(',');
    if (values.length !== 13) throw new Error(`Malformed fixture row: ${values[0]}`);
    const [evidence, model, cashifyRam, cashifyStorage, fhoneifyRam, fhoneifyStorage,
      cashifyReference, cashifyFinal, fhoneifyFinal, cashifyAnswers, fhoneifyAnswers, quality, note] = values;
    if (cashifyAnswers || fhoneifyAnswers) throw new Error(`Answers require structured review: ${evidence}`);
    if (!['unverified_answers', 'variant_mismatch', 'no_quote'].includes(quality)) {
      throw new Error(`Unknown fixture quality: ${evidence}`);
    }
    return {
      evidence, model: textOrNull(model),
      cashifyRamGb: numberOrNull(cashifyRam), cashifyStorageGb: numberOrNull(cashifyStorage),
      fhoneifyRamGb: numberOrNull(fhoneifyRam), fhoneifyStorageGb: numberOrNull(fhoneifyStorage),
      cashifyReference: numberOrNull(cashifyReference),
      cashifyFinal: numberOrNull(cashifyFinal), fhoneifyFinal: numberOrNull(fhoneifyFinal),
      cashifyAnswers: null, fhoneifyAnswers: null,
      quality: quality as Quality, note,
    };
  });
}

const round = (n: number): number => Math.round(n * 100) / 100;
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function summarizePocoFixtures(rows: PocoFixture[]) {
  const seen = new Set<string>();
  const seenTests = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.evidence)) throw new Error(`Duplicate evidence: ${row.evidence}`);
    seen.add(row.evidence);
    if (row.cashifyFinal !== null && row.fhoneifyFinal !== null) {
      const testKey = [row.model, row.cashifyRamGb, row.cashifyStorageGb,
        row.fhoneifyRamGb, row.fhoneifyStorageGb, row.cashifyFinal, row.fhoneifyFinal].join('|');
      if (seenTests.has(testKey)) throw new Error(`Repeated price-pair test: ${row.evidence}`);
      seenTests.add(testKey);
    }
  }
  const pairs = rows.filter((row) => row.quality === 'unverified_answers');
  const diffs = pairs.map((row) => row.fhoneifyFinal! - row.cashifyFinal!);
  const absolute = diffs.map(Math.abs);
  const percentages = pairs.map((row, i) => 100 * diffs[i] / row.cashifyFinal!);
  const byFamily = Object.fromEntries(['F', 'X', 'M', 'C'].map((family) => {
    const familyRows = pairs.filter((row) => row.model!.startsWith(`POCO ${family}`));
    return [family, {
      count: familyRows.length,
      meanAbsoluteGap: round(familyRows.reduce((sum, row) => sum + Math.abs(row.fhoneifyFinal! - row.cashifyFinal!), 0) / familyRows.length),
    }];
  }));
  return {
    screenshotCount: rows.length,
    pricePairCount: rows.filter((row) => row.cashifyFinal !== null && row.fhoneifyFinal !== null).length,
    variantMismatchCount: rows.filter((row) => row.quality === 'variant_mismatch').length,
    noQuoteCount: rows.filter((row) => row.quality === 'no_quote').length,
    conditionVerifiedCount: 0,
    descriptiveMatchedVariantCount: pairs.length,
    meanAbsoluteGap: round(absolute.reduce((sum, value) => sum + value, 0) / absolute.length),
    medianAbsoluteGap: median(absolute),
    meanAbsolutePercentageGap: round(percentages.reduce((sum, value) => sum + Math.abs(value), 0) / percentages.length),
    meanSignedPercentageGap: round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length),
    fhoneifyBelowCashify: diffs.filter((value) => value < 0).length,
    fhoneifyAboveCashify: diffs.filter((value) => value > 0).length,
    byFamily,
    byCondition: { unknown: pairs.length },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const rows = loadPocoFixtures();
  if (process.argv.includes('--json')) {
    fs.writeFileSync(path.join(__dirname, 'poco-comparisons.json'), JSON.stringify(rows, null, 2) + '\n');
  }
  console.log(JSON.stringify(summarizePocoFixtures(rows), null, 2));
}
