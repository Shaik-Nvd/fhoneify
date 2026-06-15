import { Request, Response } from 'express';
import { InventoryService } from './service';

export const InventoryController = {
  async getListedItems(req: Request, res: Response) {
    try {
      const locationId = req.query.locationId as string | undefined;
      const isSelectTier = req.query.isSelectTier === 'true' ? true : (req.query.isSelectTier === 'false' ? false : undefined);
      
      const items = await InventoryService.getListedItems({ locationId, isSelectTier });
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getAll(req: Request, res: Response) {
    try {
      const items = InventoryService.getAllItems();
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getOne(req: Request, res: Response) {
    try {
      const item = InventoryService.getItem(req.params.id);
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  },

  intake(req: Request, res: Response) {
    try {
      const { deviceId, imei } = req.body;
      const item = InventoryService.intakeDevice(deviceId, imei);
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  submitQA(req: Request, res: Response) {
    try {
      const { report, grade } = req.body;
      const item = InventoryService.submitQAReport(req.params.id, report, grade);
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  updatePhase(req: Request, res: Response) {
    try {
      const { phase } = req.body;
      const item = InventoryService.updatePhase(req.params.id, phase);
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
};
