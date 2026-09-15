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
 * the existing static JSON snapshots), a manual/admin-submitted source, and
 * the live Cashify source (cashifySource.ts) that the scheduled 7-day refresh
 * uses - see PRICING_REFERENCE_DATA_ARCHITECTURE.md section 9a.
 */
export interface PriceObservation {
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
}

/**
 * An explicit, self-describing refusal from a source: "I reached the
 * reference, and what I found is not usable for this device."
 *
 * This exists so a source can distinguish a REASONED rejection (the page
 * turned out to be a different model, the variant didn't match, the price
 * wasn't in rupees) from a bare `null`. Returning null still works and still
 * means "no match" - this just carries the reason through to the refresh
 * report and the stored failure message instead of collapsing every refusal
 * into one generic string. A rejection is never retried by default: the
 * source already looked and already decided, so retrying would only repeat
 * the same answer more slowly.
 */
export interface PriceRejection {
  rejected: true;
  reason: string;
  /** Set true only for a refusal that a later attempt could plausibly
   * resolve (e.g. the page rendered no price yet). Defaults to false. */
  retryable?: boolean;
}

export function isRejection(v: PriceObservation | PriceRejection | null): v is PriceRejection {
  return v !== null && (v as PriceRejection).rejected === true;
}

export interface PriceSource {
  name: string;
  fetch(device: DeviceIdentity): Promise<PriceObservation | PriceRejection | null>;
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
  /** Circuit breaker for catalog runs: stop after this many consecutive
   * source transport failures (see DEFAULT_MAX_CONSECUTIVE_SOURCE_FAILURES).
   * 0 disables. Ignored by single-device refreshDevice(). */
  maxConsecutiveSourceFailures?: number;
}

const DEFAULT_OPTIONS: Required<RefreshOptions> = {
  concurrency: 5,
  maxRetries: 2,
  retryDelayMs: 200,
  maxConsecutiveSourceFailures: 0, // resolved per catalog run from DEFAULT_MAX_CONSECUTIVE_SOURCE_FAILURES
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

      if (isRejection(observation)) {
        // The source looked and deliberately refused (wrong model, wrong
        // variant, unparseable/foreign-currency price). Carry its reason
        // through verbatim so the refresh report and the stored
        // lastFailureError say WHY, not just "no match".
        lastError = `rejected by source "${source.name}": ${observation.reason}`;
        if (observation.retryable && attempt < opts.maxRetries) {
          await sleep(opts.retryDelayMs * (attempt + 1));
          continue;
        }
        break;
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
  const preserved = !!existing && existing.currentPrice > 0 && !!existing.lastVerifiedAt;
  return {
    deviceKey: key,
    accepted: false,
    reason: error,
    preservedPreviousPrice: preserved,
    previousPrice: preserved ? existing!.currentPrice : undefined,
    // Deliberately reporting the PREVIOUS price as the current one on a
    // failure: the stored value genuinely did not change. Reporting
    // newPrice: 0 here would make a preserved price look like a wipe in the
    // run report, which is the exact confusion Phase 6 is about.
    newPrice: preserved ? existing!.currentPrice : undefined,
  };
}

export interface CatalogRefreshControls {
  /** Cooperative stop signal. Checked before starting each device, never
   * mid-device, so a stop can never leave a device half-written. Devices not
   * reached are simply not attempted - and therefore keep their existing
   * price untouched, which is the safe outcome. */
  shouldStop?: () => boolean;
  onProgress?: (done: number, total: number, outcome: IngestOutcome) => void;
}

export interface CatalogRefreshResult {
  outcomes: IngestOutcome[];
  /** Devices never attempted because shouldStop() fired or the run aborted. */
  notAttempted: DeviceIdentity[];
  /** Set when the run stopped early because the repository itself kept
   * failing (e.g. the database went away). */
  abortedReason?: string;
}

/** After this many CONSECUTIVE infrastructure errors the run stops: the
 * database is down, and hammering it for the remaining ~2,000 devices only
 * turns one clear failure into thousands of identical ones. */
export const MAX_CONSECUTIVE_INFRASTRUCTURE_ERRORS = 10;

/**
 * After this many CONSECUTIVE source transport failures the run stops. A
 * transport failure is a device the source could not load at all even after
 * retries (timeout, block, challenge page, dead session) - NOT a rejection
 * (page loaded, wrong device/variant/price) and NOT "device not listed".
 *
 * Individual failures are normal on a 2,200-page run and never stop it. A long
 * unbroken streak is not individual: it means Cashify is blocking the scraper
 * or the session has expired, and carrying on would only mark hundreds of
 * devices refresh_failed and burn hours for no data. Prices are preserved
 * either way; this just stops early and says why.
 */
export const DEFAULT_MAX_CONSECUTIVE_SOURCE_FAILURES = Number(
  process.env.REFRESH_MAX_CONSECUTIVE_SOURCE_FAILURES ?? 25
);

/** A failed outcome that means "could not reach/load the source", as opposed
 * to a reasoned rejection or a genuine not-found. */
export function isSourceTransportFailure(outcome: IngestOutcome): boolean {
  if (outcome.accepted || outcome.infrastructureError) return false;
  const reason = outcome.reason ?? '';
  if (reason.startsWith('rejected')) return false;
  if (reason.includes('returned no match')) return false;
  return true;
}

/** Refreshes many devices against one source with bounded concurrency. */
export async function refreshCatalog(
  repo: ReferencePriceRepository,
  devices: DeviceIdentity[],
  source: PriceSource,
  options: RefreshOptions & CatalogRefreshControls = {}
): Promise<IngestOutcome[]> {
  const result = await refreshCatalogWithControls(repo, devices, source, options);
  return result.outcomes;
}

/** As refreshCatalog, but also reports which devices were never attempted
 * (needed by the scheduled job so a time-capped run reports honestly rather
 * than counting unvisited devices as failures). */
export async function refreshCatalogWithControls(
  repo: ReferencePriceRepository,
  devices: DeviceIdentity[],
  source: PriceSource,
  options: RefreshOptions & CatalogRefreshControls = {}
): Promise<CatalogRefreshResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: IngestOutcome[] = [];
  let index = 0;
  let stopped = false;
  let consecutiveInfraErrors = 0;
  let consecutiveSourceFailures = 0;
  let lastSourceFailure = '';
  const maxSourceFailures = options.maxConsecutiveSourceFailures ?? DEFAULT_MAX_CONSECUTIVE_SOURCE_FAILURES;
  let abortedReason: string | undefined;

  async function worker() {
    while (index < devices.length) {
      if (abortedReason || options.shouldStop?.()) {
        stopped = true;
        return;
      }
      const device = devices[index++];

      let outcome: IngestOutcome;
      try {
        outcome = await refreshDevice(repo, device, source, opts);
        consecutiveInfraErrors = 0;
      } catch (err: any) {
        // refreshDevice never throws for a SOURCE problem - those become
        // outcomes. Reaching here means the repository itself threw (the
        // database is unreachable or rejected a write).
        //
        // This MUST be caught per device. Letting it reject Promise.all would
        // return control to the caller - which then releases the lock and
        // reports - while the other workers were still running and writing.
        // That is a lock-free concurrent writer, the one thing the lock exists
        // to prevent.
        consecutiveInfraErrors++;
        outcome = {
          deviceKey: deviceKey(device),
          accepted: false,
          infrastructureError: true,
          reason: `infrastructure error (repository unavailable): ${err?.message ?? err}`,
        };
        if (consecutiveInfraErrors >= MAX_CONSECUTIVE_INFRASTRUCTURE_ERRORS && !abortedReason) {
          abortedReason =
            `stopped after ${consecutiveInfraErrors} consecutive repository errors - ` +
            `the reference-price store appears to be unavailable (last: ${err?.message ?? err})`;
        }
      }

      if (isSourceTransportFailure(outcome)) {
        consecutiveSourceFailures++;
        lastSourceFailure = outcome.reason ?? '';
        if (maxSourceFailures > 0 && consecutiveSourceFailures >= maxSourceFailures && !abortedReason) {
          abortedReason =
            `stopped after ${consecutiveSourceFailures} consecutive source failures - Cashify appears to be ` +
            `blocking the scraper or the session has expired (last: ${lastSourceFailure.split('\n')[0].slice(0, 200)})`;
        }
      } else if (!outcome.infrastructureError) {
        consecutiveSourceFailures = 0;
      }

      results.push(outcome);
      options.onProgress?.(results.length, devices.length, outcome);
    }
  }

  // Every worker settles before this returns, so no write can outlive it.
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, devices.length) }, worker));

  const notAttempted = stopped ? devices.slice(Math.min(index, devices.length)) : [];
  return { outcomes: results, notAttempted, abortedReason };
}
