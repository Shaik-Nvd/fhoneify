import { Router } from 'express';
import * as ctrl from './controller';

const router = Router();

router.get('/', ctrl.search);

export default router;
