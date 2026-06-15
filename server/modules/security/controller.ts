import { Request, Response } from 'express';
import { SecurityService } from './service';

export const SecurityController = {
  async getCertificates(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const certs = await SecurityService.getUserCertificates(userId);
      res.json({ success: true, data: certs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async downloadCertificate(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const certId = req.params.id;
      
      const htmlContent = await SecurityService.generateCertificate(certId, userId);
      
      // Send as an HTML file download or just render it inline
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
