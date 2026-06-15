import { Response } from 'express';
import { z } from 'zod';
import * as buyService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const AddToCartSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
});

const CreateOrderSchema = z.object({
  address: z.string().min(1, 'address is required'),
  couponCode: z.string().optional(),
});

export function getListings(req: AuthenticatedRequest, res: Response) {
  try {
    const brand = req.query.brand as string | undefined;
    const city = req.query.city as string | undefined;
    const condition = req.query.condition as string | undefined;
    const locationId = req.query.locationId as string | undefined;
    const isSelectTier = req.query.isSelectTier === 'true' ? true : (req.query.isSelectTier === 'false' ? false : undefined);
    
    const result = buyService.getListings({ brand, city, condition, locationId, isSelectTier } as any);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getListings controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getListing(req: AuthenticatedRequest, res: Response) {
  try {
    const listing = buyService.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    return res.json({ success: true, data: listing });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getListing controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getCart(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const items = buyService.getCart(req.user.id);
    return res.json({ success: true, data: items });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getCart controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function addToCart(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = AddToCartSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const success = buyService.addToCart(req.user.id, result.data.listingId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }
    return res.json({ success: true, data: null, message: 'Added to cart' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in addToCart controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = CreateOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const order = buyService.createOrder(req.user.id, result.data);
    if (!order) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }
    return res.json({ success: true, data: order, message: 'Order created' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createOrder controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const order = buyService.getOrderById(req.user.id, req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, data: order });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getOrder controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
