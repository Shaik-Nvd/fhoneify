import { Response } from 'express';
import { z } from 'zod';
import * as sellService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const CreateListingSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  storage: z.string().optional(),
  condition: z.string().optional(),
  askingPrice: z.number().optional(),
  price: z.number().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const SchedulePickupSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  pickupDate: z.string().min(1, 'pickupDate is required'),
  timeSlot: z.string().min(1, 'timeSlot is required'),
  address: z.string().min(1, 'address is required'),
});

export function getDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const data = sellService.getSellerDashboard(req.user.id);
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getDashboard controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getMyListings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const data = sellService.getMyListings(req.user.id);
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getMyListings controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function createListing(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = CreateListingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const listing = sellService.createListing(req.user.id, result.data);
    return res.json({ success: true, data: listing, message: 'Listing created' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createListing controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function schedulePickup(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = SchedulePickupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const pickup = sellService.schedulePickup(req.user.id, result.data);
    return res.json({ success: true, data: pickup, message: 'Pickup scheduled' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in schedulePickup controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getPickups(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const data = sellService.getMyPickups(req.user.id);
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getPickups controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
