import { Request, Response } from 'express';
import { z } from 'zod';
import * as quoteService from './service';
import { pricingService, signingSecret } from './pricing';
import {
  CouponResult,
  evaluateCoupon,
  isVerifiedPhone,
  offerFor,
  parsePromoCodes,
  phoneKey,
  RedemptionLookup,
} from './coupon';
import { parseDiagnostics } from '../../../lib/pricing/diagnostics';
import type { PricingErrorCode } from '../../../lib/pricing/pricingService';
import { buildLeadAnswers } from '../../../lib/pricing/payout';
import config from '../../config';
import logger from '../../lib/logger';

const CreateQuoteSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  condition: z.string().min(1, 'condition is required'),
  storage: z.string().optional(),
  answers: z.unknown().optional(),
});

const deviceField = (name: string) => z.string().trim().min(1, `${name} is required`).max(120);
const optionalText = (max: number) => z.string().trim().max(max).optional();

const PriceQuoteSchema = z.object({
  brand: deviceField('brand'),
  model: deviceField('model'),
  storage: deviceField('storage'),
  diagnostics: z.unknown(),
});

const CreateLeadSchema = z.object({
  name: optionalText(120),
  phone: z.string().trim().min(1, 'phone is required').max(20),
  brand: deviceField('brand'),
  model: deviceField('model'),
  storage: deviceField('storage'),
  // Accepted for audit only - the stored price is always server-verified.
  quotedPrice: z.number().finite().optional(),
  quoteToken: z.string().max(2048).optional(),
  // Only a CODE is accepted. The server decides whether it is honoured; a
  // client-supplied `couponApplied` boolean is not part of this schema and is
  // dropped by zod, so it cannot grant anything.
  couponCode: z.string().trim().max(40).optional(),
  pickupDate: optionalText(40),
  pickupTime: optionalText(40),
  address: optionalText(500),
  pincode: optionalText(12),
  city: optionalText(80),
  answers: z.unknown().optional(),
});

const PRICING_ERROR_STATUS: Record<PricingErrorCode, number> = {
  INVALID_DIAGNOSTICS: 400,
  DEVICE_NOT_FOUND: 404,
  REFERENCE_PRICE_UNAVAILABLE: 409,
  PRICING_INVARIANT_VIOLATION: 500,
};

// The live Cashify scraper carries unresolved legal/ToS exposure
// (PRODUCTION_READINESS_AUDIT.md P3-2) and launches a browser per request.
// Off in production unless explicitly enabled; the UI only offers it on
// localhost.
const LIVE_MARKET_PRICE_ENABLED = process.env.ENABLE_LIVE_MARKET_PRICE_SCRAPE
  ? process.env.ENABLE_LIVE_MARKET_PRICE_SCRAPE === 'true'
  : !config.IS_PRODUCTION;

export function listDevices(req: Request, res: Response) {
  try {
    const devices = quoteService.listDevices();
    return res.json({ success: true, data: devices, message: 'Devices fetched successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in listDevices controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function createQuote(req: Request, res: Response) {
  try {
    const result = CreateQuoteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { deviceId, condition } = result.data;
    let answers;
    if (result.data.answers !== undefined) {
      const parsed = parseDiagnostics(result.data.answers);
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error, code: 'INVALID_DIAGNOSTICS' });
      answers = parsed.value;
    }
    const quoteResult = await quoteService.generateQuote(deviceId, condition, undefined, answers);
    if (!quoteResult) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    if ('error' in quoteResult && quoteResult.error === 'REFERENCE_PRICE_UNAVAILABLE') {
      return res.status(409).json({ success: false, error: 'Reference price unavailable for this device', data: quoteResult });
    }
    return res.json({ success: true, data: quoteResult, message: 'Quote generated successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createQuote controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/** POST /api/quote/price - authoritative price + signed quote token for the
 * brand/model/storage and diagnostics the quote page collected. */
export async function priceQuote(req: Request, res: Response) {
  try {
    const body = PriceQuoteSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ success: false, error: body.error.issues[0].message });
    }

    const outcome = await pricingService.quote(body.data);
    if (!outcome.ok) {
      return res.status(PRICING_ERROR_STATUS[outcome.code]).json({ success: false, error: outcome.message, code: outcome.code });
    }

    const { internal, ok, ...publicQuote } = outcome;
    logger.info(
      { deviceKey: internal.deviceKey, fhoneifyPrice: outcome.fhoneifyPrice, baseSource: internal.baseSource, referenceStatus: outcome.referenceStatus, pricingVersion: outcome.pricingVersion },
      'Authoritative quote issued'
    );
    return res.json({ success: true, data: publicQuote });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in priceQuote controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getQuote(req: Request, res: Response) {
  try {
    const quote = quoteService.getQuoteById(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    return res.json({ success: true, data: quote });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getQuote controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

const promoCodes = parsePromoCodes(process.env.PROMO_COUPON_CODES);
const couponDeps = (lookup: RedemptionLookup = quoteService.countLeadsForPhone) => ({
  secret: signingSecret,
  promoCodes,
  lookup,
});

/** GET /coupon/offer - the first-time code for the signed-in phone, if any. */
export async function couponOffer(req: Request, res: Response) {
  try {
    const code = await offerFor(couponDeps(), (req as any).user?.phone);
    return res.json({ success: true, data: { code } });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in couponOffer controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

const ValidateCouponSchema = z.object({ code: z.string().trim().min(1).max(40) });

/** POST /coupon/validate - the same rules createLead enforces, so the screen
 * never shows a bonus the server will not pay. Read-only: redeems nothing. */
export async function couponValidate(req: Request, res: Response) {
  try {
    const parsed = ValidateCouponSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'code is required' });
    const result: CouponResult = await evaluateCoupon(couponDeps(), {
      code: parsed.data.code,
      verifiedPhone: (req as any).user?.phone,
    });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in couponValidate controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function createLead(req: Request, res: Response) {
  try {
    const result = CreateLeadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { quoteToken, quotedPrice, couponCode, answers, ...lead } = result.data;

    const verified = await pricingService.verifyLeadPrice({
      brand: lead.brand,
      model: lead.model,
      storage: lead.storage,
      diagnostics: answers,
      quoteToken,
      clientQuotedPrice: quotedPrice,
    });
    if (!verified.ok) {
      return res.status(PRICING_ERROR_STATUS[verified.code]).json({ success: false, error: verified.message, code: verified.code });
    }

    // Optional user context (set by optionalAuth when a valid token is sent)
    const user = (req as any).user;
    const userId = user?.id;

    // Without a coupon code this is the plain path: nothing to decide.
    if (!couponCode) {
      const created = await quoteService.createLead({
        ...lead,
        userId,
        quotedPrice: verified.price,
        // The audit rides alongside the diagnostics the admin views already
        // read, so no schema migration is needed to make prices traceable.
        answers: buildLeadAnswers(verified, false),
      });
      return res.json({ success: true, data: created, message: 'Lead created successfully' });
    }

    // A coupon is honoured only for the OTP-verified phone, and the decision
    // is made inside the per-phone lock so a replay or double submit cannot
    // redeem twice. A denied coupon still creates the lead - at the price
    // without the bonus - and the response says why.
    const verifiedPhone = user?.phone;
    const key = phoneKey(verifiedPhone);
    if (!isVerifiedPhone(verifiedPhone) || phoneKey(lead.phone) !== key) {
      const created = await quoteService.createLead({
        ...lead,
        userId,
        quotedPrice: verified.price,
        answers: buildLeadAnswers(verified, false),
      });
      const reason = !isVerifiedPhone(verifiedPhone) ? 'login_required' : 'phone_mismatch';
      return res.json({ success: true, data: created, coupon: { valid: false, bonus: 0, reason }, message: 'Lead created successfully' });
    }

    let couponResult: CouponResult = { valid: false, bonus: 0 };
    const created = await quoteService.createLeadWithCoupon(
      key,
      { ...lead, userId, quotedPrice: verified.price },
      async (lookup) => {
        couponResult = await evaluateCoupon(couponDeps(lookup), { code: couponCode, verifiedPhone });
        return {
          answers: couponResult.valid
            ? buildLeadAnswers(verified, true, { code: couponResult.code!, phoneKey: key })
            : buildLeadAnswers(verified, false),
        };
      }
    );
    return res.json({ success: true, data: created, coupon: couponResult, message: 'Lead created successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createLead controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

import { scrapeCashifyPrice } from './cashifyScraper';

export async function getCashifyPrice(req: Request, res: Response) {
  try {
    if (!LIVE_MARKET_PRICE_ENABLED) {
      return res.status(503).json({ success: false, error: 'Live market price lookup is disabled' });
    }

    const { brand, model, storage, answers, fhoneifyPrice } = req.body;
    if (!brand || !model) {
      return res.status(400).json({ success: false, error: 'brand and model are required' });
    }

    if (fhoneifyPrice) {
      logger.info(`Fhoneify calculated price for ${brand} ${model} (${storage}): ₹${fhoneifyPrice}`);
    }

    // Call the scraper to get real AI Market Price for cross checking
    const result = await scrapeCashifyPrice({ brand, model, storage, answers });

    if (result.success) {
      return res.json({ success: true, data: result.price });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getCashifyPrice controller');
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
