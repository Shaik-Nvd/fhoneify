import {
  calculateFhoneifyPrice,
  COMMON_BONUSES,
  computeFhoneifyGetUpto,
  CashifyGetUptoReference,
  DiagnosticsType,
  FhoneifyGetUpto,
  PricingResult,
} from '../pricingCalculator';
import materializedSnapshot from '../cashify_prices.json';
import materializedSnapshotMeta from '../cashify_prices.meta.json';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import type { ReferencePriceRecord, ReferencePriceStatus } from '../referencePricing/types';
import type { CatalogDevice } from './catalog';
import { PERFECT_CONDITION_DIAGNOSTICS } from './perfectCondition';

/**
 * The one place a quote's reference price is resolved and the pricing
 * methodology is invoked. Used on the server (POST /api/quote/price) and by
 * tests/tools; the quote page never runs it - it shows only the API's signed
 * price, so there is exactly one place a customer's price comes from.
 *
 *   Get Upto:    Cashify Get Upto -> applyCompetitorUplift -> Fhoneify Get Upto
 *   Final offer: Cashify Get Upto -> brand condition rules (calibrated against
 *                Cashify's questionnaire) -> Cashify condition equivalent
 *                (never above the Get Upto) -> applyCompetitorUplift
 *                -> Fhoneify final offer
 *
 * Browser-safe - no Node-only imports belong here (see quoteToken.ts /
 * pricingService.ts).
 */

/** Recorded on every signed quote and lead so a price can be traced to the
 * code that produced it. Bump when base resolution, guardrails, or the
 * methodology change. */
export const PRICING_ENGINE_VERSION = 'fhoneify-pricing/2026-09-23-get-upto-reference';

export type BaseSource = 'reference_repository' | 'materialized_snapshot' | 'catalog_base_price';

/**
 * What a stored price means.
 * - cashify_get_upto: Cashify's live public "Get Upto" (scraped, source
 *   "cashify"), or the catalog's own basePrice, which carries the same values.
 * - legacy_pre_inflated_base: a pre-refresh lib/cashify_prices.json value.
 *   Those were deliberately inflated to Get Upto / model multiplier (commit
 *   cbc344a) so the old engine's depreciation landed back on Cashify's
 *   figure. They must be converted before use, never treated as a Get Upto.
 */
export type ReferenceSemantics = 'cashify_get_upto' | 'legacy_pre_inflated_base';

/** 'unknown' = the price came from the materialized snapshot, which carries
 * no per-device freshness of its own. */
export type QuoteReferenceStatus = ReferencePriceStatus | 'unknown';

export interface ResolvedReference {
  /** The only price the engine consumes. */
  cashifyGetUptoReference: CashifyGetUptoReference;
  /** The stored figure before any semantic conversion (audit only). */
  storedPrice: number;
  semantics: ReferenceSemantics;
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

const SNAPSHOT_SOURCES: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(materializedSnapshotMeta as Record<string, { source?: string }>).map(([key, meta]) => [key, meta.source])
);

/** Provenances written from the pre-refresh snapshots (see
 * scripts/reference-pricing/migrate-legacy-snapshots.ts and
 * import-brand-snapshots.ts). Everything else - the live "cashify" scrape -
 * is a Get Upto figure. */
const LEGACY_SOURCE_PREFIXES = ['legacy_migration:', 'brand_snapshot:'];

export function semanticsForSource(source: string | null | undefined): ReferenceSemantics {
  // A snapshot entry with no recorded provenance predates the refresh.
  if (!source) return 'legacy_pre_inflated_base';
  return LEGACY_SOURCE_PREFIXES.some((prefix) => source.startsWith(prefix))
    ? 'legacy_pre_inflated_base'
    : 'cashify_get_upto';
}

/**
 * Undoes the legacy inflation. The old engine's perfect-condition multiplier
 * applied to a legacy base is what that base was built to reproduce:
 * Cashify's Get Upto. Accessory bonuses were never part of that inflation.
 */
export function cashifyGetUptoFromLegacyBase(brand: string, model: string, legacyBase: number): CashifyGetUptoReference {
  const probe = 1_000_000;
  const withoutAccessoryBonus: DiagnosticsType = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['bill'] };
  const perfectMultiplier = calculateFhoneifyPrice(brand, model, probe, withoutAccessoryBonus).cashifyConditionEquivalent / probe;
  return Math.round(legacyBase * perfectMultiplier);
}

function toReference(
  device: Pick<CatalogDevice, 'brand' | 'model'>,
  storedPrice: number,
  semantics: ReferenceSemantics,
  rest: Omit<ResolvedReference, 'cashifyGetUptoReference' | 'storedPrice' | 'semantics'>
): ResolvedReference {
  const cashifyGetUptoReference = semantics === 'cashify_get_upto'
    ? storedPrice
    : cashifyGetUptoFromLegacyBase(device.brand, device.model, storedPrice);
  return { cashifyGetUptoReference, storedPrice, semantics, ...rest };
}

/**
 * Resolution order, most to least authoritative:
 *   1. the reference-price repository record (server only)
 *   2. the materialized snapshot exported from that repository
 *   3. the catalog's own basePrice (what the app has always fallen back to)
 * Each is converted to a Cashify Get Upto reference according to its
 * provenance. Returns null when none exist - callers must not invent a price.
 */
export function resolveReference(params: {
  device: Pick<CatalogDevice, 'brand' | 'model' | 'storage' | 'basePrice'>;
  repositoryRecord?: ReferencePriceRecord | null;
  snapshot?: Record<string, number>;
  /** Provenance per snapshot key; defaults to lib/cashify_prices.meta.json. */
  snapshotSources?: Record<string, string | undefined>;
  now?: Date;
}): ResolvedReference | null {
  const { device, repositoryRecord } = params;

  if (
    repositoryRecord &&
    repositoryRecord.status !== 'missing' &&
    repositoryRecord.lastVerifiedAt &&
    isPositivePrice(repositoryRecord.currentPrice)
  ) {
    return toReference(device, repositoryRecord.currentPrice, semanticsForSource(repositoryRecord.source), {
      source: 'reference_repository',
      // Always re-derived at read time; the stored status can be stale.
      referenceStatus: classifyFreshness({
        lastVerifiedAt: repositoryRecord.lastVerifiedAt,
        consecutiveFailures: repositoryRecord.consecutiveFailures,
        now: params.now,
      }),
      referenceSource: repositoryRecord.source,
      referenceLastVerifiedAt: repositoryRecord.lastVerifiedAt,
    });
  }

  const snapshot = params.snapshot ?? (materializedSnapshot as Record<string, number>);
  const key = materializedSnapshotKey(device.model, device.storage);
  const snapshotPrice = snapshot[key];
  if (isPositivePrice(snapshotPrice)) {
    const sources = params.snapshotSources ?? SNAPSHOT_SOURCES;
    return toReference(device, snapshotPrice, semanticsForSource(sources[key]), {
      source: 'materialized_snapshot',
      referenceStatus: 'unknown',
      referenceSource: sources[key] ?? null,
      referenceLastVerifiedAt: null,
    });
  }

  if (isPositivePrice(device.basePrice)) {
    return toReference(device, device.basePrice, 'cashify_get_upto', {
      source: 'catalog_base_price',
      referenceStatus: 'missing',
      referenceSource: null,
      referenceLastVerifiedAt: null,
    });
  }

  return null;
}

export class PricingInvariantError extends Error {
  constructor(message: string, readonly details: Record<string, unknown>) {
    super(message);
    this.name = 'PricingInvariantError';
  }
}

/** Highest price the methodology can produce for a reference: its Get Upto.
 * Every final offer is capped at Cashify's Get Upto before the uplift. */
export function maxPlausiblePrice(reference: CashifyGetUptoReference): FhoneifyGetUpto {
  return computeFhoneifyGetUpto(reference);
}

/** Runs the methodology, then refuses to return a price that is non-finite,
 * below the floor, below the Cashify condition equivalent, or above the Get
 * Upto. A violation means a bug or corrupt input - never something to show a
 * customer or persist on a lead. */
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
  if (cashifyConditionEquivalent > Math.round(reference)) {
    throw new PricingInvariantError('Cashify condition equivalent exceeds the Cashify Get Upto', details);
  }
  if (fhoneifyPrice < cashifyConditionEquivalent) {
    throw new PricingInvariantError('uplifted price is below the Cashify condition equivalent', details);
  }
  if (fhoneifyPrice > ceiling) {
    throw new PricingInvariantError('final offer exceeds the Fhoneify Get Upto', details);
  }

  return result;
}

export { PERFECT_CONDITION_DIAGNOSTICS };

/** Fhoneify "Get Upto": the reference plus the existing uplift, with no
 * condition rule applied (the customer has answered nothing yet). */
export function computeGetUpto(reference: CashifyGetUptoReference): FhoneifyGetUpto {
  if (!isPositivePrice(reference)) {
    throw new PricingInvariantError('Cashify Get Upto reference must be a positive finite number', { reference });
  }
  const getUpto = computeFhoneifyGetUpto(reference);
  if (getUpto <= reference) {
    throw new PricingInvariantError('Fhoneify Get Upto must be above the Cashify Get Upto', { reference, getUpto });
  }
  return getUpto;
}
