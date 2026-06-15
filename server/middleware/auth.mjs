/**
 * server/middleware/auth.mjs
 * Express middleware for authentication and role-based access control.
 */
import { sessions, users } from '../data.mjs';

/**
 * Resolves the Bearer token from the Authorization header to a user object.
 * Returns null if missing or invalid.
 */
function resolveUser(req) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  return users.find((u) => u.id === session.userId) || null;
}

/**
 * requireAuth — attaches req.user or responds 401.
 */
export function requireAuth(req, res, next) {
  const user = resolveUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

/**
 * requireAdmin — must be chained after requireAuth.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}

/**
 * optionalAuth — attaches req.user if a valid token is present, never 401s.
 */
export function optionalAuth(req, res, next) {
  req.user = resolveUser(req) || null;
  next();
}
