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
import { customerPayout } from '../../lib/pricing/payout';

const CAUSES = new Set([
  'REFERENCE', 'VARIANT', 'AGE', 'SCREEN', 'BODY', 'FUNCTIONAL',
  'ACCESSORY', 'ANSWER_MAPPING', 'FORMULA', 'BRAND_RULE',
  'FAMILY_SEGMENT_RULE', 'UPLIFT', 'DISPLAY', 'UNKNOWN',
]);

interface ComparisonRecord {
  brand: string;
  model: string;
  /** New records should use the Cashify-visible RAM/storage label. `storage`
   * remains accepted for the initially empty dataset format. */
  ramStorage?: string;
  storage?: string;
  referencePrice: number;
  age: string;
  cashifyAnswers: Record<string, unknown>;
  fhoneifyAnswers: Record<string, unknown>;
  cashifyActualFinalQuote: number;
  mismatchCause?: string;
  observedAt?: string;
  notes?: string;
  couponApplied?: boolean;
  fhoneifyDisplayedQuote?: number;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const defaultFile = path.join(__dirname, 'cashify-comparisons.json');
const file = path.resolve(arg('file') ?? defaultFile);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const records: ComparisonRecord[] = Array.isArray(raw) ? raw : raw.records;
const pendingManualObservationCount = Array.isArray(raw) ? 0 : (raw.manualObservations?.length ?? 0);

if (!Array.isArray(records)) throw new Error('comparison file must be an array or an object with a records array');

const results = records.map((record, index) => {
  const ramStorage = record.ramStorage ?? record.storage;
  if (!ramStorage) throw new Error(`record ${index + 1}: ramStorage is required`);
  if (!(record.referencePrice > 0) || !(record.cashifyActualFinalQuote > 0)) {
    throw new Error(`record ${index + 1}: referencePrice and cashifyActualFinalQuote must be positive`);
  }
  const parsed = parseDiagnostics({ ...record.fhoneifyAnswers, mobileAge: record.fhoneifyAnswers.mobileAge ?? record.age });
  if (!parsed.ok) throw new Error(`record ${index + 1}: invalid Fhoneify answers: ${parsed.error}`);
  const explanation = explainQuote(record.brand, record.model, record.referencePrice, parsed.value);
  const differenceRupees = explanation.cashifyEquivalent - record.cashifyActualFinalQuote;
  const differencePercent = (differenceRupees / record.cashifyActualFinalQuote) * 100;
  const payout = customerPayout(explanation.finalPrice, record.couponApplied === true);
  const closeEnough = Math.abs(differenceRupees) <= Math.max(500, record.cashifyActualFinalQuote * 0.05);
  const mismatchCause = closeEnough ? 'MATCH' : (record.mismatchCause || 'UNKNOWN').toUpperCase();
  if (mismatchCause !== 'MATCH' && !CAUSES.has(mismatchCause)) {
    throw new Error(`record ${index + 1}: invalid mismatchCause ${record.mismatchCause}`);
  }
  return {
    brand: record.brand,
    model: record.model,
    ramStorage,
    referencePrice: record.referencePrice,
    age: record.age,
    cashifyAnswers: record.cashifyAnswers,
    fhoneifyAnswers: parsed.value,
    cashifyActualFinalQuote: record.cashifyActualFinalQuote,
    fhoneifyCashifyEquivalent: explanation.cashifyEquivalent,
    differenceRupees,
    differencePercent: Number(differencePercent.toFixed(2)),
    fhoneifyFinalQuote: explanation.finalPrice,
    customerVisiblePayout: payout.payout,
    couponApplied: record.couponApplied === true,
    recordedFhoneifyDisplayedQuote: record.fhoneifyDisplayedQuote ?? null,
    upliftRupees: explanation.uplift.rupees,
    mismatchCause,
    observedAt: record.observedAt ?? null,
    notes: record.notes ?? null,
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else if (results.length === 0) {
  console.log(`No complete comparison records in ${file}.`);
  if (pendingManualObservationCount > 0) {
    console.log(`${pendingManualObservationCount} real manual observation(s) are retained as incomplete: add their exact Fhoneify diagnostics, Cashify answers, observation-time reference price, and coupon state before promoting them to records.`);
  } else {
    console.log('Add manual same-variant observations before calibrating numeric rules.');
  }
} else {
  console.table(results.map((result) => ({
    device: `${result.brand} ${result.model} ${result.ramStorage}`,
    cashify: result.cashifyActualFinalQuote,
    equivalent: result.fhoneifyCashifyEquivalent,
    difference: result.differenceRupees,
    differencePct: `${result.differencePercent}%`,
    fhoneifyFinal: result.fhoneifyFinalQuote,
    payout: result.customerVisiblePayout,
    uplift: result.upliftRupees,
    cause: result.mismatchCause,
  })));
  const meanAbsoluteError = results.reduce((sum, result) => sum + Math.abs(result.differenceRupees), 0) / results.length;
  console.log(`Records: ${results.length}; mean absolute error: ₹${Math.round(meanAbsoluteError).toLocaleString('en-IN')}`);
}
