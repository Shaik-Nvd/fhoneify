import { ReferencePriceStatus } from './types';

/**
 * Freshness thresholds. Configurable via env, with defaults chosen
 * specifically because of what this investigation found: the OPPO Find X9s
 * / OnePlus 15R data was 10-12 weeks old and had already drifted ~3x from
 * Cashify's live price. Brand-new flagship launches depreciate fastest in
 * their first weeks, so a single global TTL has to be tight enough to catch
 * that case rather than tuned to the slower depreciation of older,
 * established devices. If the catalog later wants per-device-age TTLs
 * (e.g. laxer thresholds for devices >1 year old, which move more slowly),
 * that's a real refinement worth considering - not implemented here since
 * it's a business-tuning decision, not a correctness bug fix.
 */
export const FRESHNESS_POLICY = {
  /** Below this age, a successfully-verified price is FRESH. */
  warningAgeDays: Number(process.env.REFERENCE_PRICE_WARNING_AGE_DAYS ?? 14),
  /** At or beyond this age, a successfully-verified price is STALE. Between
   * warningAgeDays and maxAgeDays it is APPROACHING_STALE. */
  maxAgeDays: Number(process.env.REFERENCE_PRICE_MAX_AGE_DAYS ?? 30),
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Classify a record's current status from its lastVerifiedAt timestamp and
 * failure history. This is pure/deterministic - given the same inputs and
 * "now", it always returns the same status, so it's trivially unit-testable
 * and safe to call as often as needed (e.g. on every read) rather than only
 * when writing.
 */
export function classifyFreshness(params: {
  lastVerifiedAt: string | null;
  consecutiveFailures: number;
  now?: Date;
}): ReferencePriceStatus {
  const now = params.now ?? new Date();

  if (!params.lastVerifiedAt) {
    return 'missing';
  }

  const ageMs = now.getTime() - new Date(params.lastVerifiedAt).getTime();
  const ageDays = ageMs / DAY_MS;

  // A record can be both "has a verified value" AND "currently failing to
  // refresh" at the same time - that's exactly the case Phase 8 describes
  // (yesterday's ₹30,000 must survive today's failed scrape). We surface
  // refresh_failed as long as failures are ongoing, even if the underlying
  // age would otherwise still read as fresh, because an operator needs to
  // know the pipeline is broken regardless of how old the data happens to
  // be right now.
  if (params.consecutiveFailures > 0) {
    return 'refresh_failed';
  }

  if (ageDays >= FRESHNESS_POLICY.maxAgeDays) return 'stale';
  if (ageDays >= FRESHNESS_POLICY.warningAgeDays) return 'approaching_stale';
  return 'fresh';
}

/** Whether a status is safe to feed into a real pricing calculation
 * unconditionally today, vs. one that should be surfaced/flagged. Kept as
 * a single named predicate rather than inlined comparisons scattered
 * through call sites, so the policy question ("do we still use stale
 * data?") has exactly one place to look and one place to change. */
export function isUsableForPricing(status: ReferencePriceStatus): boolean {
  return status === 'fresh' || status === 'approaching_stale' || status === 'refresh_failed';
  // 'refresh_failed' is included deliberately: per Phase 8, a failed
  // refresh must preserve and keep using the last verified value, not
  // block the quote flow. 'stale' and 'missing' are excluded - whether to
  // still use a stale/missing price and how to represent that to the user
  // is the explicit business decision flagged in
  // PRICING_REFERENCE_DATA_ARCHITECTURE.md Phase 11, not decided here.
}
