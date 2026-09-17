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

    // Verify JWT (signature + expiry), pinned to the algorithm we sign with.
    const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as {
      userId: string;
      role: string;
      tokenType?: string;
    };

    // A refresh token lives 7 days; an access token 15 minutes. Accepting a
    // refresh token here would let it act as a week-long access token and
    // bypass the access-token expiry entirely.
    if (decoded.tokenType === 'refresh') {
      logger.warn('Auth failed: refresh token presented as an access token');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Find user in db/in-memory users list
    let user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      // KNOWN LIMITATION: business state (including the users list) currently
      // lives only in an in-process array (server/data.ts), so it does not
      // survive a restart, redeploy, or a second serverless instance. When
      // that happens, we cannot verify this user's real account status.
      //
      // We deliberately do NOT trust the JWT's `role` claim to restore
      // elevated access here - a token's role claim reflects the role at
      // ISSUE time, not now, and treating it as authoritative would let a
      // demoted/disabled/deleted admin keep admin access forever via an
      // old token. A restored session is always re-created at the lowest
      // privilege level; anything requiring elevated access must be
      // re-authenticated once persistent, database-backed users exist
      // (see PRODUCTION_READINESS_AUDIT.md P0-8 / P1-1).
      user = {
        id: decoded.userId,
        phone: 'restored-session', // Phone is not stored in JWT, so we mock it
        role: 'buyer',
        email: null,
      };
      users.push(user);
      logger.warn({ userId: decoded.userId }, 'User not found in store; restored session at buyer-level access only');
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
