import { Request, Response } from 'express';
import { z } from 'zod';
import * as repairService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { SEED_DEVICES } from '../../data';

const QuoteSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  issue: z.string().min(1, 'Issue is required'),
});

const BookingSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required'),
  address: z.string().min(10, 'Complete address is required'),
  pickupDate: z.string().min(1, 'Pickup date is required'),
});

export async function getIssues(req: Request, res: Response) {
  const issues = ['Screen', 'Battery', 'Camera', 'ChargingPort', 'Speaker', 'Motherboard'];
  return res.json({ success: true, data: issues });
}

export async function getQuote(req: Request, res: Response) {
  try {
    const result = QuoteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

    const { deviceId, issue } = result.data;
    const quote = await repairService.generateQuote(deviceId, issue);

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const device = SEED_DEVICES.find(d => d.id === deviceId);

    return res.json({
      success: true,
      data: {
        ...quote,
        device
      },
      message: 'Repair quote generated'
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error generating repair quote');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function bookRepair(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = BookingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

    const { quoteId, address, pickupDate } = result.data;
    const booking = await repairService.bookRepair(req.user.id, quoteId, address, pickupDate);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Quote not found or invalid' });
    }

    return res.json({ success: true, data: booking, message: 'Repair booked successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error booking repair');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getMyBookings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const bookings = await repairService.getUserBookings(req.user.id);
    // Enrich with device info
    const enriched = bookings.map(b => {
      const device = SEED_DEVICES.find(d => d.id === b.deviceId);
      return { ...b, device };
    });

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error fetching repair bookings');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
