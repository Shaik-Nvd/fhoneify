import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.use(requireAuth);

router.post('/razorpay/create', ctrl.createOrder);
router.post('/razorpay/verify', ctrl.verifyPayment);

export default router;
