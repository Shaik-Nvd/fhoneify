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
}
app.use(cors({
  origin: config.IS_PRODUCTION
    ? config.CORS_ORIGINS
    : (config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : true), // dev: allow any origin only when none configured
  credentials: true,
}));
app.use(express.json());

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
  limit: 20,
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

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
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
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled Application Error');
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  logger.info(`Phoneify Modular API Server running on http://localhost:${config.PORT}`);
});

export default app;
