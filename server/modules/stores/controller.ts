import { Request, Response } from 'express';
import { StoresService } from './service';

export const StoresController = {
  getStores(req: Request, res: Response) {
    try {
      const city = req.query.city as string;
      const stores = StoresService.getStores(city);
      res.json({ success: true, data: stores });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  bookAppointment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { storeId, date, time, purpose } = req.body;
      if (!storeId || !date || !time || !purpose) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const appointment = StoresService.bookAppointment(userId, storeId, date, time, purpose);
      res.json({ success: true, data: appointment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  getUserAppointments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const appointments = StoresService.getUserAppointments(userId);
      res.json({ success: true, data: appointments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
