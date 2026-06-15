import { Request, Response } from 'express';
import { CMSService } from './service';

export const CMSController = {
  getPosts(req: Request, res: Response) {
    try {
      // Check if admin is requesting (to show drafts)
      const isAdmin = (req as any).user?.role === 'admin';
      const posts = CMSService.getAllPosts(isAdmin);
      res.json({ success: true, data: posts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getPost(req: Request, res: Response) {
    try {
      const post = CMSService.getPostBySlug(req.params.slug);
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  },

  createPost(req: Request, res: Response) {
    try {
      const post = CMSService.createPost(req.body);
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  updatePost(req: Request, res: Response) {
    try {
      const post = CMSService.updatePost(req.params.id, req.body);
      res.json({ success: true, data: post });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
};
