/**
 * Regenerates the legacy cashify_prices.json files FROM the authoritative
 * reference-price store, and writes a companion freshness-metadata file.
 *
 * IMPORTANT DESIGN CHOICE, made explicitly to avoid an unapproved business-
 * logic change: this script does NOT filter out stale/missing records from
 * the exported price file. Doing so would silently change which price
 * many devices resolve to today (some would fall back to a different
 * basePrice instead) - that is exactly the Phase 11 "what happens when
 * reference data is stale/missing" business decision this task explicitly
 * said not to decide unilaterally. So today's export is a byte-for-byte
 * content match with a store built purely from migrated legacy data (see
 * the verification test in scripts/test/pricing.reference-data.test.ts).
 *
 * What DOES change: a new companion file, lib/cashify_prices.meta.json,
 * maps every key to its freshness status/lastVerifiedAt/matchConfidence.
 * Nothing in the live pricing path reads this file yet - it exists so a
 * future, explicitly-approved policy (e.g. "show a staleness badge", or
 * "prefer basePrice over a >90-day-stale cashify price") has the data it
 * needs without requiring another migration.
 *
 * Run: npx tsx scripts/reference-pricing/export-cashify-prices.ts
 */
import fs from 'fs';
import path from 'path';
import { getReferencePriceRepository } from '../../lib/referencePricing/getStore';

async function main() {
  const store = getReferencePriceRepository();
  const records = await store.listAll();

  const prices: Record<string, number> = {};
  const meta: Record<string, { status: string; lastVerifiedAt: string | null; matchConfidence: string; source: string }> = {};

  for (const r of records) {
    if (r.status === 'missing') continue; // nothing to export - no price was ever found
    // legacyLookupKey-shaped key, reconstructed from the record's own
    // identity fields so this doesn't depend on re-deriving it elsewhere.
    const legacyKey = `${r.model}-${r.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    prices[legacyKey] = r.currentPrice;
    meta[legacyKey] = {
      status: r.status,
      lastVerifiedAt: r.lastVerifiedAt,
      matchConfidence: r.matchConfidence,
      source: r.source,
    };
  }

  const libPath = path.join(process.cwd(), 'lib', 'cashify_prices.generated.json');
  const metaPath = path.join(process.cwd(), 'lib', 'cashify_prices.meta.json');

  fs.writeFileSync(libPath, JSON.stringify(prices, null, 2), 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  console.log(`Exported ${Object.keys(prices).length} priced entries to ${libPath}`);
  console.log(`Exported ${Object.keys(meta).length} freshness records to ${metaPath}`);
  console.log(`\nNOTE: this writes to cashify_prices.GENERATED.json, not the live`);
  console.log(`lib/cashify_prices.json, so the live pricing path is not changed by`);
  console.log(`running this script. Switching the live file to be generated output`);
  console.log(`is a deliberate follow-up step, not done automatically here, so it can`);
  console.log(`be reviewed as its own diff first.`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
