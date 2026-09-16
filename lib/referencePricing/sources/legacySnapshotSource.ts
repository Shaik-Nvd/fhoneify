import { PriceSource } from '../ingestion';
import { DeviceIdentity } from '../types';
import { findLegacyMatch } from '../matching';

/**
 * A ONE-TIME MIGRATION source, not a live refresh source. It reads the
 * existing static cashify_prices.json-style snapshot files that the app
 * already had before this system existed, using the exact same lookup key
 * algorithm the live pricing path uses (matching.legacyLookupKey), so
 * migrating cannot change which price a device resolves to today.
 *
 * Per Phase 17: this source reports the observation's `observedAt` as the
 * caller-supplied date (the migration script passes the git commit date of
 * the specific JSON file each price table came from) rather than "now" - a
 * value migrated from a 10-week-old snapshot must be recorded as 10 weeks
 * old, not as freshly verified today. See
 * scripts/reference-pricing/migrate-legacy-snapshots.ts and
 * scripts/reference-pricing/import-brand-snapshots.ts, and the
 * PriceSource.fetch() interface doc in ingestion.ts.
 */
export function createLegacySnapshotSource(params: {
  name: string;
  priceTable: Record<string, number>;
  observedAt: string;
}): PriceSource {
  return {
    name: params.name,
    async fetch(device: DeviceIdentity) {
      const match = findLegacyMatch(device, params.priceTable);
      if (!match) return null;
      return {
        price: match.price,
        matchConfidence: 'exact', // legacy key lookup is exact-key-or-nothing by construction
        matchEvidence: `legacy key "${match.matchedKey}" in ${params.name}`,
        observedAt: params.observedAt,
      };
    },
  };
}
