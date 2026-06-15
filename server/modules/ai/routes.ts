import { Router } from 'express';
import { AIController } from './controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// Used in the Sell flow (Public)
router.post('/evaluate-image', AIController.evaluateImage);
router.post('/predict-price', AIController.predictPrice);

// Admin / System route
router.post('/fraud-check', requireAuth, requireAdmin, AIController.fraudCheck);

export { router as aiRouter };
