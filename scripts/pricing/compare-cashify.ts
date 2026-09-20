/** Offline parity report for manually verified Cashify quotes. */
import fs from 'node:fs';
import path from 'node:path';
import { explainQuote } from '../../lib/pricing/explain';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { pricingFamilyKey } from '../../lib/pricing/families';
import { customerPayout } from '../../lib/pricing/payout';

const CAUSES = new Set([
  'REFERENCE', 'VARIANT', 'AGE', 'SCREEN', 'BODY', 'FUNCTIONAL',
  'ACCESSORY', 'ANSWER_MAPPING', 'FORMULA', 'BRAND_RULE',
  'FAMILY_SEGMENT_RULE', 'UPLIFT', 'DISPLAY', 'UNKNOWN',
]);

interface ComparisonRecord {
  id?: string;
  brand: string;
  model: string;
  ramStorage?: string;
  storage?: string;
  referencePrice: number;
  age?: string;
  fhoneifyAnswers: Record<string, unknown>;
  cashifyActualFinalQuote: number;
  mismatchCause?: string;
  observedAt?: string;
  cashifyObservedAt?: string;
  couponApplied?: boolean;
  comparabilityStatus?: 'COMPARABLE' | 'STALE_NOT_COMPARABLE';
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const defaultFile = path.join(__dirname, 'cashify-comparisons.json');
const file = path.resolve(arg('file') ?? defaultFile);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const primary: ComparisonRecord[] = Array.isArray(raw) ? raw : raw.records;
const isolation: ComparisonRecord[] = Array.isArray(raw) ? [] : (raw.isolationCases ?? []);
if (!Array.isArray(primary)) throw new Error('comparison file must be an array or an object with a records array');

function evaluate(record: ComparisonRecord, index: number, source: 'PRIMARY' | 'ISOLATION') {
  const ramStorage = record.ramStorage ?? record.storage;
  if (!ramStorage) throw new Error(`${source} record ${index + 1}: ramStorage is required`);
  if (!(record.referencePrice > 0) || !(record.cashifyActualFinalQuote > 0)) {
    throw new Error(`${source} record ${index + 1}: referencePrice and cashifyActualFinalQuote must be positive`);
  }
  const parsed = parseDiagnostics({ ...record.fhoneifyAnswers, mobileAge: record.fhoneifyAnswers.mobileAge ?? record.age });
  if (!parsed.ok) throw new Error(`${source} record ${index + 1}: invalid Fhoneify answers: ${parsed.error}`);
  const explanation = explainQuote(record.brand, record.model, record.referencePrice, parsed.value);
  const differenceRupees = explanation.cashifyEquivalent - record.cashifyActualFinalQuote;
  const differencePercent = (differenceRupees / record.cashifyActualFinalQuote) * 100;
  const payout = customerPayout(explanation.finalPrice, record.couponApplied === true);
  const closeEnough = Math.abs(differenceRupees) <= Math.max(500, record.cashifyActualFinalQuote * 0.05);
  const mismatchCause = closeEnough ? 'MATCH' : (record.mismatchCause || 'UNKNOWN').toUpperCase();
  if (mismatchCause !== 'MATCH' && !CAUSES.has(mismatchCause)) throw new Error(`${source} record ${index + 1}: invalid mismatchCause`);
  return {
    id: record.id ?? null,
    source,
    family: pricingFamilyKey(record.brand, record.model),
    brand: record.brand,
    model: record.model,
    ramStorage,
    cashifyActualFinalQuote: record.cashifyActualFinalQuote,
    fhoneifyCashifyEquivalent: explanation.cashifyEquivalent,
    differenceRupees,
    differencePercent: Number(differencePercent.toFixed(2)),
    fhoneifyFinalQuote: explanation.finalPrice,
    customerVisiblePayout: payout.payout,
    upliftRupees: explanation.uplift.rupees,
    mismatchCause,
    comparabilityStatus: record.comparabilityStatus ?? 'COMPARABLE',
    observedAt: record.observedAt ?? record.cashifyObservedAt ?? null,
  };
}

const primaryResults = primary.map((record, index) => evaluate(record, index, 'PRIMARY'));
const isolationResults = isolation.filter((record) => record.cashifyActualFinalQuote > 0)
  .map((record, index) => evaluate(record, index, 'ISOLATION'));
const allResults = [...primaryResults, ...isolationResults];
const comparable = allResults.filter((result) => result.comparabilityStatus === 'COMPARABLE');
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const familyMetrics = [...new Set(comparable.map((result) => result.family))].sort().map((family) => {
  const rows = comparable.filter((result) => result.family === family);
  const errors = rows.map((result) => result.differenceRupees);
  const mape = mean(rows.map((result) => Math.abs(result.differencePercent)));
  const meanError = mean(errors);
  return {
    family,
    observations: rows.length,
    maeRupees: Math.round(mean(errors.map(Math.abs))),
    mapePercent: Number(mape.toFixed(2)),
    bias: meanError > 0 ? 'HIGH' : meanError < 0 ? 'LOW' : 'NEUTRAL',
    maximumAbsoluteErrorRupees: Math.max(...errors.map(Math.abs)),
    medianErrorRupees: Math.round(median(errors)),
    status: mape <= 5 ? 'GOOD' : mape <= 10 ? 'REVIEW' : 'FAIL',
  };
});

const mae = (rows: typeof allResults) => rows.length ? mean(rows.map((row) => Math.abs(row.differenceRupees))) : 0;
const primaryComparable = primaryResults.filter((result) => result.comparabilityStatus === 'COMPARABLE');
const report = {
  coverage: {
    primaryObservations: primaryResults.length,
    isolationObservations: isolationResults.length,
    totalExternalObservations: allResults.length,
    comparableObservations: comparable.length,
    staleOrNotComparable: allResults.length - comparable.length,
    comparableFamilies: new Set(comparable.map((result) => result.family)).size,
    rawPrimaryMaeRupees: Math.round(mae(primaryResults)),
    comparablePrimaryMaeRupees: Math.round(mae(primaryComparable)),
  },
  primaryResults,
  isolationResults,
  familyMetrics,
};

if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.table(primaryResults.map((result) => ({
    device: `${result.brand} ${result.model} ${result.ramStorage}`,
    family: result.family,
    cashify: result.cashifyActualFinalQuote,
    equivalent: result.fhoneifyCashifyEquivalent,
    difference: result.differenceRupees,
    differencePct: `${result.differencePercent}%`,
    status: result.comparabilityStatus,
  })));
  console.table(familyMetrics);
  console.log(`External quotes: ${allResults.length}; comparable: ${comparable.length}; stale/not comparable: ${allResults.length - comparable.length}`);
  console.log(`Primary MAE (all 8 historical records): ₹${report.coverage.rawPrimaryMaeRupees.toLocaleString('en-IN')}`);
  console.log(`Primary MAE (comparable records): ₹${report.coverage.comparablePrimaryMaeRupees.toLocaleString('en-IN')}`);
}
