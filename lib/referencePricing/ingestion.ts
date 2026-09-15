import { ReferencePriceRepository } from './store';
import { DeviceIdentity, ReferencePriceRecord, IngestOutcome, MatchConfidence } from './types';
import { validatePriceObservation } from './validation';
import { classifyFreshness } from './freshnessPolicy';
import { deviceKey } from './types';

/**
 * A PriceSource is anything that can produce a price observation for a
 * device. This is the seam that separates "how do we get a price" from
 * "what do we do with a price once we have one" (Phase 1's explicit
 * requirement to decouple pricing calculation from acquisition).
 *
 * Implementations in ./sources/: a legacy one-time migration source (reads
 * the existing static JSON snapshots) and a manual/admin-submitted source.
 * There is deliberately NO live-scraper implementation in this codebase -
 * see PRICING_REFERENCE_DATA_ARCHITECTURE.md "Blocked: live ingestion" for
 * why, and what would be needed to add one safely.
 */
export interface PriceSource {
  name: string;
  fetch(device: DeviceIdentity): Promise<{
    price: number;
    sourceUrl?: string;
    matchConfidence: MatchConfidence;
    matchEvidence?: string;
    /** When this observation actually happened. Omit for a true live
     * source (defaults to "now", correct - the fetch() call IS the
     * observation). A source replaying historical/static data (a
     * one-time migration, a dated snapshot file) MUST set this to the
     * real historical date - never let replayed old data claim to have
     * been "verified now". This is exactly the mistake the freshness
     * system exists to prevent, so it is not an optional nicety. */
    observedAt?: string;
  } | null>;
}

export interface RefreshOptions {
  /** Max concurrent in-flight fetches. Keeps a full-catalog refresh from
   * firing thousands of requests at once, per Phase 9's explicit
   * requirement, even though the current sources are local/instant - this
   * matters the moment a real network-bound source is added. */
  concurrency?: number;
  /** Retries per device on a source error before recording a failure. */
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RefreshOptions> = {
  concurrency: 5,
  maxRetries: 2,
  retryDelayMs: 200,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Refreshes one device against one source, idempotently. Never throws -
 * every outcome (success, validation rejection, source failure) is
 * reported in the returned IngestOutcome and reflected in the stored
 * record's status/failure fields, per Phase 8's "never silently destroy
 * valid data" rule: a failure only ever increments consecutiveFailures and
 * records the error, it never touches currentPrice or lastVerifiedAt.
 */
export async function refreshDevice(
  repo: ReferencePriceRepository,
  device: DeviceIdentity,
  source: PriceSource,
  options: RefreshOptions = {}
): Promise<IngestOutcome> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const key = deviceKey(device);
  const existing = await repo.get(key);
  const now = new Date().toISOString();

  let lastError: string | null = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const observation = await source.fetch(device);

      if (!observation) {
        lastError = `source "${source.name}" returned no match for this device`;
        break; // no point retrying a genuine "not found"
      }

      const validation = validatePriceObservation({
        price: observation.price,
        previousPrice: existing?.currentPrice ?? null,
      });

      if (!validation.valid) {
        return await recordFailure(repo, existing, device, key, now, `rejected: ${validation.reason}`);
      }

      // The observation's own timestamp, not "now" - see the PriceSource
      // interface doc. A historical-replay source (a dated snapshot file)
      // must report its real date; only a true live source's omission
      // defaults to "now", because for a live source the fetch() call
      // genuinely IS the observation.
      const observedAt = observation.observedAt ?? now;
      const observedMs = Date.parse(observedAt);
      if (!Number.isFinite(observedMs)) {
        return await recordFailure(repo, existing, device, key, now, `rejected: unparseable observedAt "${observedAt}"`);
      }
      const existingMs = existing?.lastVerifiedAt ? Date.parse(existing.lastVerifiedAt) : NaN;

      // CORRECTNESS RULE: never let an older observation overwrite a
      // newer one. Without this, re-running two historical-replay sources
      // in a different order (or re-running one twice) could silently
      // regress a device from a more-recently-verified price back to a
      // stale one just because it happened to be processed last - the
      // exact opposite of what this system exists to prevent. The older
      // observation is still real data, so it's recorded in history, just
      // not promoted to the current verified value.
      //
      // Compared as instants, never as strings: Postgres returns
      // "2026-07-08T20:39:20.000Z" for a snapshot stamped
      // "2026-07-09T02:09:20+05:30" - the same moment, but the later string.
      //
      // At the SAME instant (two sources replaying one dated file), an
      // observation without a source URL must not displace one that has
      // it - otherwise re-runs silently strip provenance.
      const isOlder = Number.isFinite(existingMs) && observedMs < existingMs;
      const wouldDropProvenance =
        Number.isFinite(existingMs) && observedMs === existingMs && !!existing?.sourceUrl && !observation.sourceUrl;
      if (existing && (isOlder || wouldDropProvenance)) {
        await repo.appendHistory(key, {
          price: observation.price,
          recordedAt: observedAt,
          source: source.name,
          note: isOlder
            ? `older observation (${observedAt}) than the current verified value (${existing.lastVerifiedAt}) from "${existing.source}" - recorded in history but NOT promoted to current`
            : `same-instant observation without a source URL - current value from "${existing.source}" kept for its provenance`,
        });
        return {
          deviceKey: key,
          accepted: true,
          reason: isOlder
            ? 'observation older than current verified value; kept existing as current'
            : 'same-instant observation lacks a source URL; kept existing as current',
          previousPrice: existing.currentPrice,
          newPrice: existing.currentPrice,
        };
      }

      const record: ReferencePriceRecord = {
        deviceKey: key,
        brand: device.brand,
        model: device.model,
        storage: device.storage,
        source: source.name,
        sourceUrl: observation.sourceUrl,
        currentPrice: observation.price,
        matchConfidence: observation.matchConfidence,
        matchEvidence: observation.matchEvidence,
        status: classifyFreshness({ lastVerifiedAt: observedAt, consecutiveFailures: 0 }),
        lastVerifiedAt: observedAt,
        lastAttemptedAt: now,
        lastFailureAt: null,
        lastFailureError: null,
        consecutiveFailures: 0,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await repo.upsert(record);
      await repo.appendHistory(key, {
        price: observation.price,
        recordedAt: observedAt,
        source: source.name,
        note: validation.flagged ? validation.flagReason : undefined,
      });

      return {
        deviceKey: key,
        accepted: true,
        flagged: validation.flagged,
        reason: validation.flagReason,
        previousPrice: existing?.currentPrice,
        newPrice: observation.price,
      };
    } catch (err: any) {
      lastError = err.message;
      if (attempt < opts.maxRetries) await sleep(opts.retryDelayMs * (attempt + 1));
    }
  }

  return await recordFailure(repo, existing, device, key, now, lastError ?? 'unknown error');
}

async function recordFailure(
  repo: ReferencePriceRepository,
  existing: ReferencePriceRecord | null,
  device: DeviceIdentity,
  key: string,
  now: string,
  error: string
): Promise<IngestOutcome> {
  const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
  const record: ReferencePriceRecord = existing
    ? {
        ...existing,
        // Deliberately NOT touching currentPrice/lastVerifiedAt - the
        // whole point of this function existing separately from the
        // success path is to make that omission structurally obvious
        // rather than a conditional inside one big function.
        lastAttemptedAt: now,
        lastFailureAt: now,
        lastFailureError: error,
        consecutiveFailures,
        status: classifyFreshness({ lastVerifiedAt: existing.lastVerifiedAt, consecutiveFailures }),
        updatedAt: now,
      }
    : {
        deviceKey: key,
        brand: device.brand,
        model: device.model,
        storage: device.storage,
        source: 'unknown',
        currentPrice: 0,
        matchConfidence: 'unmatched',
        status: 'missing',
        lastVerifiedAt: null,
        lastAttemptedAt: now,
        lastFailureAt: now,
        lastFailureError: error,
        consecutiveFailures,
        createdAt: now,
        updatedAt: now,
      };

  await repo.upsert(record);
  return { deviceKey: key, accepted: false, reason: error };
}

/** Refreshes many devices against one source with bounded concurrency. */
export async function refreshCatalog(
  repo: ReferencePriceRepository,
  devices: DeviceIdentity[],
  source: PriceSource,
  options: RefreshOptions = {}
): Promise<IngestOutcome[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: IngestOutcome[] = [];
  let index = 0;

  async function worker() {
    while (index < devices.length) {
      const device = devices[index++];
      results.push(await refreshDevice(repo, device, source, opts));
    }
  }

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, devices.length) }, worker));
  return results;
}
