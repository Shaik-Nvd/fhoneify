import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

router.post('/otp/send', ctrl.sendOtp);
router.post('/otp/verify', ctrl.verifyOtp);
router.post('/admin/login', ctrl.adminLogin);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.put('/profile', requireAuth, ctrl.updateProfile);
router.get('/me', requireAuth, ctrl.getMe);

export default router;
