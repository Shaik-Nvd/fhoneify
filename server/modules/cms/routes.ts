import { Router } from 'express';
import { CMSController } from './controller';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/posts', CMSController.getPosts);
router.get('/posts/:slug', CMSController.getPost);

// Admin routes
router.post('/posts', requireAuth, requireAdmin, CMSController.createPost);
router.put('/posts/:id', requireAuth, requireAdmin, CMSController.updatePost);

export { router as cmsRouter };
