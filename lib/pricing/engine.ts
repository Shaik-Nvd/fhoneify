import {
  applyCompetitorUplift,
  calculateFhoneifyPrice,
  COMMON_BONUSES,
  DiagnosticsType,
  PricingResult,
} from '../pricingCalculator';
import materializedSnapshot from '../cashify_prices.json';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import type { ReferencePriceRecord, ReferencePriceStatus } from '../referencePricing/types';
import type { CatalogDevice } from './catalog';
import { PERFECT_CONDITION_DIAGNOSTICS } from './perfectCondition';

/**
 * The one place a quote's base market price is resolved and the pricing
 * methodology is invoked. Used on the server (POST /api/quote/price) and by
 * tests/tools; the quote page never runs it - it shows only the API's signed
 * price, so there is exactly one place a customer's price comes from.
 *
 * This module does not change the methodology: every price still comes from
 * calculateFhoneifyPrice() in lib/pricingCalculator.ts, untouched. It adds
 * base-price resolution and output guardrails around it. Browser-safe - no
 * Node-only imports belong here (see quoteToken.ts / pricingService.ts).
 */

/** Recorded on every signed quote and lead so a price can be traced to the
 * code that produced it. Bump when base resolution, guardrails, or the
 * methodology change. */
export const PRICING_ENGINE_VERSION = 'fhoneify-pricing/2026-09-21-age-depreciation';

export type BaseSource = 'reference_repository' | 'materialized_snapshot' | 'catalog_base_price';

/** 'unknown' = the price came from the materialized snapshot, which carries
 * no per-device freshness of its own. */
export type QuoteReferenceStatus = ReferencePriceStatus | 'unknown';

export interface BaseMarketPrice {
  price: number;
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
 *   1. the reference-price repository record (server only)
 *   2. the materialized snapshot exported from that repository
 *   3. the catalog's own basePrice (what the app has always fallen back to)
 * Returns null when none exist - callers must not invent a price.
 */
export function resolveBaseMarketPrice(params: {
  device: Pick<CatalogDevice, 'model' | 'storage' | 'basePrice'>;
  repositoryRecord?: ReferencePriceRecord | null;
  snapshot?: Record<string, number>;
  now?: Date;
}): BaseMarketPrice | null {
  const { device, repositoryRecord } = params;

  if (
    repositoryRecord &&
    repositoryRecord.status !== 'missing' &&
    repositoryRecord.lastVerifiedAt &&
    isPositivePrice(repositoryRecord.currentPrice)
  ) {
    return {
      price: repositoryRecord.currentPrice,
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
      price: snapshotPrice,
      source: 'materialized_snapshot',
      referenceStatus: 'unknown',
      referenceSource: null,
      referenceLastVerifiedAt: null,
    };
  }

  if (isPositivePrice(device.basePrice)) {
    return {
      price: device.basePrice,
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

/** Highest price the methodology can legitimately produce for a base price:
 * the base plus every accessory bonus, or the fixed ₹1,200 non-working-device
 * price (which can exceed a very cheap base), then the capped uplift. */
export function maxPlausiblePrice(basePrice: number): number {
  const maxAccessoryBonus = COMMON_BONUSES.box + COMMON_BONUSES.chargerOnlyBonus;
  const NON_WORKING_DEVICE_PRICE = 1200;
  return Math.max(
    applyCompetitorUplift(basePrice, Math.round(basePrice + maxAccessoryBonus)),
    applyCompetitorUplift(basePrice, NON_WORKING_DEVICE_PRICE)
  );
}

/** Runs the unchanged methodology, then refuses to return a price that is
 * non-finite, below the floor, below the depreciated price, or above what
 * the methodology can produce. A violation means a bug or corrupt input -
 * never something to show a customer or persist on a lead. */
export function priceDevice(
  brand: string,
  model: string,
  basePrice: number,
  diagnostics: DiagnosticsType
): PricingResult {
  if (!isPositivePrice(basePrice)) {
    throw new PricingInvariantError('base market price must be a positive finite number', { brand, model, basePrice });
  }

  const result = calculateFhoneifyPrice(brand, model, basePrice, diagnostics);
  const { cashifyBasePrice, fhoneifyPrice } = result;
  const ceiling = maxPlausiblePrice(basePrice);
  const details = { brand, model, basePrice, cashifyBasePrice, fhoneifyPrice, ceiling };

  if (!Number.isInteger(fhoneifyPrice) || !Number.isInteger(cashifyBasePrice)) {
    throw new PricingInvariantError('engine produced a non-integer price', details);
  }
  if (fhoneifyPrice < COMMON_BONUSES.floorPrice) {
    throw new PricingInvariantError('price is below the floor price', details);
  }
  if (fhoneifyPrice < cashifyBasePrice) {
    throw new PricingInvariantError('uplifted price is below the depreciated price', details);
  }
  if (fhoneifyPrice > ceiling) {
    throw new PricingInvariantError('price exceeds the maximum the methodology can produce', details);
  }

  return result;
}

export { PERFECT_CONDITION_DIAGNOSTICS };

/** "Get upto" price: the best final price the device can reach. Uses the
 * engine's own capped uplift so it can never advertise more than a
 * perfect-condition final quote actually pays. */
export function computeStartingPrice(brand: string, model: string, basePrice: number): number {
  return priceDevice(brand, model, basePrice, PERFECT_CONDITION_DIAGNOSTICS).fhoneifyPrice;
}
