import { getReferencePriceRepository } from '../../../lib/referencePricing/getStore';
import { classifyFreshness } from '../../../lib/referencePricing/freshnessPolicy';
import { refreshDevice } from '../../../lib/referencePricing/ingestion';
import { createManualSubmissionSource } from '../../../lib/referencePricing/sources/manualSource';
import { ReferencePriceRecord, ReferencePriceStatus } from '../../../lib/referencePricing/types';

const store = getReferencePriceRepository();

/** Recomputes each record's status live from its lastVerifiedAt/failure
 * fields rather than trusting the stored status column, since a record
 * migrated or refreshed days ago should read as more stale today than it
 * did then, without needing a background job to "tick over" every record's
 * status on a schedule. Cheap to do on every read - this is a pure
 * function over already-loaded records, no extra I/O. */
function withLiveStatus(r: ReferencePriceRecord): ReferencePriceRecord {
  return { ...r, status: classifyFreshness({ lastVerifiedAt: r.lastVerifiedAt, consecutiveFailures: r.consecutiveFailures }) };
}

export async function getCoverageSummary() {
  const all = (await store.listAll()).map(withLiveStatus);
  const byStatus: Record<ReferencePriceStatus, number> = {
    fresh: 0,
    approaching_stale: 0,
    stale: 0,
    missing: 0,
    refresh_failed: 0,
  };
  for (const r of all) byStatus[r.status]++;

  const total = all.length;
  const withAnyPrice = total - byStatus.missing;

  return {
    totalDevices: total,
    withReferencePrice: withAnyPrice,
    coveragePercent: total > 0 ? Number(((withAnyPrice / total) * 100).toFixed(1)) : 0,
    byStatus,
  };
}

export async function listDevicesByStatus(status: ReferencePriceStatus) {
  const all = (await store.listAll()).map(withLiveStatus);
  return all.filter((r) => r.status === status);
}

export async function getDevice(deviceKeyValue: string) {
  const record = await store.get(deviceKeyValue);
  if (!record) return null;
  const history = await store.getHistory(deviceKeyValue);
  return { record: withLiveStatus(record), history };
}

/** Manual, admin-submitted price verification - the only refresh path
 * actually wired end-to-end in this pass (live scraping is a pending
 * legal/business decision, see PRICING_REFERENCE_DATA_ARCHITECTURE.md). */
export async function submitVerifiedPrice(params: {
  brand: string;
  model: string;
  storage: string;
  price: number;
  sourceUrl?: string;
  submittedByUserId: string;
}) {
  const identity = { brand: params.brand, model: params.model, storage: params.storage };
  const source = createManualSubmissionSource({
    submittedFor: identity,
    price: params.price,
    submittedByUserId: params.submittedByUserId,
    sourceUrl: params.sourceUrl,
  });
  return refreshDevice(store, identity, source);
}
