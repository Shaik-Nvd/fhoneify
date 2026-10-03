/**
 * Lists catalog rows whose storage string omits RAM although the row has a
 * RAM value, and whether a Cashify reference price resolves for them today
 * (under the current key) or would resolve once RAM is included.
 *
 *   npx tsx scripts/pricing/list-storage-only-variants.ts
 */
import { SEED_DEVICES } from '../../lib/seed_devices';
import snapshot from '../../lib/cashify_prices.json';
import { materializedSnapshotKey } from '../../lib/pricing/engine';

const snap = snapshot as Record<string, number>;
for (const d of SEED_DEVICES as { brand: string; model: string; storage: string; ram?: string }[]) {
  if (!d.ram || d.storage.includes('/') || d.brand === 'Apple') continue;
  const current = snap[materializedSnapshotKey(d.model, d.storage)];
  const withRam = snap[materializedSnapshotKey(d.model, `${d.ram}/${d.storage}`)];
  console.log([d.brand, d.model, d.storage, d.ram, `now=${current ?? '-'}`, `withRam=${withRam ?? '-'}`].join(' | '));
}
