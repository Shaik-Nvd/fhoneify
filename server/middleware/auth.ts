import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { users, User, redis } from '../data';
import logger from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Auth failed: missing or invalid authorization header');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('Auth failed: empty token');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check blacklist (for logged out tokens)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      logger.warn('Auth failed: token is blacklisted');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string; role: string };
    
    // Find user in db/in-memory users list
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      logger.warn(`Auth failed: user with id ${decoded.userId} not found`);
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Auth failed: invalid token verification');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn({ userId: req.user?.id }, 'Forbidden: user is not admin');
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}
