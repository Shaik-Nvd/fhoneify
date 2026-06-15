import { Response } from 'express';
import * as walletService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

export function getWalletDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const balance = walletService.getBalance(req.user.id);
    const history = walletService.getHistory(req.user.id);
    const coupons = walletService.getActiveCoupons();
    const user = walletService.getUserData(req.user.id);
    
    return res.json({ 
      success: true, 
      data: { 
        balance, 
        history, 
        coupons, 
        referralCode: user?.referralCode 
      } 
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getWalletDashboard controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function getHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const history = walletService.getHistory(req.user.id);
    return res.json({ success: true, data: history });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getHistory wallet controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
