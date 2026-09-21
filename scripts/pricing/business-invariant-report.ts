/**
 * Final-offer business invariant report.
 *
 * The parity report in compare-cashify.ts measures only the internal
 * cashifyEquivalent. That is a diagnostic, not the business goal. The goal is:
 *
 *     Fhoneify final offer  ~=  real Cashify condition quote + existing uplift
 *
 * where the uplift is the unchanged 8/6/4% tier with the Rs 2,000 cap. This
 * report therefore tracks TWO errors separately:
 *
 *   equivalentError = cashifyEquivalent - realCashifyQuote
 *   finalOfferError = finalPrice        - applyCompetitorUplift(ref, realCashifyQuote)
 *
 * A small equivalentError does not by itself prove the customer is offered the
 * right amount, which is why both are reported.
 */
import fs from 'node:fs';
import path from 'node:path';
import { explainQuote } from '../../lib/pricing/explain';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { customerPayout } from '../../lib/pricing/payout';
import { pricingFamilyKey } from '../../lib/pricing/families';

export interface BusinessInvariantRow {
  device: string;
  family: string;
  referencePrice: number;
  cashifyQuote: number;
  cashifyEquivalent: number;
  equivalentError: number;
  upliftTier: string;
  expectedFinal: number;
  actualFinal: number;
  finalOfferError: number;
  actualUpliftOverCashify: number;
  customerPayout: number;
  comparability: string;
}

/** The tier the unchanged applyCompetitorUplift() picks, for reporting only. */
export function upliftTierLabel(referencePrice: number): string {
  if (referencePrice <= 20000) return '8%';
  if (referencePrice <= 50000) return '6%';
  return '4%';
}

export function buildBusinessInvariantRows(file: string): BusinessInvariantRow[] {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const records = [...(raw.records ?? []), ...(raw.isolationCases ?? [])];
  const rows: BusinessInvariantRow[] = [];

  for (const record of records) {
    const ramStorage = record.ramStorage ?? record.storage;
    const parsed = parseDiagnostics({
      ...record.fhoneifyAnswers,
      mobileAge: record.fhoneifyAnswers.mobileAge ?? record.age,
    });
    if (!parsed.ok) throw new Error(`invalid answers for ${record.model}: ${parsed.error}`);

    const explanation = explainQuote(record.brand, record.model, record.referencePrice, parsed.value);
    const cashifyQuote = record.cashifyActualFinalQuote;
    const expectedFinal = applyCompetitorUplift(record.referencePrice, cashifyQuote);
    const payout = customerPayout(explanation.finalPrice, record.couponApplied === true);

    rows.push({
      device: `${record.model} ${ramStorage}`,
      family: pricingFamilyKey(record.brand, record.model),
      referencePrice: record.referencePrice,
      cashifyQuote,
      cashifyEquivalent: explanation.cashifyEquivalent,
      equivalentError: explanation.cashifyEquivalent - cashifyQuote,
      upliftTier: upliftTierLabel(record.referencePrice),
      expectedFinal,
      actualFinal: explanation.finalPrice,
      finalOfferError: explanation.finalPrice - expectedFinal,
      actualUpliftOverCashify: explanation.finalPrice - cashifyQuote,
      customerPayout: payout.payout,
      comparability: record.comparabilityStatus ?? 'COMPARABLE',
    });
  }

  return rows;
}

export const DEFAULT_COMPARISON_FILE = path.join(__dirname, 'cashify-comparisons.json');

function mae(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length);
}

if (require.main === module) {
  const index = process.argv.indexOf('--file');
  const file = index >= 0 ? path.resolve(process.argv[index + 1]) : DEFAULT_COMPARISON_FILE;
  const rows = buildBusinessInvariantRows(file);
  console.table(rows);

  const comparable = rows.filter((row) => row.comparability === 'COMPARABLE');
  console.log(`comparable observations      : ${comparable.length} of ${rows.length}`);
  console.log(`cashifyEquivalent MAE        : Rs ${mae(comparable.map((r) => r.equivalentError))}`);
  console.log(`FINAL-OFFER MAE              : Rs ${mae(comparable.map((r) => r.finalOfferError))}`);

  const below = comparable.filter((row) => row.actualUpliftOverCashify <= 0);
  console.log(`final offer NOT above Cashify: ${below.length}`);
  for (const row of below) {
    console.log(`  ${row.device}: final Rs ${row.actualFinal} vs Cashify Rs ${row.cashifyQuote} (${row.actualUpliftOverCashify})`);
  }
}
