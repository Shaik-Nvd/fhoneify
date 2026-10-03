import { Request, Response } from 'express';
import { z } from 'zod';
import * as quoteService from './service';
import { pricingService } from './pricing';
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
  // The first-time coupon is issued and checked in the browser, so this is
  // stored as the customer's claim, not as a verified entitlement.
  couponApplied: z.boolean().optional(),
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
  MANUAL_INSPECTION_REQUIRED: 422,
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
    // The old condition-bucket endpoint must not issue a second RC price.
    // Legacy mode keeps its original contract; RC needs the same real answers.
    if (process.env.PRICING_RELEASE_CANDIDATE === 'on') {
      const device = quoteService.listDevices().find(d => d.id === deviceId);
      if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
      if (!answers) return res.status(422).json({ success: false, code: 'MANUAL_INSPECTION_REQUIRED', error: 'Complete the device questions before requesting a price' });
      const outcome = await pricingService.quote({ brand: device.brand, model: device.model, storage: device.storage, diagnostics: answers });
      if (!outcome.ok) return res.status(PRICING_ERROR_STATUS[outcome.code]).json({ success: false, error: outcome.message, code: outcome.code });
      const { internal, ok, ...publicQuote } = outcome;
      return res.json({ success: true, data: publicQuote });
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

const GetUptoSchema = z.object({
  devices: z
    .array(z.object({ brand: deviceField('brand'), model: deviceField('model'), storage: deviceField('storage') }))
    .min(1)
    .max(20),
});

/** POST /api/quote/get-upto - Fhoneify Get Upto (ReferencePrice + uplift)
 * for up to 20 devices in one call, for the homepage cards. A device that
 * cannot be priced returns startingPrice null; no fallback number is sent. */
export async function getUptoBatch(req: Request, res: Response) {
  try {
    const body = GetUptoSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ success: false, error: body.error.issues[0].message });
    }
    const data = await Promise.all(body.data.devices.map(async (device) => {
      const outcome = await pricingService.getUpto(device);
      return { ...device, startingPrice: outcome.ok ? outcome.startingPrice : null };
    }));
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getUptoBatch controller');
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
      return res.status(PRICING_ERROR_STATUS[outcome.code]).json({ success: false, error: outcome.message, code: outcome.code, ...(outcome.context ? { context: outcome.context } : {}) });
    }

    const { internal, ok, ...publicQuote } = outcome;
    logger.info(
      { deviceKey: internal.deviceKey, fhoneifyPrice: outcome.fhoneifyPrice, baseSource: internal.baseSource, referenceStatus: outcome.referenceStatus, pricingVersion: outcome.pricingVersion,
        reference: internal.cashifyGetUptoReference, questionnaire: outcome.questionnaire, rule: internal.releaseCandidate, accessoryBasis: internal.accessoryBasis, routeEvidenceSha256: internal.routeEvidenceSha256 },
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

export async function createLead(req: Request, res: Response) {
  try {
    const result = CreateLeadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { quoteToken, quotedPrice, couponApplied, answers, ...lead } = result.data;

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

    // Optional user context
    const userId = (req as any).user?.id;

    const created = await quoteService.createLead({
      ...lead,
      userId,
      quotedPrice: verified.price,
      // The audit rides alongside the diagnostics the admin views already
      // read, so no schema migration is needed to make prices traceable.
      answers: buildLeadAnswers(verified, couponApplied === true),
    });
    return res.json({ success: true, data: created, message: 'Lead created successfully' });
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
