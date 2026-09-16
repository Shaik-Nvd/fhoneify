import { Request, Response } from 'express';
import { B2BService } from './service';
import { AuthenticatedRequest } from '../../middleware/auth';

export const B2BController = {
  async getAuctions(req: Request, res: Response) {
    try {
      const auctions = await B2BService.getAuctions();
      res.json({ success: true, data: auctions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getLeads(req: Request, res: Response) {
    try {
      const leads = await B2BService.getLeads('Bengaluru'); // Mock location
      res.json({ success: true, data: leads });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const wallet = await B2BService.getWallet(req.user.id);
      res.json({ success: true, data: wallet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async claimLead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { leadId } = req.body;
      const result = await B2BService.claimLead(req.user.id, leadId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async placeBid(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { auctionId, amount } = req.body;
      const result = await B2BService.placeBid(req.user.id, auctionId, Number(amount));
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
