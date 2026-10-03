if (process.env.NODE_ENV === 'production') {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright';
}
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import config from './config';
import logger from './lib/logger';

// Import all module routers
import authRouter from './modules/auth/routes';
import quoteRouter from './modules/quote/routes';
import { pricingStatus } from './modules/quote/pricing';
import sellRouter from './modules/sell/routes';
import buyRouter from './modules/buy/routes';
import adminRouter from './modules/admin/routes';
import paymentsRouter from './modules/payments/routes';
import notificationsRouter from './modules/notifications/routes';
import searchRouter from './modules/search/routes';
import reviewsRouter from './modules/reviews/routes';
import walletRouter from './modules/wallet/routes';
import repairRouter from './modules/repair/routes';
import { storesRouter } from './modules/stores/routes';
import { inventoryRouter } from './modules/inventory/routes';
import { cmsRouter } from './modules/cms/routes';
import { aiRouter } from './modules/ai/routes';
import { securityRouter } from './modules/security/routes';
import { b2bRouter } from './modules/b2b/routes';
import { externalRouter } from './modules/external/routes';
import { diagnosticsRouter } from './modules/diagnostics/routes';
import { logisticsRouter } from './modules/logistics/routes';
import webhookRouter from './modules/webhook/routes';
import { referencePricingRouter } from './modules/referencePricing/routes';
import {
  disconnectReferencePriceRepository,
  getReferenceStoreHealth,
  warmReferencePriceRepository,
} from '../lib/referencePricing/getStore';
import prisma from './lib/prisma';

const app = express();

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url }, `HTTP Request: ${req.method} ${req.url}`);
  
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({ method: req.method, url: req.url, status: res.statusCode, durationMs: duration }, `HTTP Response: ${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Security headers
app.use(helmet());

// CORS: explicit allowlist only. In production, CORS_ORIGINS (or FRONTEND_URL)
// must be set - an unset allowlist in production means no cross-origin
// requests are allowed rather than silently allowing every origin.
if (config.IS_PRODUCTION && config.CORS_ORIGINS.length === 0) {
  logger.error('CORS_ORIGINS/FRONTEND_URL is not set in production; cross-origin requests will be rejected');
} else {
  // Log the effective allowlist at boot: a wrong/placeholder value here blocks
  // every browser call, and that used to be invisible until customers noticed.
  logger.info({ corsOrigins: config.CORS_ORIGINS }, 'CORS allowlist active');
}
app.use(cors({
  origin: config.IS_PRODUCTION
    ? config.CORS_ORIGINS
    : (config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : true), // dev: allow any origin only when none configured
  credentials: true,
}));
app.use(express.json());

// Rate limits key on req.ip. Behind Render's proxy, req.ip is the proxy's
// address unless Express trusts it - every customer would then share one
// limit bucket. TRUST_PROXY_HOPS is the number of proxies in front of the app.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? (config.IS_PRODUCTION ? 1 : 0)));

// Rate limiting. This is in-process only (per server instance) - once there
// are multiple instances behind a load balancer this needs to move to a
// Redis-backed limiter (see PRODUCTION_READINESS_AUDIT.md P1-4).
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Tunable so the automated auth/OTP suites can drive the real endpoints
  // without tripping the production limit. Defaults to the production value;
  // there is no way to disable it entirely.
  limit: Math.max(5, Number(process.env.AUTH_RATE_LIMIT ?? 20)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later.' },
});
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Serve static quote test page
const quoteTestHtmlPath = path.join(__dirname, '../public/quote-test.html');
const quoteTestHtml = fs.existsSync(quoteTestHtmlPath)
  ? fs.readFileSync(quoteTestHtmlPath, 'utf8')
  : '<html><body>Quote test</body></html>';

app.get('/quote', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(quoteTestHtml);
});
app.get('/quote-test.html', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(quoteTestHtml);
});

// Health check endpoint. `ok` means the process is serving; the reference
// store is reported separately and truthfully, so a degraded database is
// never presented as healthy.
app.get('/health', (_req: Request, res: Response) => {
  const store = getReferenceStoreHealth();
  res.json({
    ok: true,
    referenceStore: store.backend,
    database: store.backend === 'postgres' ? (store.connected ? 'connected' : 'unavailable') : 'not_configured',
    databaseCheckedAt: store.checkedAt,
    // Deployed commit (set by Render) and the active pricing mode, so a deploy
    // or release switch is verified from responses, not assumed. No secrets.
    commit: process.env.RENDER_GIT_COMMIT ? process.env.RENDER_GIT_COMMIT.slice(0, 12) : null,
    pricing: pricingStatus,
  });
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/sell', sellRouter);
app.use('/api/buy', buyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/repair', repairRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/stores', storesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/security', securityRouter);
app.use('/api/b2b', b2bRouter);
app.use('/api/external', externalRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/admin/reference-prices', referencePricingRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // A malformed or oversized JSON body is a bad request, not a server fault.
  // Do not log the body - on auth routes it can contain credentials.
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return res.status(400).json({ success: false, error: 'Malformed request body' });
  }
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled Application Error');
  res.status(500).json({ success: false, error: 'Internal server error' });
});

/**
 * Warm the database connections before accepting traffic, so the first
 * quote is not the request that pays for connecting (which could trip the
 * tight reference-lookup timeout and degrade to the snapshot needlessly).
 *
 * A failed warm-up is logged, not fatal: the server still starts and quotes
 * fall back to the snapshot exactly as designed until the database recovers.
 */
async function start() {
  const store = await warmReferencePriceRepository();
  if (store.backend !== 'postgres') {
    logger.info('Reference prices are file-backed; no database warm-up required');
  } else if (store.connected) {
    logger.info('Reference-price database connection warmed and ready');
  } else {
    logger.error({ err: store.error }, 'Reference-price database warm-up FAILED; quotes will use the snapshot fallback until it recovers');
  }

  // The application database (leads, users) - same rationale, non-fatal.
  try {
    await prisma.$connect();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Application database warm-up failed; it will reconnect on demand');
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`Phoneify Modular API Server running on http://localhost:${config.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down; draining connections');
    server.close(async () => {
      await disconnectReferencePriceRepository();
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
    // Never hang forever on a stuck socket.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();

export default app;
