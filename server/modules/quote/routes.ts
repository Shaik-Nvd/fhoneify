import { RequestHandler, Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import rateLimit from 'express-rate-limit';
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

// A stale token in localStorage must never stop a customer booking a pickup,
// so lead creation only *uses* a valid token (for coupon identity) and
// otherwise carries on without a user, exactly as it did before.
const optionalAuth: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) return next();
  const failOpen: any = { status: () => failOpen, json: () => { next(); return failOpen; } };
  requireAuth(req as any, failOpen, next);
};
const couponLimiter = limiter(envLimit('QUOTE_COUPON_RATE_LIMIT', 30));

router.get('/devices', ctrl.listDevices);
router.get('/coupon/offer', couponLimiter, requireAuth as RequestHandler, ctrl.couponOffer);
router.post('/coupon/validate', couponLimiter, requireAuth as RequestHandler, ctrl.couponValidate);
router.post('/', pricingLimiter, ctrl.createQuote);
router.post('/price', pricingLimiter, ctrl.priceQuote);
router.post('/cashify-price', marketPriceLimiter, ctrl.getCashifyPrice);
router.post('/leads', leadLimiter, optionalAuth, ctrl.createLead);
router.get('/:id', ctrl.getQuote);

export default router;
