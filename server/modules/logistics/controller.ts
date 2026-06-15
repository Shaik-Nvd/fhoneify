import { Request, Response } from 'express';
import { LogisticsService } from './service';

export const LogisticsController = {
  getFloat(req: Request, res: Response) {
    try {
      // Hardcoded tech ID for demo
      const techId = 'u-tech-1';
      const float = LogisticsService.getTechFloat(techId);
      res.json({ success: true, data: float });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getPickups(req: Request, res: Response) {
    try {
      const techId = 'u-tech-1';
      const pickups = LogisticsService.getAssignedPickups(techId);
      res.json({ success: true, data: pickups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async requestRequote(req: Request, res: Response) {
    try {
      const { pickupId, newCondition, newQuote } = req.body;
      const data = await LogisticsService.requestRequote(pickupId, newCondition, newQuote);
      if (!data) return res.status(404).json({ success: false, error: 'Pickup not found' });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async verifyOtp(req: Request, res: Response) {
    try {
      const { pickupId, otp } = req.body;
      const success = await LogisticsService.verifyRequoteOtp(pickupId, otp);
      if (!success) return res.status(400).json({ success: false, error: 'Invalid OTP' });
      res.json({ success: true, message: 'Re-quote approved and payment authorized' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
