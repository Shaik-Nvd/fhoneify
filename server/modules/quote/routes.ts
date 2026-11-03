import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import * as ctrl from './controller';

const router = Router();

const envLimit = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

// Per-IP, in-process limits layered under the global /api limiter. Pricing is
// CPU-only but unauthenticated; leads write to the database; the live
// scraper launches a browser per call.
const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });

const pricingLimiter = limiter(envLimit('QUOTE_PRICE_RATE_LIMIT', 120));
const leadLimiter = limiter(envLimit('QUOTE_LEAD_RATE_LIMIT', 20));
const marketPriceLimiter = limiter(envLimit('QUOTE_MARKET_PRICE_RATE_LIMIT', 10));

router.get('/devices', ctrl.listDevices);
router.post('/detect-device', ctrl.detectDevice);
router.post('/', pricingLimiter, ctrl.createQuote);
router.post('/price', pricingLimiter, optionalAuth, ctrl.priceQuote);
router.post('/get-upto', pricingLimiter, ctrl.getUptoBatch);
router.post('/cashify-price', marketPriceLimiter, ctrl.getCashifyPrice);
router.post('/leads', leadLimiter, ctrl.createLead);
router.get('/my-pickups', requireAuth, ctrl.getCustomerPickups);
router.get('/:id', ctrl.getQuote);

export default router;
