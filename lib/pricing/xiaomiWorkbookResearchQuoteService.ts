import fixture from '../../scripts/pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json';
import type { PricingService } from './pricingService';
import { parseDiagnostics } from './diagnostics';
import { customerPayout } from './payout';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import { createTeamWorkbookResearchQuoteService, type WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
import { workbookStorageIdentity } from './teamWorkbookCandidate';
import { calculateXiaomiWorkbookEvidenceCandidate } from './xiaomiWorkbookEvidenceCandidate';

/** Separate disabled-by-default fresh-evidence preview; old candidates are
 * delegated to without rewriting their source or issuing candidate tokens. */
export function createXiaomiWorkbookResearchQuoteService(service: PricingService, options: {
  enabled?: boolean; now?: () => Date; routeEvidence?: readonly WorkbookRouteEvidence[];
  fallbackOptions?: Parameters<typeof createTeamWorkbookResearchQuoteService>[1];
} = {}) {
  const fallback = createTeamWorkbookResearchQuoteService(service, { ...options.fallbackOptions, enabled: options.enabled });
  async function quote(input: Parameters<PricingService['quote']>[0]) {
    const current = await service.quote(input);
    if (!options.enabled || !current.ok) return current;
    const spec = current.device.brand === 'Xiaomi' ? fixture.specs.find(s => s.model === current.device.model &&
      workbookStorageIdentity(s.storage) === workbookStorageIdentity(current.device.storage)) : null;
    if (!spec) return fallback.quote(input);
    const reject = (reasonCode: string, message: string) => ({ ok: false as const, code: 'RESEARCH_CANDIDATE_UNSUPPORTED' as const,
      researchOnly: true as const, reasonCode, message });
    const at = options.now?.() ?? new Date();
    const fresh = (timestamp: string | null) => timestamp != null && Number.isFinite(Date.parse(timestamp)) && Date.parse(timestamp) <= at.getTime() &&
      classifyFreshness({ lastVerifiedAt: timestamp, consecutiveFailures: 0, now: at }) === 'fresh';
    const route = options.routeEvidence?.find(r => r.brand === 'Xiaomi' && r.model === current.device.model &&
      workbookStorageIdentity(r.storage) === workbookStorageIdentity(current.device.storage));
    if (!route || !fresh(route.observedAt) || !/^[a-f0-9]{64}$/.test(route.evidenceSha256) || current.questionnaire.source !== 'profile' ||
      (['warrantyMode', 'billMode', 'ageMode'] as const).some(k => route.semantics[k] !== current.questionnaire[k])) return reject('QUESTIONNAIRE_NOT_VERIFIED', 'Fresh exact-variant conditional routing evidence matching service metadata is required');
    if (current.internal.baseSource !== 'reference_repository' || current.internal.referenceSource !== 'cashify' ||
      current.referenceStatus !== 'fresh' || !fresh(current.referenceLastVerifiedAt)) return reject('REFERENCE_NOT_VERIFIED', 'Fresh Cashify repository reference is required');
    if (current.internal.cashifyGetUptoReference !== spec.validatedGetUpto) return reject('REFERENCE_OUTSIDE_VALIDATED_DOMAIN', 'Reference changes require revalidation');
    const parsed = parseDiagnostics(input.diagnostics);
    if (!parsed.ok) return reject('INVALID_DIAGNOSTICS', parsed.error);
    const result = calculateXiaomiWorkbookEvidenceCandidate({ ...current.device, reference: current.internal.cashifyGetUptoReference,
      diagnostics: parsed.value, route, now: at });
    if (!result.supported) return reject('UNVALIDATED_CONDITION_OR_CALIBRATION', result.reason);
    return { ok: true as const, researchOnly: true as const, device: current.device, pricingVersion: result.version, ...result.quote,
      startingPrice: current.startingPrice, customerPayout: customerPayout(result.quote.fhoneifyPrice, false),
      baselineKind: result.baselineKind, cleanBaseline: result.cleanBaseline, componentDeduction: result.componentDeduction,
      evidenceQuality: result.evidenceQuality, calibrationObservedAt: spec.calibratedAt };
  }
  return { quote, getUpto: service.getUpto };
}
