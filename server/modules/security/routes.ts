import { Router } from 'express';
import { SecurityController } from './controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Get certs requires auth
router.get('/certificates', requireAuth, SecurityController.getCertificates);

// Download cert is public for demo purposes so href works easily
router.get('/certificates/:id/download', SecurityController.downloadCertificate);

export { router as securityRouter };
