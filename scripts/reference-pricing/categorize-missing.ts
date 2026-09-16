/**
 * Phase 4: categorize every device with no reference price, to find out
 * WHY it's missing rather than just knowing THAT it's missing. This does
 * not fix anything or fabricate data - it produces an inventory so a
 * decision can be made about which category(ies) are worth investing in.
 *
 * Categories (per the investigation brief):
 *   A. Reference exists but matching failed (a real cashify_prices.json
 *      entry exists for this device under a DIFFERENT key than the one
 *      the legacy lookup algorithm generates)
 *   C. Device naming mismatch (a plausible near-miss key exists - same
 *      normalized brand+model, different storage formatting)
 *   D. Brand/model normalization issue (see C - same underlying evidence,
 *      reported together since this codebase's lookup key conflates them)
 *   F. Reference data has never been collected for this brand/model at
 *      all (no near-miss key found anywhere in the price table)
 *
 * B (storage/variant matching failed), E (genuinely unavailable from
 * Cashify), G (scraper/import infra missing), H (other) are not
 * computable from static analysis alone - flagged as "needs human
 * judgement" rather than guessed at.
 *
 * Run: npx tsx scripts/reference-pricing/categorize-missing.ts
 */
import { SEED_DEVICES } from '../../lib/seed_devices';
import cashifyPricesRaw from '../../lib/cashify_prices.json';
import { legacyLookupKey } from '../../lib/referencePricing/matching';

const cashifyPrices = cashifyPricesRaw as Record<string, number>;
const allKeys = Object.keys(cashifyPrices);

interface CategoryCount {
  category: string;
  count: number;
  examples: string[];
}

const categories: Record<string, CategoryCount> = {
  A_near_miss_key_exists: { category: 'A/C/D: a near-miss key exists (likely a formatting/normalization mismatch in the lookup, not truly missing data)', count: 0, examples: [] },
  F_never_collected: { category: 'F: no near-miss key anywhere - reference data for this brand/model was never collected', count: 0, examples: [] },
};

function findNearMissKey(model: string, storage: string): string | null {
  // A near-miss: the model portion of the legacy key (dash-separated,
  // same algorithm as legacyLookupKey but without the storage suffix)
  // appears as a prefix of some existing key, but the exact
  // legacyLookupKey didn't hit. This deliberately does NOT try to match a
  // different model/variant - it only reports a near miss when the whole
  // model text matches as a prefix, so it can never suggest merging two
  // genuinely different phones (e.g. "15" would not prefix-match "15r"'s
  // key incorrectly, since the model tokens differ before the dash).
  const modelPrefix = model.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return allKeys.find((k) => k.startsWith(modelPrefix)) ?? null;
}

let checked = 0;
let missingTotal = 0;

for (const device of SEED_DEVICES as any[]) {
  if (!device.brand || !device.model || !device.storage || !device.basePrice) continue;
  checked++;
  const key = legacyLookupKey(device.model, device.storage);
  if (key in cashifyPrices) continue; // has a reference, not part of this report

  missingTotal++;
  const nearMiss = findNearMissKey(device.model, device.storage);
  if (nearMiss) {
    categories.A_near_miss_key_exists.count++;
    if (categories.A_near_miss_key_exists.examples.length < 15) {
      categories.A_near_miss_key_exists.examples.push(`${device.brand} ${device.model} (${device.storage}) -> generated key "${key}", but found near-miss key "${nearMiss}" = ${cashifyPrices[nearMiss]}`);
    }
  } else {
    categories.F_never_collected.count++;
    if (categories.F_never_collected.examples.length < 15) {
      categories.F_never_collected.examples.push(`${device.brand} ${device.model} (${device.storage}) -> key "${key}", no near-miss found anywhere in cashify_prices.json`);
    }
  }
}

console.log(`Checked ${checked} devices with a basePrice; ${missingTotal} have no cashify_prices.json reference.\n`);
for (const cat of Object.values(categories)) {
  console.log(`${cat.category}`);
  console.log(`  Count: ${cat.count} (${((cat.count / missingTotal) * 100).toFixed(1)}% of missing)`);
  cat.examples.forEach((e) => console.log(`    - ${e}`));
  if (cat.count > cat.examples.length) console.log(`    ...and ${cat.count - cat.examples.length} more`);
  console.log();
}

console.log('Categories B (storage/variant matching failed), E (genuinely unavailable from');
console.log('Cashify - device too old/obscure to be listed), G (scraper/import infra never');
console.log('ran for this brand), and H (other) cannot be distinguished from static analysis');
console.log('of the two data files alone - resolving them requires either checking Cashify\'s');
console.log('site directly per brand, or reviewing which import scripts (add_*.js/update_*.js)');
console.log('were actually run for each brand folder. Not guessed at here.');
