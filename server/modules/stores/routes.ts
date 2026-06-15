import { Router } from 'express';
import { StoresController } from './controller';
import { POSController } from './pos.controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

router.get('/', StoresController.getStores);
router.post('/pos/checkout', requireAuth, requireAdmin, POSController.checkout);
router.post('/appointments', requireAuth, StoresController.bookAppointment);
router.get('/appointments/me', requireAuth, StoresController.getUserAppointments);

export { router as storesRouter };
