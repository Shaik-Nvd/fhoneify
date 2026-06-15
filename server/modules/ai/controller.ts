import { Request, Response } from 'express';
import { AIService } from './service';

export const AIController = {
  async evaluateImage(req: Request, res: Response) {
    try {
      const { imageUrl, deviceId } = req.body;
      const result = await AIService.evaluateImage(imageUrl, deviceId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async predictPrice(req: Request, res: Response) {
    try {
      const { basePrice, aiCondition } = req.body;
      const price = await AIService.predictPrice(Number(basePrice), aiCondition);
      res.json({ success: true, data: { predictedPrice: price } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async fraudCheck(req: Request, res: Response) {
    try {
      const { userId, imei } = req.body;
      const ipAddress = req.ip || '0.0.0.0';
      const result = await AIService.checkFraud(userId, imei, ipAddress);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
