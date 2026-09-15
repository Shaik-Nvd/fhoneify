import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

// Operational visibility into reference-price data quality (Phase 12).
// Admin-only: this exposes match evidence and source URLs that aren't
// meant for public consumption, and submitPrice is a write endpoint.
router.use(requireAuth, requireAdmin);

router.get('/status', ctrl.getStatus);
router.get('/devices/:status', ctrl.listByStatus);
router.get('/device/:deviceKey', ctrl.getDevice);
router.post('/submit', ctrl.submitPrice);

export { router as referencePricingRouter };
