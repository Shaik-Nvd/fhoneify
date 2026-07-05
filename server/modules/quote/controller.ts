import { Request, Response } from 'express';
import { z } from 'zod';
import * as quoteService from './service';
import logger from '../../lib/logger';

const CreateQuoteSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  condition: z.string().min(1, 'condition is required'),
  storage: z.string().optional(),
});

const CreateLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(1, 'phone is required'),
  brand: z.string(),
  model: z.string(),
  storage: z.string(),
  quotedPrice: z.number(),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
});

export function listDevices(req: Request, res: Response) {
  try {
    const devices = quoteService.listDevices();
    return res.json({ success: true, data: devices, message: 'Devices fetched successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in listDevices controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function createQuote(req: Request, res: Response) {
  try {
    const result = CreateQuoteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { deviceId, condition } = result.data;
    const quoteResult = quoteService.generateQuote(deviceId, condition);
    if (!quoteResult) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    return res.json({ success: true, data: quoteResult, message: 'Quote generated successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createQuote controller');
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
    
    // Optional user context
    const userId = (req as any).user?.id;
    
    const lead = await quoteService.createLead({ ...result.data, userId });
    return res.json({ success: true, data: lead, message: 'Lead created successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createLead controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

import { scrapeCashifyPrice } from './cashifyScraper';

export async function getCashifyPrice(req: Request, res: Response) {
  try {
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
