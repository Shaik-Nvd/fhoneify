/** Fresh verified workbook-regime research only. Existing Xiaomi candidates,
 * active engine tables/caps and pending catalog variants remain unchanged. */
import fixture from '../../scripts/pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json';
import { applyCompetitorUplift, type DiagnosticsType } from '../pricingCalculator';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import { workbookComponents, workbookStorageIdentity, type WorkbookComponent, type WorkbookRoute } from './teamWorkbookCandidate';

export const XIAOMI_WORKBOOK_CANDIDATE_VERSION = fixture.version;
const signature = (v: readonly string[]) => [...new Set(v)].sort().join('|');
export function verifiedNotAskedCleanBaseline(reference: number, route: WorkbookRoute): number | null {
  if (!Number.isFinite(reference) || reference <= 20 || route.semantics.warrantyMode !== 'NOT_ASKED' ||
    route.semantics.billMode !== 'NOT_ASKED' || route.semantics.ageMode !== 'NOT_ASKED' || route.eSimMode !== 'NOT_ASKED' ||
    route.boxMode !== 'ASKED' || route.chargerMode !== 'ASKED' || route.sPenMode !== 'NOT_ASKED') return null;
  return Math.round((reference - 20) / 10) * 10;
}
export function calculateXiaomiWorkbookEvidenceCandidate(input: {
  model: string; storage: string; reference: number; diagnostics: DiagnosticsType; route: WorkbookRoute; now?: Date;
  baseline?: { kind: 'measured_clean_control'; cleanSellingPrice: number };
}) {
  const reject = (reason: string) => ({ supported: false as const, reason });
  const spec = fixture.specs.find(s => s.model === input.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(input.storage));
  if (!spec) return reject('Exact variant is not in fresh verified development scope');
  const at = input.now ?? new Date();
  if (Date.parse(spec.calibratedAt) > at.getTime() || classifyFreshness({ lastVerifiedAt: spec.calibratedAt, consecutiveFailures: 0, now: at }) !== 'fresh') return reject('Calibration is stale or future-dated');
  const d = input.diagnostics, r = input.route, m = spec.modes;
  if (r.semantics.warrantyMode !== m.warranty || r.semantics.billMode !== m.validBill || r.semantics.ageMode !== m.mobileAge ||
    r.eSimMode !== m.eSim || r.boxMode !== m.box || r.chargerMode !== m.charger || r.sPenMode !== m.sPen) return reject('Conditional route differs from the verified observation block');
  if ((m.warranty === 'ASKED' ? d.warranty !== false : d.warranty != null) ||
    (m.validBill === 'ASKED' ? d.validBill !== true : d.validBill != null) || d.mobileAge != null || d.eSim != null ||
    d.box === false || d.charger === false || signature(d.accessories ?? []) !== 'box|charger') return reject('Answers differ from verified Yes-if-asked and NOT_ASKED regime');
  const components = workbookComponents(d);
  if (!components || !spec.supportedProfiles.some(p => signature(p) === signature(components))) return reject('Unmeasured fault, interaction or combination');
  if (!Number.isFinite(input.reference) || input.reference <= 0) return reject('Invalid Get Upto');
  const costs: Partial<Record<WorkbookComponent, number>> = spec.componentCosts;
  let deduction = 0;
  for (const c of new Set(components)) {
    const cost = costs[c]; if (cost == null || cost < 0 || !Number.isFinite(cost)) return reject('Unmeasured repair component'); deduction += cost;
  }
  const baseline = input.baseline?.cleanSellingPrice ?? (spec.baseline.kind === 'reference_minus_observed_offset'
    ? verifiedNotAskedCleanBaseline(input.reference, r) : input.reference * spec.baseline.retention!);
  if (baseline == null || !Number.isFinite(baseline) || baseline <= 0) return reject('No validated clean baseline');
  const value = Math.round((baseline - deduction) / 10) * 10;
  if (!Number.isFinite(value) || value <= 0) return reject('No validated positive priced outcome');
  return { supported: true as const, version: XIAOMI_WORKBOOK_CANDIDATE_VERSION, evidenceQuality: 'VERIFIED_TRACE_SCREENSHOT' as const,
    baselineKind: input.baseline ? 'measured_clean_control' as const : spec.baseline.kind,
    cleanBaseline: baseline, componentDeduction: deduction,
    quote: { cashifyConditionEquivalent: value, fhoneifyPrice: applyCompetitorUplift(input.reference, value) } };
}
