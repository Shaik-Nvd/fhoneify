import { Request, Response } from 'express';
import { z } from 'zod';
import * as reviewsService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const CreateReviewSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, 'comment is required'),
});

export function getListingReviews(req: Request, res: Response) {
  try {
    const listingId = req.params.listingId || '';
    const reviews = reviewsService.getReviewsForListing(listingId);
    return res.json({ success: true, data: reviews });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getListingReviews controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function postReview(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = CreateReviewSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { orderId, rating, comment } = result.data;
    const review = reviewsService.createReview(orderId, rating, comment);
    return res.json({ success: true, data: review, message: 'Review created successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in postReview controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
