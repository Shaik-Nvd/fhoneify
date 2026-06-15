import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.get('/:listingId', ctrl.getListingReviews);
router.post('/', requireAuth, ctrl.postReview);

export default router;
