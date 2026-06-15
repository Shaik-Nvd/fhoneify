import { Response } from 'express';
import * as notificationsService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

export function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const data = notificationsService.getUserNotifications(req.user.id);
    return res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getNotifications controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
