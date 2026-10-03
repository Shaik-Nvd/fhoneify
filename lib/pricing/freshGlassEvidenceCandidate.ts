/** Retrospective runtime implementation of the prospectively frozen shared
 * glass-deduction rule. New exact-variant baseline/anchor use A/B only.
 * C remains a preserved conditional holdout; full runtime baseline needs
 * future independent validation. No current clean Selling runtime input. */
import fixture from '../../scripts/pricing/fixtures/fresh-glass-ab-development-2026-10-02.json';
import { applyCompetitorUplift, type DiagnosticsType } from '../pricingCalculator';
import { isReleaseEvidenceCurrent } from './releaseEvidenceAge';
import { estimateWorkbookGlassLoss, workbookComponents, workbookStorageIdentity, type WorkbookRoute } from './teamWorkbookCandidate';

export const FRESH_GLASS_CANDIDATE_VERSION = fixture.version;
export function calculateFreshGlassEvidenceCandidate(input: {
  brand: string; model: string; storage: string; reference: number;
  diagnostics: DiagnosticsType; route: WorkbookRoute; now?: Date;
}) {
  const reject = (reason: string) => ({ supported: false as const, reason });
  const spec = fixture.specs.find(s => s.brand === input.brand && s.model === input.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(input.storage));
  if (!spec) return reject('Only two exact fresh A/B-calibrated variants are supported');
  const at = input.now ?? new Date();
  if (!isReleaseEvidenceCurrent(spec.calibratedAt, at)) return reject('Calibration is stale or future-dated');
  const d = input.diagnostics, r = input.route;
  if (r.semantics.warrantyMode !== 'NOT_ASKED' || r.semantics.billMode !== 'NOT_ASKED' || r.semantics.ageMode !== 'NOT_ASKED' ||
    r.eSimMode !== 'NOT_ASKED' || r.boxMode !== 'ASKED' || r.chargerMode !== 'NOT_ASKED' || r.sPenMode !== 'NOT_ASKED' ||
    d.warranty != null || d.validBill != null || d.mobileAge != null || d.eSim != null) return reject('Exact verified NOT_ASKED routing is required; null is not an answer No');
  if (d.box === false || d.charger != null || [...new Set(d.accessories ?? [])].sort().join('|') !== 'box') return reject('Box present and charger NOT_ASKED are required');
  const components = workbookComponents(d);
  if (!components || components.length > 1 || (components.length === 1 && !['screen_heavy', 'glass_cracked'].includes(components[0]))) return reject('Only clean, heavy screen scratches and cracked glass with working touch are supported');
  if (!Number.isFinite(input.reference) || input.reference <= 0) return reject('Invalid Get Upto');
  const baseline = input.reference * spec.cleanRetention;
  const deduction = components[0] === 'glass_cracked' ? estimateWorkbookGlassLoss(spec.heavyScratchLoss) : components[0] === 'screen_heavy' ? spec.heavyScratchLoss : 0;
  if (deduction == null) return reject('Invalid scratch repair anchor');
  const price = Math.round((baseline - deduction) / 10) * 10;
  if (!Number.isFinite(price) || price <= 0) return reject('No validated positive priced outcome');
  // Fresh trace evidence legitimately has Apple clean Selling > Get Upto.
  // Preserve the observed conditional baseline rather than clamping it.
  // Headline compatibility is exposed for a later activation decision.
  return { supported: true as const, version: FRESH_GLASS_CANDIDATE_VERSION,
    baselineKind: 'get_upto_calibrated_retention' as const, cleanBaseline: baseline, componentDeduction: deduction,
    cleanMayExceedGetUpto: spec.cleanRetention > 1, evidenceQuality: 'VERIFIED_A_B_TRACE_SCREENSHOT' as const,
    evaluationRole: 'RETROSPECTIVE_RUNTIME_IMPLEMENTATION_OF_FROZEN_CONDITIONAL_RULE' as const,
    quote: { cashifyConditionEquivalent: price, fhoneifyPrice: applyCompetitorUplift(input.reference, price) } };
}
