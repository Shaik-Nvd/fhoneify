import { Router } from 'express';
import * as ctrl from './controller';

const router = Router();

router.get('/devices', ctrl.listDevices);
router.post('/', ctrl.createQuote);
router.post('/leads', ctrl.createLead);
router.get('/:id', ctrl.getQuote);

export default router;
