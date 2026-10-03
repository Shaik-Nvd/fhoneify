import crypto from 'crypto';
import config from '../../config';
import logger from '../../lib/logger';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION } from '../../../lib/pricing/pricingService';
import { PRICING_ENGINE_VERSION } from '../../../lib/pricing/engine';
import { loadReleaseRouteEvidence } from '../../../lib/pricing/releaseRouteEvidence';
import { resolvePricingReleaseConfig } from '../../../lib/pricing/releaseConfig';
import { isReleaseEvidenceCurrent, RELEASE_EVIDENCE_MAX_AGE_DAYS } from '../../../lib/pricing/releaseEvidenceAge';
import { getQuestionnaireProfileStore, getReferencePriceRepository } from '../../../lib/referencePricing/getStore';

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

export const pricingRelease = resolvePricingReleaseConfig();
logger.info({ pricingMode: pricingRelease.mode, source: pricingRelease.source, routeEvidence: pricingRelease.routeEvidenceFile ? 'configured' : 'none', configError: pricingRelease.error ?? null }, 'Pricing release configuration');

/** A missing or invalid evidence file must not crash the API or fall back to
 * legacy prices: release mode then has no verified routes and every quote
 * returns inspection, while the rest of the API keeps serving. */
function releaseRouteEvidence() {
  if (pricingRelease.mode !== 'release-candidate') return [];
  try {
    const rows = loadReleaseRouteEvidence(pricingRelease.routeEvidenceFile ?? undefined);
    logger.info({ routes: rows.length }, 'Release route evidence loaded');
    return rows;
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Release route evidence unreadable; every release quote will require inspection');
    return [];
  }
}

const routes = releaseRouteEvidence();
/** Public, secret-free status for /health. Fresh routes are counted at
 * request time, so evidence expiry is visible rather than silently inspecting. */
export function pricingStatus(now = new Date()) {
  const fresh = routes.filter(r => isReleaseEvidenceCurrent(r.observedAt, now));
  const expiries = routes.map(r => Date.parse(r.observedAt) + RELEASE_EVIDENCE_MAX_AGE_DAYS * 86400000).filter(Number.isFinite);
  return {
    mode: pricingRelease.mode,
    source: pricingRelease.source,
    version: pricingRelease.mode === 'release-candidate' ? RELEASE_CANDIDATE_PRICING_VERSION : PRICING_ENGINE_VERSION,
    releaseRoutes: routes.length,
    freshReleaseRoutes: fresh.length,
    firstRouteExpiry: expiries.length ? new Date(Math.min(...expiries)).toISOString() : null,
  };
}

export const pricingService = createPricingService({
  repository: getReferencePriceRepository(),
  signingSecret,
  tokenTtlSeconds: positiveInt(process.env.QUOTE_TOKEN_TTL_MINUTES, 24 * 60) * 60,
  strictReferenceMode: process.env.QUOTE_STRICT_REFERENCE_MODE === 'true',
  referenceLookupTimeoutMs: positiveInt(process.env.REFERENCE_PRICE_LOOKUP_TIMEOUT_MS, 1500),
  questionnaireStore: getQuestionnaireProfileStore(),
  // Legacy unless the env switch or the reviewed config file selects release.
  pricingMode: pricingRelease.mode,
  releaseRouteEvidence: routes,
  logger,
});
