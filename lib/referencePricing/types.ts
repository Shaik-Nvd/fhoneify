/**
 * Core types for the reference-pricing lifecycle.
 *
 * See PRICING_REFERENCE_DATA_ARCHITECTURE.md for the full design rationale.
 * These types describe the SAME shape as the Prisma ReferencePrice /
 * ReferencePriceHistory models (prisma/schema.prisma) - the store
 * implementation in store.ts is swappable behind ReferencePriceRepository
 * without changing anything that consumes this module.
 */

export type ReferencePriceStatus =
  | 'fresh'
  | 'approaching_stale'
  | 'stale'
  | 'missing'
  | 'refresh_failed';

export type MatchConfidence = 'exact' | 'high' | 'ambiguous' | 'unmatched';

export interface DeviceIdentity {
  brand: string;
  model: string;
  storage: string;
}

/** Stable, deterministic identifier for a brand+model+storage variant. Not
 * the same as seed_devices.ts's random per-row "id" - this is derived
 * purely from the identity fields so it survives seed-data reshuffles and
 * lets us reference "the same device" across separate imports/refreshes. */
export function deviceKey({ brand, model, storage }: DeviceIdentity): string {
  return `${brand}|${model}|${storage}`.toLowerCase().trim();
}

export interface ReferencePriceRecord {
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  source: string; // e.g. "cashify"
  sourceUrl?: string;
  currentPrice: number;
  matchConfidence: MatchConfidence;
  matchEvidence?: string;
  status: ReferencePriceStatus;
  lastVerifiedAt: string | null; // ISO timestamp of last SUCCESSFUL refresh
  lastAttemptedAt: string | null; // ISO timestamp of last attempt (success or fail)
  lastFailureAt: string | null;
  lastFailureError: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferencePriceHistoryEntry {
  price: number;
  recordedAt: string;
  source: string;
  note?: string;
}

/** Result of attempting to write a new observed price for a device. Never
 * throws on a "bad" observation - callers decide how to react to the
 * outcome, per the "never silently destroy valid data" rule. */
export interface IngestOutcome {
  deviceKey: string;
  accepted: boolean;
  reason?: string; // set when accepted=false, or when accepted with a flag
  flagged?: boolean; // accepted but marked for human review (large price swing)
  previousPrice?: number;
  newPrice?: number;
  /** True when a usable previous price existed and was PRESERVED through a
   * failed/rejected attempt. This is what separates "we failed but the
   * device still has yesterday's good price" (Phase 6) from "this device has
   * never had a price at all" (missing) in the refresh report. */
  preservedPreviousPrice?: boolean;
  /** True when the attempt died on OUR infrastructure (the database write or
   * read threw), rather than on the source. Nothing about the stored record is
   * known to have changed, so this is always reported as a failure - never as
   * "missing", which would wrongly claim the device has no price. */
  infrastructureError?: boolean;
}
