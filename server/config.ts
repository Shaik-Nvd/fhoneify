import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

// JWT_SECRET signs every access/refresh/admin token in the system. There is no
// safe default: a hardcoded fallback here would mean anyone who reads this
// source file can forge a valid token for any user, including admin. Fail
// fast instead, in every environment - a silently-wrong secret is worse than
// a crash at boot.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required and has no default. ' +
    'Set it before starting the server (see .env.example).'
  );
}

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export default config;
