import { Response } from 'express';
import { z } from 'zod';
import * as service from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const STATUS_VALUES = ['fresh', 'approaching_stale', 'stale', 'missing', 'refresh_failed'] as const;

export async function getStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const summary = await service.getCoverageSummary();
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in reference-pricing getStatus');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function listByStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const status = req.params.status;
    if (!STATUS_VALUES.includes(status as any)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${STATUS_VALUES.join(', ')}` });
    }
    const devices = await service.listDevicesByStatus(status as any);
    return res.json({ success: true, data: devices });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in reference-pricing listByStatus');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getDevice(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await service.getDevice(req.params.deviceKey);
    if (!result) return res.status(404).json({ success: false, error: 'No reference-price record for this device key' });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in reference-pricing getDevice');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

const SubmitPriceSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  storage: z.string().min(1),
  price: z.number().positive(),
  sourceUrl: z.string().url().optional(),
});

export async function submitPrice(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const result = SubmitPriceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const outcome = await service.submitVerifiedPrice({ ...result.data, submittedByUserId: req.user.id });
    if (!outcome.accepted) {
      return res.status(422).json({ success: false, error: outcome.reason });
    }
    return res.json({ success: true, data: outcome });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in reference-pricing submitPrice');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
