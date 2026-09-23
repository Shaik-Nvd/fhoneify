import {
  applyCompetitorUplift,
  calculateFhoneifyPrice,
  COMMON_BONUSES,
  computeFhoneifyGetUpto,
  CashifyGetUptoReference,
  DiagnosticsType,
  PricingResult,
} from '../pricingCalculator';
import materializedSnapshot from '../cashify_prices.json';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import type { ReferencePriceRecord, ReferencePriceStatus } from '../referencePricing/types';
import type { CatalogDevice } from './catalog';
import { PERFECT_CONDITION_DIAGNOSTICS } from './perfectCondition';

/**
 * The one place a quote's reference price is resolved and the pricing
 * methodology is invoked. Used on the server (POST /api/quote/price) and by
 * tests/tools; the quote page never runs it - it shows only the API's
 * figures, so there is exactly one place a customer's price comes from.
 *
 *   Get Upto:    ReferencePrice.currentPrice (Cashify's live public Get Upto)
 *                -> computeFhoneifyGetUpto (the existing uplift, nothing else)
 *   Final offer: ReferencePrice.currentPrice -> brand condition rules
 *                -> Cashify condition equivalent -> the same uplift
 *
 * Browser-safe - no Node-only imports belong here (see quoteToken.ts /
 * pricingService.ts).
 */

/** Recorded on every signed quote and lead so a price can be traced to the
 * code that produced it. Bump when base resolution, guardrails, or the
 * methodology change. */
export const PRICING_ENGINE_VERSION = 'fhoneify-pricing/2026-09-23-get-upto-reference';

export type BaseSource = 'reference_repository' | 'materialized_snapshot' | 'catalog_base_price';

/** 'unknown' = the price came from the materialized snapshot, which carries
 * no per-device freshness of its own. */
export type QuoteReferenceStatus = ReferencePriceStatus | 'unknown';

export interface ResolvedReference {
  /** Cashify's live public Get Upto for the variant. Not a launch price and
   * not a pre-depreciation base: never depreciate it to show Get Upto. */
  cashifyGetUptoReference: CashifyGetUptoReference;
  source: BaseSource;
  referenceStatus: QuoteReferenceStatus;
  referenceSource: string | null;
  referenceLastVerifiedAt: string | null;
}

/** The lookup-key algorithm the quote page has always used against
 * lib/cashify_prices.json, including its iPhone Air alias. */
export function materializedSnapshotKey(model: string, storage: string): string {
  let key = `${model}-${storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (key.includes('iphone-air')) key = key.replace('iphone-air', 'iphone-17-air');
  return key;
}

const isPositivePrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Resolution order, most to least authoritative:
 *   1. the ReferencePrice repository record (server only)
 *   2. lib/cashify_prices.json, exported from that same table
 *      (npm run reference-prices:export) for when the database is unreachable
 *   3. the catalog's own basePrice
 * The resolved figure is used as-is. Returns null when none exist - callers
 * must not invent a price.
 */
export function resolveReference(params: {
  device: Pick<CatalogDevice, 'model' | 'storage' | 'basePrice'>;
  repositoryRecord?: ReferencePriceRecord | null;
  snapshot?: Record<string, number>;
  now?: Date;
}): ResolvedReference | null {
  const { device, repositoryRecord } = params;

  if (
    repositoryRecord &&
    repositoryRecord.status !== 'missing' &&
    repositoryRecord.lastVerifiedAt &&
    isPositivePrice(repositoryRecord.currentPrice)
  ) {
    return {
      cashifyGetUptoReference: repositoryRecord.currentPrice,
      source: 'reference_repository',
      // Always re-derived at read time; the stored status can be stale.
      referenceStatus: classifyFreshness({
        lastVerifiedAt: repositoryRecord.lastVerifiedAt,
        consecutiveFailures: repositoryRecord.consecutiveFailures,
        now: params.now,
      }),
      referenceSource: repositoryRecord.source,
      referenceLastVerifiedAt: repositoryRecord.lastVerifiedAt,
    };
  }

  const snapshot = params.snapshot ?? (materializedSnapshot as Record<string, number>);
  const snapshotPrice = snapshot[materializedSnapshotKey(device.model, device.storage)];
  if (isPositivePrice(snapshotPrice)) {
    return {
      cashifyGetUptoReference: snapshotPrice,
      source: 'materialized_snapshot',
      referenceStatus: 'unknown',
      referenceSource: null,
      referenceLastVerifiedAt: null,
    };
  }

  if (isPositivePrice(device.basePrice)) {
    return {
      cashifyGetUptoReference: device.basePrice,
      source: 'catalog_base_price',
      referenceStatus: 'missing',
      referenceSource: null,
      referenceLastVerifiedAt: null,
    };
  }

  return null;
}

export class PricingInvariantError extends Error {
  constructor(message: string, readonly details: Record<string, unknown>) {
    super(message);
    this.name = 'PricingInvariantError';
  }
}

/** Highest final offer the methodology can legitimately produce for a
 * reference: the reference plus every accessory bonus, or the fixed ₹1,200
 * non-working-device price (which can exceed a very cheap reference), then
 * the capped uplift. */
export function maxPlausiblePrice(reference: CashifyGetUptoReference): number {
  const maxAccessoryBonus = COMMON_BONUSES.box + COMMON_BONUSES.chargerOnlyBonus;
  const NON_WORKING_DEVICE_PRICE = 1200;
  return Math.max(
    applyCompetitorUplift(reference, Math.round(reference + maxAccessoryBonus)),
    applyCompetitorUplift(reference, NON_WORKING_DEVICE_PRICE)
  );
}

/** Final offer for the customer's answers. Runs the unchanged methodology,
 * then refuses to return a price that is non-finite, below the floor, below
 * the Cashify condition equivalent, or above what the methodology can
 * produce. A violation means a bug or corrupt input - never something to
 * show a customer or persist on a lead. */
export function priceDevice(
  brand: string,
  model: string,
  reference: CashifyGetUptoReference,
  diagnostics: DiagnosticsType
): PricingResult {
  if (!isPositivePrice(reference)) {
    throw new PricingInvariantError('Cashify Get Upto reference must be a positive finite number', { brand, model, reference });
  }

  const result = calculateFhoneifyPrice(brand, model, reference, diagnostics);
  const { cashifyConditionEquivalent, fhoneifyPrice } = result;
  const ceiling = maxPlausiblePrice(reference);
  const details = { brand, model, reference, cashifyConditionEquivalent, fhoneifyPrice, ceiling };

  if (!Number.isInteger(fhoneifyPrice) || !Number.isInteger(cashifyConditionEquivalent)) {
    throw new PricingInvariantError('engine produced a non-integer price', details);
  }
  if (fhoneifyPrice < COMMON_BONUSES.floorPrice) {
    throw new PricingInvariantError('price is below the floor price', details);
  }
  if (fhoneifyPrice < cashifyConditionEquivalent) {
    throw new PricingInvariantError('uplifted price is below the Cashify condition equivalent', details);
  }
  if (fhoneifyPrice > ceiling) {
    throw new PricingInvariantError('price exceeds the maximum the methodology can produce', details);
  }

  return result;
}

export { PERFECT_CONDITION_DIAGNOSTICS, computeFhoneifyGetUpto };
