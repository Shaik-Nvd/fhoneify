import { Router } from 'express';
import { InventoryController } from './controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// All inventory routes require admin access
router.use(requireAuth, requireAdmin);

router.get('/', InventoryController.getAll);
router.get('/:id', InventoryController.getOne);
router.post('/intake', InventoryController.intake);
router.put('/:id/qa', InventoryController.submitQA);
router.put('/:id/phase', InventoryController.updatePhase);

export { router as inventoryRouter };
