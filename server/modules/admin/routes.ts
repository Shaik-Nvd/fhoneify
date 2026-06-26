import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

// Secure all admin routes with auth and admin-only checks
router.use(requireAuth);
router.use(requireAdmin);

router.get('/analytics', ctrl.getAnalytics);
router.get('/listings', ctrl.getListings);
router.get('/orders', ctrl.getOrders);
router.get('/fraud', ctrl.getFraudListings);
router.get('/users', ctrl.getUsers);
router.get('/leads', ctrl.getLeads);
router.patch('/leads/:id/status', ctrl.updateLeadStatus);
router.patch('/listings/:id/approve', ctrl.approveListing);
router.patch('/listings/:id/reject', ctrl.rejectListing);

export default router;
