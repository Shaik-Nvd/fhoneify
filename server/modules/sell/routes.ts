import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.get('/dashboard', requireAuth, ctrl.getDashboard);
router.get('/listings/me', requireAuth, ctrl.getMyListings);
router.post('/listings', requireAuth, ctrl.createListing);
router.post('/schedule', requireAuth, ctrl.schedulePickup);
router.get('/pickups', requireAuth, ctrl.getPickups);

export default router;
