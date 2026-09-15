/**
 * ONE-TIME MIGRATION (Phase 17): imports the existing static
 * lib/cashify_prices.json data into the new durable reference-price store,
 * using the EXACT same lookup algorithm the live pricing path uses so this
 * migration cannot change which price any device resolves to today.
 *
 * Per the explicit instruction not to pretend legacy data is freshly
 * verified: every migrated record's lastVerifiedAt is backdated to the
 * best available evidence of when that price was actually observed, NOT
 * to "now". Where we have no reliable per-entry evidence (the vast
 * majority of the 1,758-entry file, which has been edited multiple times
 * over months with no per-entry history), we use the whole file's git
 * commit date as a conservative approximation - documented here as
 * exactly that, an approximation that is an UPPER BOUND on freshness (the
 * true age could be older, never younger). This is precisely the ambiguity
 * this system exists to eliminate going forward: every future refresh via
 * lib/referencePricing/ingestion.ts stamps the real observation time, so
 * this coarse backdating only ever applies to this one historical import.
 *
 * Run: npx tsx scripts/reference-pricing/migrate-legacy-snapshots.ts
 */
import { execSync } from 'child_process';
import { SEED_DEVICES } from '../../lib/seed_devices';
import cashifyPricesRaw from '../../lib/cashify_prices.json';
import { getDefaultReferencePriceStore } from '../../lib/referencePricing/store';
import { legacyLookupKey } from '../../lib/referencePricing/matching';
import { deviceKey } from '../../lib/referencePricing/types';
import { classifyFreshness } from '../../lib/referencePricing/freshnessPolicy';
import type { ReferencePriceRecord } from '../../lib/referencePricing/types';

const cashifyPrices = cashifyPricesRaw as Record<string, number>;

function gitFileDate(path: string): string {
  try {
    const out = execSync(`git log -1 --format=%aI -- "${path}"`, { cwd: process.cwd() }).toString().trim();
    return out || new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString(); // unknown -> treat as maximally old, i.e. definitely stale
  }
}

// Per-entry overrides where this investigation established a more precise
// date than the whole-file commit date. Keyed by the same deviceKey the
// store uses, so it's obvious exactly which devices this applies to.
const KNOWN_MORE_PRECISE_DATES: Record<string, string> = {
  [deviceKey({ brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/512 GB' })]: gitFileDate('oppo/oppo_prices.json'),
  [deviceKey({ brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/256 GB' })]: gitFileDate('oppo/oppo_prices.json'),
  [deviceKey({ brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/512 GB' })]: gitFileDate('update_oneplus.js'),
  [deviceKey({ brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/256 GB' })]: gitFileDate('update_oneplus.js'),
};

async function main() {
  const store = getDefaultReferencePriceStore();
  const fileDate = gitFileDate('lib/cashify_prices.json');
  console.log(`lib/cashify_prices.json last committed: ${fileDate} (used as the conservative upper-bound freshness date for entries with no more specific evidence)\n`);

  let withReference = 0;
  let withoutReference = 0;
  let skippedNoBasePrice = 0;

  for (const device of SEED_DEVICES as any[]) {
    if (!device.brand || !device.model || !device.storage) continue;
    if (!device.basePrice) {
      skippedNoBasePrice++;
      continue;
    }

    const identity = { brand: device.brand, model: device.model, storage: device.storage };
    const key = deviceKey(identity);
    const legacyKey = legacyLookupKey(device.model, device.storage);
    const cashifyVal = cashifyPrices[legacyKey];

    const asOf = KNOWN_MORE_PRECISE_DATES[key] ?? fileDate;
    const now = new Date().toISOString();

    if (cashifyVal !== undefined) {
      withReference++;
      const record: ReferencePriceRecord = {
        deviceKey: key,
        brand: device.brand,
        model: device.model,
        storage: device.storage,
        source: 'legacy_migration:lib/cashify_prices.json',
        currentPrice: cashifyVal,
        matchConfidence: 'exact',
        matchEvidence: `legacy key "${legacyKey}"`,
        status: classifyFreshness({ lastVerifiedAt: asOf, consecutiveFailures: 0 }),
        lastVerifiedAt: asOf,
        lastAttemptedAt: asOf,
        lastFailureAt: null,
        lastFailureError: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now,
      };
      await store.upsert(record);
      await store.appendHistory(key, {
        price: cashifyVal,
        recordedAt: asOf,
        source: 'legacy_migration',
        note: `imported from lib/cashify_prices.json during Phase 17 migration; backdated to ${key in KNOWN_MORE_PRECISE_DATES ? 'a specific known source date' : 'the whole file\'s last commit date (approximation)'}`,
      });
    } else {
      withoutReference++;
      // No cashify_prices.json entry at all - record as MISSING rather
      // than silently skipping it, so the coverage report can see it.
      const record: ReferencePriceRecord = {
        deviceKey: key,
        brand: device.brand,
        model: device.model,
        storage: device.storage,
        source: 'none',
        currentPrice: 0,
        matchConfidence: 'unmatched',
        status: 'missing',
        lastVerifiedAt: null,
        lastAttemptedAt: null,
        lastFailureAt: null,
        lastFailureError: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now,
      };
      await store.upsert(record);
    }
  }

  console.log(`Migration complete.`);
  console.log(`  Devices with a cashify_prices.json reference: ${withReference}`);
  console.log(`  Devices with NO reference (marked 'missing'):  ${withoutReference}`);
  console.log(`  Devices skipped (no basePrice at all):         ${skippedNoBasePrice}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
