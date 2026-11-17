import { Router } from 'express';
import { LogisticsController } from './controller';
import { requireAdmin, requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/float', LogisticsController.getFloat);
router.get('/pickups', LogisticsController.getPickups);
router.post('/requote', requireAdmin, LogisticsController.requestRequote);
router.post('/requote/verify', requireAdmin, LogisticsController.verifyOtp);

export { router as logisticsRouter };
