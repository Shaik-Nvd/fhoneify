import { Response } from 'express';
import { LogisticsService } from './service';
import { AuthenticatedRequest } from '../../middleware/auth';

// NOTE: these endpoints previously had no authentication at all and used a
// hardcoded 'u-tech-1' identity for every caller (see
// PRODUCTION_READINESS_AUDIT.md). requestRequote/verifyOtp in particular
// authorize a payment change with no ownership check on pickupId - closing
// the "anonymous caller" gap with requireAuth is the minimal safe fix here.
// A dedicated technician role/middleware (distinct from buyer/seller/admin)
// is a reasonable follow-up but is a small role-system addition, not made
// in this pass to keep the change scoped.
export const LogisticsController = {
  getFloat(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const float = LogisticsService.getTechFloat(req.user.id);
      res.json({ success: true, data: float });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getPickups(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const pickups = LogisticsService.getAssignedPickups(req.user.id);
      res.json({ success: true, data: pickups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async requestRequote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { pickupId, newCondition, newQuote } = req.body;
      const data = await LogisticsService.requestRequote(pickupId, newCondition, newQuote);
      if (!data) return res.status(404).json({ success: false, error: 'Pickup not found' });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async verifyOtp(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const { pickupId, otp } = req.body;
      const success = await LogisticsService.verifyRequoteOtp(pickupId, otp);
      if (!success) return res.status(400).json({ success: false, error: 'Invalid OTP' });
      res.json({ success: true, message: 'Re-quote approved and payment authorized' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
