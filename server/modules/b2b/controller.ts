import { Request, Response } from 'express';
import { B2BService } from './service';

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

  async getWallet(req: Request, res: Response) {
    try {
      const partnerId = (req as any).user?.id || 'partner-1';
      const wallet = await B2BService.getWallet(partnerId);
      res.json({ success: true, data: wallet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async claimLead(req: Request, res: Response) {
    try {
      const partnerId = (req as any).user?.id || 'partner-1';
      const { leadId } = req.body;
      const result = await B2BService.claimLead(partnerId, leadId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async placeBid(req: Request, res: Response) {
    try {
      const partnerId = (req as any).user?.id || 'partner-1';
      const { auctionId, amount } = req.body;
      const result = await B2BService.placeBid(partnerId, auctionId, Number(amount));
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
