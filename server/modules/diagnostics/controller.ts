import { Request, Response } from 'express';
import { DiagnosticsService } from './service';

export const DiagnosticsController = {
  async verifyIMEI(req: Request, res: Response) {
    try {
      const imei = req.query.imei as string;
      if (!imei) {
        return res.status(400).json({ success: false, error: 'IMEI required' });
      }
      const result = await DiagnosticsService.verifyIMEI(imei);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async submitDiagnostics(req: Request, res: Response) {
    try {
      const { deviceId, results } = req.body;
      const data = await DiagnosticsService.submitDiagnostics(deviceId, results);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
