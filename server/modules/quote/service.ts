import { SEED_DEVICES, quotes, counters, Quote, Device, leads, Lead } from '../../data';
import prisma from '../../lib/prisma';
// The canonical, live pricing engine - the SAME module app/quote/page.tsx
// uses. Previously this file imported a server-local duplicate
// (./pricingCalculator) that depended on an untracked config file which
// was lost to filesystem sync issues; rather than reconstruct lost pricing
// constants (which this task's brief explicitly forbids guessing at),
// this now uses the one real engine, closing the frontend/backend
// duplicate-implementation risk flagged in PRODUCTION_READINESS_AUDIT.md.
import { calculateFhoneifyPrice, applyCompetitorUplift } from '../../../lib/pricingCalculator';
import { getReferencePriceRepository } from '../../../lib/referencePricing/getStore';
import { classifyFreshness, isUsableForPricing } from '../../../lib/referencePricing/freshnessPolicy';
import { deviceKey } from '../../../lib/referencePricing/types';
import logger from '../../lib/logger';

const referencePriceStore = getReferencePriceRepository();

// Whether a device with NO reference price at all should still be quoted
// using its raw basePrice (today's existing behavior, safe default - see
// PRICING_REFERENCE_DATA_ARCHITECTURE.md Section 11) or should refuse to
// quote and return an explicit "reference price unavailable" state. This
// is exactly the "business decision" that document says must not be
// hardcoded silently - so it's a config flag, defaulting to preserving
// current live behavior, not a code change someone has to ship to try.
const STRICT_REFERENCE_MODE = process.env.QUOTE_STRICT_REFERENCE_MODE === 'true';

/** Looks up the verified reference price for a device from the reference-
 * price repository - the "verified reference-price lookup" step between
 * device resolution and the pricing engine (see
 * PRICING_REFERENCE_DATA_ARCHITECTURE.md Section 3 / this task's Step 10).
 * Falls back to the device's raw basePrice, exactly as before this system
 * existed, ONLY when STRICT_REFERENCE_MODE is off (the default) - this
 * preserves today's live behavior unless/until that config is explicitly
 * turned on. Never performs a live external lookup here - reference data
 * is refreshed out-of-band (scripts/reference-pricing/*), so this read is
 * always fast and local, per Step 10's "quote path must not synchronously
 * scrape" requirement. */
async function resolveReferencePrice(device: { brand: string; model: string; storage?: string }): Promise<{
  price: number | null;
  status: 'fresh' | 'approaching_stale' | 'stale' | 'missing' | 'refresh_failed';
  source: string | null;
  lastVerifiedAt: string | null;
}> {
  const key = deviceKey({ brand: device.brand, model: device.model, storage: device.storage ?? '' });
  const record = await referencePriceStore.get(key);

  if (!record || record.status === 'missing') {
    return { price: null, status: 'missing', source: null, lastVerifiedAt: null };
  }

  const liveStatus = classifyFreshness({ lastVerifiedAt: record.lastVerifiedAt, consecutiveFailures: record.consecutiveFailures });
  if (!isUsableForPricing(liveStatus)) {
    // 'stale' by policy - still return the price (fresh/approaching_stale/
    // refresh_failed already pass isUsableForPricing above; only pure
    // 'stale' reaches here) so the caller can decide, but flag it clearly.
    return { price: record.currentPrice, status: liveStatus, source: record.source, lastVerifiedAt: record.lastVerifiedAt };
  }

  return { price: record.currentPrice, status: liveStatus, source: record.source, lastVerifiedAt: record.lastVerifiedAt };
}

const CONDITION_MULTIPLIERS: Record<string, number> = {
  like_new: 0.90,
  excellent: 0.80,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
};

const BASE_PRICE = 100000; // ₹1,00,000 baseline for Phase 1

export function listDevices(): Device[] {
  return SEED_DEVICES;
}

export async function generateQuote(deviceId: string, condition: string, aiPriceAdjustment?: number, answers?: any) {
  const device = SEED_DEVICES.find((d) => d.id === deviceId);
  if (!device) return null;

  // Verified reference-price lookup (Step 10: device resolution -> verified
  // reference price -> existing pricing engine -> existing uplift -> quote).
  // This is a local, synchronous-fast read of periodically-refreshed data,
  // never a live external call from the request path.
  const reference = await resolveReferencePrice(device);

  if (reference.status === 'missing' && STRICT_REFERENCE_MODE) {
    // Explicit "reference price unavailable" state (Step 11) - only reached
    // when the operator has opted into strict mode. Default behavior below
    // preserves today's basePrice fallback.
    logger.warn({ deviceId, brand: device.brand, model: device.model }, 'Quote blocked: no reference price and QUOTE_STRICT_REFERENCE_MODE is on');
    return { error: 'REFERENCE_PRICE_UNAVAILABLE', deviceId, brand: device.brand, model: device.model };
  }

  const baseMarketPrice = reference.price ?? device.basePrice ?? 1000;
  if (reference.status !== 'fresh') {
    logger.info({ deviceId, brand: device.brand, model: device.model, referenceStatus: reference.status }, 'Quote generated from a non-fresh reference price');
  }

  let estimatedPrice: number;
  let upliftedBasePrice: number;

  if (answers) {
    // The canonical engine applies age/defect/hardware penalties AND the
    // competitor uplift internally - do not re-apply applyCompetitorUplift
    // on top of its own result (that would double-apply the uplift).
    const result = calculateFhoneifyPrice(device.brand, device.model, baseMarketPrice, answers, undefined, device.storage);
    estimatedPrice = result.fhoneifyPrice;
    upliftedBasePrice = result.fhoneifyPrice;
  } else {
    // No detailed diagnostics yet (coarse condition-bucket quote, e.g. the
    // initial estimate before the diagnostics form) - existing formula
    // unchanged, just fed by the verified reference price now instead of
    // a directly-imported JSON file.
    const isApple = device.brand.toLowerCase() === 'apple';
    let depreciatedPrice: number;
    if (isApple) {
      const multiplier = CONDITION_MULTIPLIERS[condition] ?? 0.5;
      depreciatedPrice = Math.round(baseMarketPrice * multiplier);
      if (device.model.includes('13') || device.model.includes('14')) {
        depreciatedPrice = Math.round(depreciatedPrice * 0.85);
      }
    } else {
      const conditionDeductions: Record<string, number> = {
        like_new: 0,
        excellent: 0.08,
        good: 0.18,
        fair: 0.35,
        poor: 0.55,
      };
      const deduction = conditionDeductions[condition] ?? 0.35;
      depreciatedPrice = Math.round(baseMarketPrice * (1 - deduction));
    }
    estimatedPrice = applyCompetitorUplift(baseMarketPrice, depreciatedPrice);
    upliftedBasePrice = estimatedPrice;
  }

  // Apply AI Price Adjustment if passed from the new AI quote flow
  if (aiPriceAdjustment) {
    estimatedPrice += aiPriceAdjustment;
  }

  const quoteId = `q-${counters.quote++}`;

  const quote: Quote = {
    quoteId,
    deviceId,
    condition,
    estimatedPrice,
    estimated_price: estimatedPrice, // snake_case alias for compatibility
    device,
    createdAt: new Date().toISOString(),
  };

  quotes.set(quoteId, quote);
  return {
    estimatedPrice,
    deviceId,
    condition,
    quoteId,
    upliftedBasePrice,
    referenceStatus: reference.status,
    referenceSource: reference.source,
    referenceLastVerifiedAt: reference.lastVerifiedAt,
  };
}

export function getQuoteById(quoteId: string): Quote | null {
  return quotes.get(quoteId) || null;
}

export async function createLead(data: { userId?: string; name?: string; phone: string; brand: string; model: string; storage: string; quotedPrice: number; pickupDate?: string; pickupTime?: string; address?: string; pincode?: string; city?: string; answers?: any; status?: string }) {
  const lead = await prisma.lead.create({
    data: {
      userId: data.userId || null,
      name: data.name || null,
      phone: data.phone,
      brand: data.brand,
      model: data.model,
      storage: data.storage,
      quotedPrice: data.quotedPrice,
      pickupDate: data.pickupDate || null,
      pickupTime: data.pickupTime || null,
      address: data.address || null,
      pincode: data.pincode || null,
      city: data.city || null,
      status: data.status || 'pending',
      answers: data.answers || null,
    }
  });
  return lead;
}

/** The 10-digit Indian mobile number in a phone string, or null when it is not one. */
export function indianMobile(raw: unknown): string | null {
  const match = String(raw ?? '').replace(/[\s\-().]/g, '').match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return match ? match[1] : null;
}

/** Every spelling under which a number may have been stored on a lead. */
export function phoneSpellings(phone: string): string[] {
  const d10 = indianMobile(phone);
  return Array.from(new Set([phone, ...(d10 ? [d10, `91${d10}`, `+91${d10}`, `0${d10}`] : [])]));
}

/** Leads that never became (or no longer are) a booked pickup. */
const NOT_A_BOOKING = ['price checked', 'lost', 'cancelled'];

/** Whether this phone number already booked a pickup with the first-time coupon. */
export async function couponAlreadyClaimed(phone: string): Promise<boolean> {
  const count = await prisma.lead.count({
    where: {
      phone: { in: phoneSpellings(phone) },
      status: { notIn: NOT_A_BOOKING },
      answers: { path: ['pricing', 'couponClaimed'], equals: true },
    },
  });
  return count > 0;
}

/**
 * Records a logged-in customer's price check for the sales team: one row per customer, device and day,
 * updated with the latest price and answers instead of a new row on every request.
 */
export async function recordPriceCheck(data: { userId: string; phone: string; name: string; brand: string; model: string; storage: string; quotedPrice: number; answers: any }) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const existing = await prisma.lead.findFirst({
    where: { userId: data.userId, brand: data.brand, model: data.model, storage: data.storage, status: 'price checked', createdAt: { gte: startOfDay } },
    select: { id: true },
  });
  if (existing) {
    return prisma.lead.update({ where: { id: existing.id }, data: { quotedPrice: data.quotedPrice, answers: data.answers } });
  }
  return createLead({ ...data, status: 'price checked' });
}

export async function getCustomerPickups(userId?: string, phone?: string) {
  const orConditions: any[] = [];
  if (userId) {
    orConditions.push({ userId });
  }
  if (phone) {
    // Exact spellings of this number only: a suffix match could show another person's pickups.
    orConditions.push({ phone: { in: phoneSpellings(phone) } });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const leads = await prisma.lead.findMany({
    where: {
      OR: orConditions,
      // A price check is recorded for the sales team; it is not a pickup the customer booked.
      NOT: { status: 'price checked' },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return leads;
}


