/** Local research adapter over the existing quote-service interface.
 * Disabled by default; not wired into server routes. Enabled results are
 * previews, never signed candidate quotes or accepted lead prices.
 */
import type { PricingService } from './pricingService';
import { parseDiagnostics } from './diagnostics';
import { customerPayout } from './payout';
import { calculateXiaomiApplicationCandidate } from './xiaomiApplicationCandidate';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import type { QuestionMode, QuestionnaireSemantics } from './questionnaireSemantics';

export interface XiaomiResearchRouteEvidence {
  model: string; storage: string; eSimMode: QuestionMode;
  semantics: QuestionnaireSemantics; observedAt: string; evidenceSha256: string;
}

export function createXiaomiResearchQuoteService(service: PricingService, options: {
  enabled?: boolean; now?: () => Date; routeEvidence?: readonly XiaomiResearchRouteEvidence[];
} = {}) {
  async function quote(input: Parameters<PricingService['quote']>[0]) {
    const current = await service.quote(input);
    if (!options.enabled || !current.ok || current.device.brand !== 'Xiaomi') return current;
    const at = options.now?.() ?? new Date();
    const route = options.routeEvidence?.find(r => r.model === current.device.model && r.storage === current.device.storage);
    const unsupported = (reasonCode: string, message: string) => ({ ok: false as const,
      code: 'RESEARCH_CANDIDATE_UNSUPPORTED' as const, researchOnly: true as const, reasonCode, message });
    // Route evidence is a server-side research dependency, never read from
    // submitted diagnostics. The existing service does not supply eSIM mode.
    if (!route || !/^[a-f0-9]{64}$/.test(route.evidenceSha256) ||
      !Number.isFinite(Date.parse(route.observedAt)) || Date.parse(route.observedAt) > at.getTime() ||
      classifyFreshness({ lastVerifiedAt: route.observedAt, consecutiveFailures: 0, now: at }) !== 'fresh' ||
      (['warrantyMode', 'billMode', 'ageMode'] as const).some(k => route.semantics[k] !== current.questionnaire[k])) {
      return unsupported('QUESTIONNAIRE_NOT_VERIFIED', 'Fresh exact-variant route evidence matching the service profile is required');
    }
    const parsed = parseDiagnostics(input.diagnostics);
    if (!parsed.ok) return unsupported('INVALID_DIAGNOSTICS', parsed.error);
    const reference = { cashifyGetUptoReference: current.internal.cashifyGetUptoReference,
      source: current.internal.baseSource, referenceStatus: current.referenceStatus,
      referenceSource: current.internal.referenceSource, referenceLastVerifiedAt: current.referenceLastVerifiedAt };
    const candidate = calculateXiaomiApplicationCandidate({ ...current.device, reference, diagnostics: parsed.value,
      questionnaire: current.questionnaire, eSimMode: route.eSimMode, now: at });
    if (!candidate.supported) return unsupported('reasonCode' in candidate ? candidate.reasonCode : 'UNVALIDATED_CONDITION', candidate.reason);
    // Do not reuse the underlying active-engine token for a different price.
    // This adapter deliberately exposes no verifyLeadPrice method.
    return { ok: true as const, researchOnly: true as const, device: current.device,
      pricingVersion: candidate.version, ...candidate.quote, startingPrice: current.startingPrice,
      customerPayout: customerPayout(candidate.quote.fhoneifyPrice, false),
      baselineKind: 'get_upto_calibrated_retention' as const,
      inputs: { reference, questionnaire: current.questionnaire, eSimMode: route.eSimMode } };
  }
  return { quote, getUpto: service.getUpto };
}
