/**
 * Release-candidate pricing decision (PRICING_RELEASE_CANDIDATE=on only).
 *
 * 1. VERIFIED: an exact allowlisted variant + route + measured condition is
 *    priced by the existing verified candidates (no logic duplicated here).
 * 2. MANUAL_INSPECTION_REQUIRED: condition classes where the legacy engine
 *    was shown to materially overpay (docs/RELEASE_CANDIDATE_2026-10-03.md,
 *    RC_POLICY below) get no instant binding price outside the allowlist.
 * 3. LEGACY: everything else keeps the legacy engine (with the accessory
 *    basis of lib/pricing/accessoryBasis.ts), flagged UNVALIDATED_LEGACY.
 */
import xiaomiFixture from '../../scripts/pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json';
import onePlusFixture from '../../scripts/pricing/fixtures/oneplus-display-verified-development-2026-10-02.json';
import glassFixture from '../../scripts/pricing/fixtures/fresh-glass-ab-development-2026-10-02.json';
import type { DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import { calculateXiaomiWorkbookEvidenceCandidate } from './xiaomiWorkbookEvidenceCandidate';
import { calculateOnePlusDisplayEvidenceCandidate } from './onePlusDisplayEvidenceCandidate';
import { calculateFreshGlassEvidenceCandidate } from './freshGlassEvidenceCandidate';
import { workbookStorageIdentity, type WorkbookRoute } from './teamWorkbookCandidate';

/** Production references drift a little from the Get Upto captured at
 * calibration (2026-10-02 read-only check: 0 to -2,990, -80 Nord, -240 Open).
 * Verified rupee deductions do not depend on Get Upto; baselines are Get Upto
 * formulas. Beyond this band the clean baseline needs remeasurement. */
export const REFERENCE_DOMAIN_TOLERANCE = 0.05;

export type ConditionClass = 'clean' | 'screenScratch' | 'crackedGlass' | 'display' | 'nonOriginalScreen' | 'touch' | 'body' | 'functional' | 'combined';

/** Legacy engine vs 171 verified observations (captured Get Upto, observed
 * routes): manual when median overpay > 10% or a single-class case overpays
 * > Rs 2,000 for reasons other than a known bad route label (Xiaomi 14 Ultra). */
export const RC_POLICY: Record<ConditionClass, 'LEGACY' | 'MANUAL_INSPECTION_REQUIRED'> = {
  clean: 'LEGACY',             // median +3.0%
  screenScratch: 'LEGACY',     // median +3.5%, max +13.2%
  crackedGlass: 'LEGACY',      // median +2.4% (max +40.5% is Xiaomi 14 Ultra's suspect route)
  body: 'LEGACY',              // median +7.7%, max +22.9%, no case > Rs 2,000
  functional: 'LEGACY',        // median -2.8%, max +0.2%
  display: 'MANUAL_INSPECTION_REQUIRED',           // median +93.7%, max +171.4% (Open +20,053)
  nonOriginalScreen: 'MANUAL_INSPECTION_REQUIRED', // median +13.0%, up to +3,500
  touch: 'MANUAL_INSPECTION_REQUIRED',             // n=3, max +52.8%
  combined: 'MANUAL_INSPECTION_REQUIRED',          // up to +16,070 (+2,870%)
};

export function conditionClass(d: DiagnosticsType): ConditionClass {
  const c: ConditionClass[] = [];
  const has = (v: string | null | undefined, re: RegExp) => re.test(v ?? '');
  if (d.touch === false) c.push('touch');
  if (d.originalScreen === false) c.push('nonOriginalScreen');
  if (has(d.screenLines, /visible line|faded/i) || has(d.screenSpots, /large|1-2|3 or more/i) || has(d.screenDiscoloration, /major|minor/i)) c.push('display');
  if (has(d.screenCondition, /cracked|glass broken/i)) c.push('crackedGlass');
  else if (has(d.screenCondition, /scratch|outside display/i) && !has(d.screenCondition, /^no /i)) c.push('screenScratch');
  if (has(d.bodyScratches, /more than 2|1-2/i) || has(d.bodyDents, /major|1-2|more than 2/i) || has(d.bodyPanel, /missing|cracked|broken/i) ||
    (has(d.bodyBent, /bent|curved|loose|gap/i) && !has(d.bodyBent, /not bent/i))) c.push('body');
  if ((d.hardware ?? []).length) c.push('functional');
  return c.length === 0 ? 'clean' : c.length === 1 ? c[0] : 'combined';
}

const GLASS_ROUTE = { boxMode: 'ASKED', chargerMode: 'NOT_ASKED', sPenMode: 'NOT_ASKED', eSimMode: 'NOT_ASKED' } as const;
const ALL_NOT_ASKED: QuestionnaireSemantics = { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' };
const mode = (m: string) => (m === 'ASKED' ? 'ASKED' : 'NOT_ASKED') as 'ASKED' | 'NOT_ASKED';
type Spec = { brand: string; model: string; storage: string; validatedGetUpto: number; route: WorkbookRoute; family: 'xiaomi-workbook' | 'oneplus-display' | 'fresh-glass'; evidence: string };
/** Verified candidates cover only routes where S Pen/eSIM are not asked. */
const notAsked = (m: string, id: string): 'NOT_ASKED' => {
  if (m !== 'NOT_ASKED') throw new Error(`releaseCandidate: ${id} ASKED is outside the verified candidate routes`);
  return 'NOT_ASKED';
};
const workbookRoute = (m: Record<string, string>): WorkbookRoute => ({
  semantics: { warrantyMode: mode(m.warranty), billMode: mode(m.validBill), ageMode: mode(m.mobileAge) },
  boxMode: mode(m.box), chargerMode: mode(m.charger), sPenMode: notAsked(m.sPen, 'sPen'), eSimMode: notAsked(m.eSim, 'eSim') });
export const RC_ALLOWLIST: readonly Spec[] = [
  ...xiaomiFixture.specs.map((s) => ({ brand: 'Xiaomi', model: s.model, storage: s.storage, validatedGetUpto: s.validatedGetUpto, route: workbookRoute(s.modes),
    family: 'xiaomi-workbook' as const, evidence: `${xiaomiFixture.version}#${s.deviceId}` })),
  ...onePlusFixture.specs.map((s) => ({ brand: s.brand, model: s.model, storage: s.storage, validatedGetUpto: s.validatedGetUpto, route: workbookRoute(s.modes),
    family: 'oneplus-display' as const, evidence: `${onePlusFixture.version}#${s.deviceId}` })),
  ...glassFixture.specs.map((s) => ({ brand: s.brand, model: s.model, storage: s.storage, validatedGetUpto: s.validatedGetUpto,
    route: { semantics: ALL_NOT_ASKED, ...GLASS_ROUTE } as WorkbookRoute, family: 'fresh-glass' as const, evidence: `fresh-glass#${s.deviceId}` })),
];

export type ReleaseCandidateOutcome =
  | { kind: 'VERIFIED'; cashifyConditionEquivalent: number; rule: string; evidence: string; conditionClass: ConditionClass }
  | { kind: 'MANUAL_INSPECTION_REQUIRED'; reason: string; conditionClass: ConditionClass }
  | { kind: 'LEGACY'; flag: 'UNVALIDATED_LEGACY'; reason: string; conditionClass: ConditionClass };

export function releaseCandidateOutcome(input: {
  device: { brand: string; model: string; storage: string }; reference: number; referenceFresh: boolean;
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback' }; diagnostics: DiagnosticsType; now: Date;
}): ReleaseCandidateOutcome {
  const { device, reference, questionnaire: q } = input;
  // Questions Cashify does not ask carry no answer (as calculateFhoneifyPrice treats them).
  const d: DiagnosticsType = { ...input.diagnostics,
    ...(q.warrantyMode === 'NOT_ASKED' ? { warranty: null } : {}), ...(q.billMode === 'NOT_ASKED' ? { validBill: null } : {}),
    ...(q.ageMode === 'NOT_ASKED' ? { mobileAge: null } : {}) };
  const cls = conditionClass(d);
  const spec = RC_ALLOWLIST.find((s) => s.brand === device.brand && s.model === device.model &&
    workbookStorageIdentity(s.storage) === workbookStorageIdentity(device.storage));
  let miss = 'Variant not in the verified allowlist';
  if (spec) {
    const r = spec.route.semantics;
    if (q.source !== 'profile' || q.warrantyMode !== r.warrantyMode || q.billMode !== r.billMode || q.ageMode !== r.ageMode) miss = 'Stored questionnaire profile differs from the verified route';
    else if (!input.referenceFresh) miss = 'Reference is not fresh';
    else if (Math.abs(reference - spec.validatedGetUpto) > REFERENCE_DOMAIN_TOLERANCE * spec.validatedGetUpto) miss = 'Reference outside the validated Get Upto domain';
    else {
      const args = { brand: device.brand, model: device.model, storage: spec.storage, reference, diagnostics: d, route: spec.route, now: input.now };
      const result = spec.family === 'xiaomi-workbook' ? calculateXiaomiWorkbookEvidenceCandidate(args)
        : spec.family === 'oneplus-display' ? calculateOnePlusDisplayEvidenceCandidate(args) : calculateFreshGlassEvidenceCandidate(args);
      if (result.supported) return { kind: 'VERIFIED', cashifyConditionEquivalent: result.quote.cashifyConditionEquivalent, rule: spec.family, evidence: spec.evidence, conditionClass: cls };
      miss = result.reason;
    }
  }
  if (RC_POLICY[cls] === 'MANUAL_INSPECTION_REQUIRED') return { kind: 'MANUAL_INSPECTION_REQUIRED', reason: `${cls}: ${miss}`, conditionClass: cls };
  return { kind: 'LEGACY', flag: 'UNVALIDATED_LEGACY', reason: miss, conditionClass: cls };
}
