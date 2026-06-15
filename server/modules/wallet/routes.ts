import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', ctrl.getWalletDashboard);

export default router;
