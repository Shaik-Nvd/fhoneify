/**
 * Calculates planned profile-isolation cases without scraping Cashify or
 * accessing the database. Actual Cashify values intentionally remain null
 * until a human records them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { explainQuote } from '../../lib/pricing/explain';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { customerPayout } from '../../lib/pricing/payout';

interface IsolationCase {
  id: string;
  case: string;
  brand: string;
  model: string;
  ramStorage: string;
  referencePrice: number;
  cashifyActualFinalQuote: number | null;
  fhoneifyAnswers: Record<string, unknown>;
  cashifySelections: string;
}

const file = path.join(__dirname, 'cashify-comparisons.json');
const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { isolationCases?: IsolationCase[] };
const cases = raw.isolationCases ?? [];

const result = cases.map((entry) => {
  const parsed = parseDiagnostics(entry.fhoneifyAnswers);
  if (!parsed.ok) throw new Error(`${entry.case}: ${parsed.error}`);
  const explanation = explainQuote(entry.brand, entry.model, entry.referencePrice, parsed.value);
  const steps = Object.fromEntries(explanation.steps.map((step) => [step.step, step.delta]));
  const payout = customerPayout(explanation.finalPrice, false);
  return {
    case: entry.case,
    device: `${entry.brand} ${entry.model} ${entry.ramStorage}`,
    normalizedPayload: parsed.value,
    referencePrice: entry.referencePrice,
    perfectConditionCashifyEquivalent: explanation.perfectConditionCashifyEquivalent,
    ageEffect: steps.age ?? 0,
    warrantyBillEffect: steps['warranty / bill'] ?? 0,
    screenEffect: steps.screen ?? 0,
    bodyEffect: steps.body ?? 0,
    functionalEffect: steps.functional ?? 0,
    accessoryEffect: steps.accessories ?? 0,
    cashifyEquivalent: explanation.cashifyEquivalent,
    uplift: explanation.uplift,
    finalFhoneifyQuote: explanation.finalPrice,
    customerVisiblePayout: payout.payout,
    cashifyActualFinalQuote: entry.cashifyActualFinalQuote,
    cashifySelections: entry.cashifySelections,
  };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.table(result.map((entry) => ({
    case: entry.case,
    device: entry.device,
    reference: entry.referencePrice,
    age: entry.ageEffect,
    warrantyBill: entry.warrantyBillEffect,
    screen: entry.screenEffect,
    equivalent: entry.cashifyEquivalent,
    cashify: entry.cashifyActualFinalQuote,
    difference: entry.cashifyActualFinalQuote === null ? null : entry.cashifyEquivalent - entry.cashifyActualFinalQuote,
    final: entry.finalFhoneifyQuote,
    payout: entry.customerVisiblePayout,
  })));
}
