/** Disabled local preview adapter. Never produces candidate quote tokens or
 * accepts lead prices. The existing authoritative service remains untouched.
 */
import fixture from '../../scripts/pricing/fixtures/team-workbook-development-2026-10-02.json';
import ownerCorrection from '../../scripts/pricing/fixtures/owner-correction-2026-10-02.json';
import type { PricingService } from './pricingService';
import { parseDiagnostics } from './diagnostics';
import { customerPayout } from './payout';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import { createXiaomiResearchQuoteService, type XiaomiResearchRouteEvidence } from './xiaomiResearchQuoteService';
import { calculateTeamWorkbookCandidate, workbookStorageIdentity, type WorkbookRoute } from './teamWorkbookCandidate';

export interface WorkbookRouteEvidence extends WorkbookRoute {
  brand: string; model: string; storage: string; observedAt: string; evidenceSha256: string;
}
export function createTeamWorkbookResearchQuoteService(service: PricingService, options: {
  enabled?: boolean; now?: () => Date; routeEvidence?: readonly WorkbookRouteEvidence[];
  xiaomiRouteEvidence?: readonly XiaomiResearchRouteEvidence[];
  /** Explicit development fixture switch; outputs remain provisional. This
   * does not turn undated tester measurements into verified calibration. */
  allowUnverifiedDevelopmentCalibration?: boolean;
} = {}) {
  const xiaomi = createXiaomiResearchQuoteService(service, { enabled: options.enabled, now: options.now, routeEvidence: options.xiaomiRouteEvidence });
  async function quote(input: Parameters<PricingService['quote']>[0]) {
    const current = await service.quote(input);
    if (!options.enabled || !current.ok) return current;
    if (current.device.brand === 'Xiaomi') return xiaomi.quote(input);
    if (!['Apple', 'Samsung'].includes(current.device.brand)) return current;
    const unsupported = (reasonCode: string, message: string) => ({ ok: false as const,
      code: 'RESEARCH_CANDIDATE_UNSUPPORTED' as const, researchOnly: true as const, reasonCode, message });
    const spec = fixture.specs.find(s => s.brand === current.device.brand && s.model === current.device.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(current.device.storage));
    if (!spec) return unsupported('UNVALIDATED_VARIANT', 'No fitting data for this exact variant; whole-device holdouts are not calibration');
    if (spec.cleanRetention > 1) return unsupported('REFERENCE_BASELINE_INCONSISTENT', 'Reported clean price exceeds reported Get Upto; preserve the anomaly until reference and baseline provenance are verified');
    // Owner correction: tester A was warranty Yes, B/C warranty No. Without a
    // matched warranty-No clean control, A-minus-B/C may mix warranty with damage.
    if (ownerCorrection.devices.find(d => d.deviceId === spec.deviceId)?.verdict === 'UNCERTAIN') {
      return unsupported('OWNER_CORRECTION_UNMATCHED_WARRANTY', 'Tester A/B/C warranty answers differ and no matched warranty-No clean control exists; component costs are not isolated damage deductions');
    }
    const at = options.now?.() ?? new Date();
    const fresh = (timestamp: string | null) => timestamp !== null && Number.isFinite(Date.parse(timestamp)) &&
      Date.parse(timestamp) <= at.getTime() && classifyFreshness({ lastVerifiedAt: timestamp, consecutiveFailures: 0, now: at }) === 'fresh';
    const route = options.routeEvidence?.find(r => r.brand === current.device.brand && r.model === current.device.model && workbookStorageIdentity(r.storage) === workbookStorageIdentity(current.device.storage));
    if (!route || !fresh(route.observedAt) || !/^[a-f0-9]{64}$/.test(route.evidenceSha256) || current.questionnaire.source !== 'profile' ||
      (['warrantyMode', 'billMode', 'ageMode'] as const).some(k => current.questionnaire[k] !== route.semantics[k])) {
      return unsupported('QUESTIONNAIRE_NOT_VERIFIED', 'Fresh exact-variant conditional route and accessory/eSIM visibility are required');
    }
    if (current.internal.baseSource !== 'reference_repository' || current.internal.referenceSource !== 'cashify' ||
      current.referenceStatus !== 'fresh' || !fresh(current.referenceLastVerifiedAt)) {
      return unsupported('REFERENCE_NOT_VERIFIED', 'Fresh Cashify repository Get Upto required; snapshots and legacy migration are insufficient');
    }
    if (current.internal.cashifyGetUptoReference !== spec.validatedGetUpto) {
      return unsupported('REFERENCE_OUTSIDE_VALIDATED_DOMAIN', 'Changed Get Upto requires a new clean-retention observation');
    }
    // Import/mtime is not an observation date. Do not invent a calibration
    // TTL by assigning the workbook import date to unknown historical quotes.
    if (!options.allowUnverifiedDevelopmentCalibration) {
      return unsupported('CALIBRATION_UNVERIFIED', 'Tester calibration has no observation date or traces; only explicit provisional development previews are permitted');
    }
    const parsed = parseDiagnostics(input.diagnostics);
    if (!parsed.ok) return unsupported('INVALID_DIAGNOSTICS', parsed.error);
    const candidate = calculateTeamWorkbookCandidate({ ...current.device, reference: current.internal.cashifyGetUptoReference,
      diagnostics: parsed.value, route });
    if (!candidate.supported) return unsupported('UNVALIDATED_CONDITION', candidate.reason);
    return { ok: true as const, researchOnly: true as const, provisional: true as const, device: current.device,
      pricingVersion: candidate.version, ...candidate.quote, startingPrice: current.startingPrice,
      customerPayout: customerPayout(candidate.quote.fhoneifyPrice, false), baselineKind: candidate.baselineKind,
      evidenceQuality: candidate.evidenceQuality, calibrationObservedAt: null,
      componentDeduction: candidate.componentDeduction, cleanBaseline: candidate.cleanBaseline,
      inputs: { reference: current.internal.cashifyGetUptoReference, questionnaire: current.questionnaire, route } };
  }
  return { quote, getUpto: service.getUpto };
}
