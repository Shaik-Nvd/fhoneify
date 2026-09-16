/**
 * The device catalog the weekly refresh runs against.
 *
 * Single source of truth: lib/seed_devices.ts, the same catalog the quote
 * flow resolves devices from. Deriving the refresh list from anywhere else
 * would let the two drift, which is how "we refresh 2,200 devices" quietly
 * becomes "we refresh the 400 we remembered to list".
 */
import { SEED_DEVICES } from '../seed_devices';
import { DeviceIdentity, deviceKey } from './types';

export interface CatalogEntry {
  device: DeviceIdentity;
  /** The curated, variant-specific Cashify URL from the seed data, when the
   * catalog has one. This is the strongest identifier available and is always
   * preferred over a generated slug. */
  cashifyLink?: string;
  /** The seed row's own id, for cross-referencing with the quote flow. */
  seedId?: string;
}

export interface CatalogLoad {
  entries: CatalogEntry[];
  /** Rows that could not be turned into a refreshable device, with the
   * reason. Surfaced in the run report rather than silently dropped - a
   * shrinking catalog must be visible, not invisible. */
  skipped: { seedId?: string; reason: string }[];
  /** Duplicate deviceKeys collapsed to one entry. Also reported, since a
   * duplicate usually means a data-entry problem worth knowing about. */
  duplicates: number;
}

export function loadRefreshCatalog(): CatalogLoad {
  const entries: CatalogEntry[] = [];
  const skipped: CatalogLoad['skipped'] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of SEED_DEVICES as any[]) {
    const brand = typeof row?.brand === 'string' ? row.brand.trim() : '';
    const model = typeof row?.model === 'string' ? row.model.trim() : '';
    const storage = typeof row?.storage === 'string' ? row.storage.trim() : '';

    if (!brand || !model || !storage) {
      skipped.push({
        seedId: row?.id,
        reason: `incomplete identity (brand="${brand}", model="${model}", storage="${storage}") - cannot be matched safely`,
      });
      continue;
    }

    const key = deviceKey({ brand, model, storage });
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);

    entries.push({
      device: { brand, model, storage },
      cashifyLink: typeof row?.cashifyLink === 'string' && row.cashifyLink ? row.cashifyLink : undefined,
      seedId: row?.id,
    });
  }

  return { entries, skipped, duplicates };
}

/** Builds the deviceKey -> curated Cashify URL lookup the Cashify source uses
 * to prefer the catalog's own link over a generated slug. */
export function buildCashifyLinkIndex(entries: CatalogEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const entry of entries) {
    if (entry.cashifyLink) index.set(deviceKey(entry.device), entry.cashifyLink);
  }
  return index;
}
