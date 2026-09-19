/**
 * Offline calibration report for manually verified Cashify quotes.
 * This command never scrapes Cashify and never reads or writes a database.
 *
 * npm run pricing:compare-cashify
 * npm run pricing:compare-cashify -- --file path/to/records.json --json
 */
import fs from 'node:fs';
import path from 'node:path';
import { explainQuote } from '../../lib/pricing/explain';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';

const CAUSES = new Set([
  'REFERENCE', 'VARIANT', 'AGE', 'SCREEN', 'BODY', 'FUNCTIONAL',
  'ACCESSORY', 'ANSWER_MAPPING', 'FORMULA', 'UNKNOWN',
]);

interface ComparisonRecord {
  brand: string;
  model: string;
  storage: string;
  referencePrice: number;
  age: string;
  cashifyAnswers: Record<string, unknown>;
  fhoneifyAnswers: Record<string, unknown>;
  cashifyActualFinalQuote: number;
  mismatchCause?: string;
  observedAt?: string;
  notes?: string;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const defaultFile = path.join(__dirname, 'cashify-comparisons.json');
const file = path.resolve(arg('file') ?? defaultFile);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const records: ComparisonRecord[] = Array.isArray(raw) ? raw : raw.records;

if (!Array.isArray(records)) throw new Error('comparison file must be an array or an object with a records array');

const results = records.map((record, index) => {
  if (!(record.referencePrice > 0) || !(record.cashifyActualFinalQuote > 0)) {
    throw new Error(`record ${index + 1}: referencePrice and cashifyActualFinalQuote must be positive`);
  }
  const parsed = parseDiagnostics({ ...record.fhoneifyAnswers, mobileAge: record.fhoneifyAnswers.mobileAge ?? record.age });
  if (!parsed.ok) throw new Error(`record ${index + 1}: invalid Fhoneify answers: ${parsed.error}`);
  const explanation = explainQuote(record.brand, record.model, record.referencePrice, parsed.value);
  const differenceRupees = explanation.cashifyEquivalent - record.cashifyActualFinalQuote;
  const differencePercent = (differenceRupees / record.cashifyActualFinalQuote) * 100;
  const closeEnough = Math.abs(differenceRupees) <= Math.max(500, record.cashifyActualFinalQuote * 0.05);
  const mismatchCause = closeEnough ? 'MATCH' : (record.mismatchCause || 'UNKNOWN').toUpperCase();
  if (mismatchCause !== 'MATCH' && !CAUSES.has(mismatchCause)) {
    throw new Error(`record ${index + 1}: invalid mismatchCause ${record.mismatchCause}`);
  }
  return {
    brand: record.brand,
    model: record.model,
    storage: record.storage,
    referencePrice: record.referencePrice,
    age: record.age,
    cashifyAnswers: record.cashifyAnswers,
    fhoneifyAnswers: parsed.value,
    cashifyActualFinalQuote: record.cashifyActualFinalQuote,
    fhoneifyCashifyEquivalent: explanation.cashifyEquivalent,
    differenceRupees,
    differencePercent: Number(differencePercent.toFixed(2)),
    fhoneifyFinalQuote: explanation.finalPrice,
    upliftRupees: explanation.uplift.rupees,
    mismatchCause,
    observedAt: record.observedAt ?? null,
    notes: record.notes ?? null,
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else if (results.length === 0) {
  console.log(`No verified comparison records in ${file}. Add manual same-variant observations before calibrating numeric rules.`);
} else {
  console.table(results.map((result) => ({
    device: `${result.brand} ${result.model} ${result.storage}`,
    cashify: result.cashifyActualFinalQuote,
    equivalent: result.fhoneifyCashifyEquivalent,
    difference: result.differenceRupees,
    differencePct: `${result.differencePercent}%`,
    fhoneifyFinal: result.fhoneifyFinalQuote,
    uplift: result.upliftRupees,
    cause: result.mismatchCause,
  })));
  const meanAbsoluteError = results.reduce((sum, result) => sum + Math.abs(result.differenceRupees), 0) / results.length;
  console.log(`Records: ${results.length}; mean absolute error: ₹${Math.round(meanAbsoluteError).toLocaleString('en-IN')}`);
}
