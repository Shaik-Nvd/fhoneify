/** Prepare a read-only, fill-in-the-price Cashify parity checklist. */
import fs from 'node:fs';
import path from 'node:path';
import referenceStore from '../../server/data/reference-prices/store.json';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { pricingFamilyKey } from '../../lib/pricing/families';
import { priceDevice } from '../../lib/pricing/engine';
import { customerPayout } from '../../lib/pricing/payout';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { VALIDATION_PROFILES } from './validation-profiles';

interface Scenario {
  id: string;
  brand: string;
  model: string;
  storage: string;
  profile: keyof typeof VALIDATION_PROFILES;
  why: string;
}

const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'cashify-validation-plan.json'), 'utf8')) as { scenarios: Scenario[] };
const records = (referenceStore as { records: Record<string, ReferencePriceRecord> }).records;

const selectionSummary: Record<string, string> = {
  P0_PERFECT: 'Calls Yes; touch Yes; original screen Yes; youngest age; warranty Yes; valid bill Yes; no defects/faults; box Yes; charger Yes.',
  P1_OLD_NO_DAMAGE: 'Calls Yes; touch Yes; original screen Yes; above 11 months; warranty No; valid bill Yes; no defects/faults; box Yes; charger Yes.',
  P2_HEAVY_SCREEN: 'Calls Yes; touch Yes; original screen Yes; youngest age; warranty Yes; valid bill Yes; more than 2 screen scratches only; box Yes; charger Yes.',
  P3_FUNCTIONAL: 'Calls Yes; touch Yes; original screen Yes; youngest age; warranty Yes; valid bill Yes; speaker fault only; no physical damage; box Yes; charger Yes.',
  P4_BODY: 'Calls Yes; touch Yes; original screen Yes; youngest age; warranty Yes; valid bill Yes; more than 2 body scratches and major/more than 2 dents only; box Yes; charger Yes.',
};

const prepared = plan.scenarios.map((scenario) => {
  const reference = records[deviceKey(scenario)];
  if (!reference) throw new Error(`${scenario.id}: no ReferencePrice record for exact variant`);
  if (reference.status !== 'fresh') throw new Error(`${scenario.id}: ReferencePrice is ${reference.status}, not fresh`);
  const profile = { ...VALIDATION_PROFILES[scenario.profile] };
  if (!profile) throw new Error(`${scenario.id}: unknown profile ${scenario.profile}`);
  if (scenario.brand === 'Apple') profile.eSim = 'Dual eSIM';
  const parsed = parseDiagnostics(profile);
  if (!parsed.ok) throw new Error(`${scenario.id}: profile does not normalize: ${parsed.error}`);
  const quote = priceDevice(scenario.brand, scenario.model, reference.currentPrice, parsed.value);
  return {
    ...scenario,
    family: pricingFamilyKey(scenario.brand, scenario.model),
    referencePrice: reference.currentPrice,
    normalizedAnswers: parsed.value,
    cashifySelections: `${selectionSummary[scenario.profile]}${scenario.brand === 'Apple' ? ' Dual eSIM if asked.' : ''}`,
    cashifyEquivalent: quote.cashifyBasePrice,
    finalPrice: quote.fhoneifyPrice,
    displayedPayout: customerPayout(quote.fhoneifyPrice, false).payout,
    cashifyActualFinalQuote: null,
  };
});

if (process.argv.includes('--json')) console.log(JSON.stringify(prepared, null, 2));
else {
  console.log('| Case | Device | Profile | Exact Cashify selections | Why needed | Cashify price |');
  console.log('|---|---|---|---|---|---:|');
  for (const row of prepared) {
    console.log(`| ${row.id} | ${row.brand} ${row.model} — ${row.storage} | ${row.profile} | ${row.cashifySelections} | ${row.why} | ₹____ |`);
  }
  console.log(`\n${prepared.length} scenarios; all exact variants have fresh local ReferencePrice records.`);
}
