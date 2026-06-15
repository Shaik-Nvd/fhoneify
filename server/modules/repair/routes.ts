import { Router } from 'express';
import * as repairController from './controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/issues', repairController.getIssues);
router.post('/quote', repairController.getQuote);

// Protected routes
router.use(requireAuth);
router.post('/book', repairController.bookRepair);
router.get('/my-bookings', repairController.getMyBookings);

export default router;
