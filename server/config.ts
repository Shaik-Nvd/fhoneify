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

/**
 * Origins the browser app is actually served from. These are public hostnames,
 * not secrets, and they are baked in deliberately: production was shipping with
 * FRONTEND_URL still set to the render.yaml placeholder
 * "https://your-vercel-domain.vercel.app", so the API sent no
 * Access-Control-Allow-Origin to the real site and EVERY browser call
 * (OTP, quotes, leads, admin login) was blocked by CORS. Configuration can add
 * origins, but the live storefronts no longer depend on it being right.
 */
const KNOWN_PRODUCTION_ORIGINS = [
  'https://www.fhoneify.in',
  'https://fhoneify.in',
  'https://www.fhoneify.com',
  'https://fhoneify.com',
  'https://fhoneify-j7vf.vercel.app',
];

/** Placeholder values that must never be treated as a real allowlist. */
const PLACEHOLDER_ORIGINS = ['https://your-vercel-domain.vercel.app'];

function resolveCorsOrigins(): string[] {
  const configured = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .filter((o) => !PLACEHOLDER_ORIGINS.includes(o));

  return Array.from(new Set([...configured, ...(NODE_ENV === 'production' ? KNOWN_PRODUCTION_ORIGINS : [])]));
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
  CORS_ORIGINS: resolveCorsOrigins(),
};

export default config;
