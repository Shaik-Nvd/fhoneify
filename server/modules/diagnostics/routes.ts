import { Router } from 'express';
import { DiagnosticsController } from './controller';

const router = Router();

router.get('/verify-imei', DiagnosticsController.verifyIMEI);
router.post('/submit', DiagnosticsController.submitDiagnostics);

export { router as diagnosticsRouter };
