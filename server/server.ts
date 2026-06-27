import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Bypass strict SSL for local development (fixes UNABLE_TO_VERIFY_LEAF_SIGNATURE from proxy/antivirus)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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

// Configure CORS and JSON parsing
app.use(cors());
app.use(express.json());

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

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled Application Error');
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  logger.info(`Phoneify Modular API Server running on http://localhost:${config.PORT}`);
  logger.info('Pre-seeded phone credentials: Admin (9000000000) | Seller (9988776655) | Buyer (9876543210)');
});

export default app;
