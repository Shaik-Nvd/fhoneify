import crypto from 'crypto';
import config from '../../config';
import logger from '../../lib/logger';
import { createPricingService } from '../../../lib/pricing/pricingService';
import { getReferencePriceRepository } from '../../../lib/referencePricing/getStore';

// A dedicated QUOTE_SIGNING_SECRET lets quote tokens be rotated without
// logging every user out. Without one, a key is derived from JWT_SECRET
// with domain separation, so a quote token can never be replayed as a JWT
// (or vice versa).
const signingSecret =
  process.env.QUOTE_SIGNING_SECRET ||
  crypto.createHmac('sha256', config.JWT_SECRET).update('fhoneify:quote-token:v1').digest('hex');

if (!process.env.QUOTE_SIGNING_SECRET && config.IS_PRODUCTION) {
  logger.warn('QUOTE_SIGNING_SECRET is not set; deriving the quote-token key from JWT_SECRET');
}

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const pricingService = createPricingService({
  repository: getReferencePriceRepository(),
  signingSecret,
  tokenTtlSeconds: positiveInt(process.env.QUOTE_TOKEN_TTL_MINUTES, 24 * 60) * 60,
  strictReferenceMode: process.env.QUOTE_STRICT_REFERENCE_MODE === 'true',
  referenceLookupTimeoutMs: positiveInt(process.env.REFERENCE_PRICE_LOOKUP_TIMEOUT_MS, 1500),
  logger,
});
