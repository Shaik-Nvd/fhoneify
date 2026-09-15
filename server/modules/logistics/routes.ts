import { Router } from 'express';
import { LogisticsController } from './controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/float', LogisticsController.getFloat);
router.get('/pickups', LogisticsController.getPickups);
router.post('/requote', LogisticsController.requestRequote);
router.post('/requote/verify', LogisticsController.verifyOtp);

export { router as logisticsRouter };
