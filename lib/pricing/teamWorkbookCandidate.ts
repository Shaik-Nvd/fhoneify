/** Disabled research calculation. Workbook values are tester reports without
 * dates/traces; coefficients are development evidence, never live quotes.
 * Clean retention uses Get Upto; damage uses additive measured rupee costs.
 * Two-defect profiles derive the incremental body cost from C minus B.
 */
import fixture from '../../scripts/pricing/fixtures/team-workbook-development-2026-10-02.json';
import { applyCompetitorUplift, type DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics, QuestionMode } from './questionnaireSemantics';

export const TEAM_WORKBOOK_CANDIDATE_VERSION = fixture.version + '-input-guards-v2';
export const TEAM_WORKBOOK_GLASS_TO_SCRATCH_RATIO = fixture.sharedGlass.ratio;
/** Unit whitespace only: 128 GB and 128GB have the same exact storage.
 * RAM/storage numbers, units and separators are never discarded. */
export const workbookStorageIdentity = (storage: string) => storage.replace(/\s+/g, '').toLowerCase();
export type WorkbookComponent = 'screen_heavy' | 'glass_cracked' | 'display_lines' | 'display_spots' |
  'original_screen' | 'touch' | 'charging' | 'back_camera' | 'body_heavy' | 'body_dents';
export interface WorkbookRoute {
  semantics: QuestionnaireSemantics;
  boxMode: QuestionMode; chargerMode: QuestionMode;
  sPenMode: QuestionMode; eSimMode: QuestionMode;
}
export type WorkbookCandidateResult = { supported: false; reason: string } | {
  supported: true; version: string; evidenceQuality: 'TESTER_REPORTED_UNVERIFIED';
  baselineKind: 'get_upto_calibrated_retention' | 'measured_clean_control';
  cleanBaseline: number; componentDeduction: number; components: readonly string[];
  quote: { cashifyConditionEquivalent: number; fhoneifyPrice: number };
};
const signature = (values: readonly string[]) => [...new Set(values)].sort().join('|');
const clean = (value: string | null | undefined, allowed: readonly string[]) => value == null || value === '' || allowed.includes(value);

/** Shared repair-anchor hypothesis frozen before six whole-device holdouts.
 * It requires a heavy-scratch anchor, NOT an observed cracked-glass price.
 * This helper alone is not an application quote or a clean-baseline model.
 */
export function estimateWorkbookGlassLoss(heavyScratchLoss: number): number | null {
  if (!Number.isFinite(heavyScratchLoss) || heavyScratchLoss <= 0) return null;
  return Math.round(heavyScratchLoss * TEAM_WORKBOOK_GLASS_TO_SCRATCH_RATIO / 10) * 10;
}

export function workbookComponents(d: DiagnosticsType): WorkbookComponent[] | null {
  const components: WorkbookComponent[] = [];
  if (d.calls !== true) return null;
  if (d.touch === false) components.push('touch'); else if (d.touch !== true) return null;
  if (d.originalScreen === false) components.push('original_screen'); else if (d.originalScreen !== true) return null;
  if (d.screenCondition === 'More than 2 scratches on screen') components.push('screen_heavy');
  else if (d.screenCondition === 'Screen cracked/ glass broken') components.push('glass_cracked');
  else if (!clean(d.screenCondition, ['No scratches on screen'])) return null;
  if (d.screenLines === 'Visible line(s) on display') components.push('display_lines');
  else if (!clean(d.screenLines, ['No line(s) on Display'])) return null;
  if (d.screenSpots === 'Large/ heavy visible spots on screen') components.push('display_spots');
  else if (!clean(d.screenSpots, ['No spots on screen'])) return null;
  if (!clean(d.screenDiscoloration, ['No Discoloration'])) return null;
  if (d.bodyScratches === 'More than 2 scratches') components.push('body_heavy');
  else if (!clean(d.bodyScratches, ['No scratches'])) return null;
  if (d.bodyDents === 'Major dent(s) or more than 2') components.push('body_dents');
  else if (!clean(d.bodyDents, ['No dents'])) return null;
  if (!clean(d.bodyPanel, ['No defect on side or back panel']) || !clean(d.bodyBent, ['Phone not bent'])) return null;
  for (const f of new Set(d.hardware ?? [])) {
    if (f !== 'charging' && f !== 'back_camera') return null;
    components.push(f);
  }
  // Parent selections are meaningful; an unrelated parent is unsupported.
  const parents = new Set<string>();
  if (components.some(c => ['screen_heavy', 'glass_cracked'].includes(c))) parents.add('screen_scratch');
  if (components.some(c => ['display_lines', 'display_spots'].includes(c))) parents.add('screen_spot');
  if (components.some(c => ['body_heavy', 'body_dents'].includes(c))) parents.add('body_scratch');
  if ((d.defects ?? []).some(f => !parents.has(f))) return null;
  return components;
}

export function calculateTeamWorkbookCandidate(input: {
  brand: string; model: string; storage: string; reference: number;
  diagnostics: DiagnosticsType; route: WorkbookRoute;
  baseline?: { kind: 'measured_clean_control'; cleanSellingPrice: number };
}): WorkbookCandidateResult {
  const reject = (reason: string): WorkbookCandidateResult => ({ supported: false, reason });
  const spec = fixture.specs.find(s => s.brand === input.brand && s.model === input.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(input.storage));
  if (!spec) return reject('No development evidence for this exact variant; held-out models remain outside scope');
  const { diagnostics: d, route: r } = input;
  if (!Number.isFinite(input.reference) || input.reference <= 0) return reject('Invalid Get Upto reference');
  if ((r.semantics.warrantyMode === 'ASKED' ? d.warranty !== false : r.semantics.warrantyMode !== 'NOT_ASKED' || d.warranty != null) ||
    (r.semantics.billMode === 'ASKED' ? d.validBill !== true : r.semantics.billMode !== 'NOT_ASKED' || d.validBill != null) ||
    (r.semantics.ageMode === 'ASKED' ? d.mobileAge !== 'above11' : r.semantics.ageMode !== 'NOT_ASKED' || d.mobileAge != null) ||
    r.eSimMode !== 'NOT_ASKED' || d.eSim != null) return reject('Questionnaire regime differs or is unknown');
  const accessories = new Set(d.accessories ?? []);
  for (const [id, mode, flag] of [['box', r.boxMode, d.box], ['charger', r.chargerMode, d.charger], ['spen', r.sPenMode, undefined]] as const) {
    if (mode === 'ASKED' ? !accessories.has(id) || flag === false : mode !== 'NOT_ASKED' || accessories.has(id) || flag != null) {
      return reject('Accessories must match the workbook Yes-if-asked regime; absent differs from NOT_ASKED');
    }
  }
  if ([...accessories].some(a => !['box', 'charger', 'spen'].includes(a))) return reject('Unverified accessory');
  const components = workbookComponents(d);
  if (!components || !spec.supportedProfiles.some(p => signature(p) === signature(components))) return reject('Unmeasured condition, combination or interaction');
  const costs: Partial<Record<WorkbookComponent, number>> = spec.componentCosts;
  let deduction = 0;
  for (const c of components) {
    const amount = c === 'glass_cracked' ? estimateWorkbookGlassLoss(costs.screen_heavy ?? NaN) : costs[c];
    if (amount == null || !Number.isFinite(amount) || amount < 0) return reject('No measured component anchor');
    deduction += amount;
  }
  const baselineKind = input.baseline ? 'measured_clean_control' : 'get_upto_calibrated_retention';
  const baseline = input.baseline?.cleanSellingPrice ?? input.reference * spec.cleanRetention;
  const value = Math.round((baseline - deduction) / 10) * 10;
  if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(value) || value <= 0) return reject('No validated positive-price outcome');
  return { supported: true, version: TEAM_WORKBOOK_CANDIDATE_VERSION, evidenceQuality: 'TESTER_REPORTED_UNVERIFIED',
    baselineKind, cleanBaseline: baseline, componentDeduction: deduction, components,
    quote: { cashifyConditionEquivalent: value, fhoneifyPrice: applyCompetitorUplift(input.reference, value) } };
}
