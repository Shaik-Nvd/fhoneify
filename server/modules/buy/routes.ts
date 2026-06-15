import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.get('/listings', ctrl.getListings);
router.get('/listings/:id', ctrl.getListing);
router.get('/cart', requireAuth, ctrl.getCart);
router.post('/cart', requireAuth, ctrl.addToCart);
router.post('/orders', requireAuth, ctrl.createOrder);
router.get('/orders/:id', requireAuth, ctrl.getOrder);

export default router;
