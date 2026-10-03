/** Disabled release decision over preserved research calculators. Actual dated
 * route evidence and exact fresh Cashify reference are required. */
import xiaomiFixture from '../../scripts/pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json';
import onePlusFixture from '../../scripts/pricing/fixtures/oneplus-display-verified-development-2026-10-02.json';
import glassFixture from '../../scripts/pricing/fixtures/fresh-glass-ab-development-2026-10-02.json';
import { COMMON_FUNCTIONAL_PENALTIES, type DiagnosticsType } from '../pricingCalculator';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
import { calculateXiaomiWorkbookEvidenceCandidate } from './xiaomiWorkbookEvidenceCandidate';
import { calculateOnePlusDisplayEvidenceCandidate } from './onePlusDisplayEvidenceCandidate';
import { calculateFreshGlassEvidenceCandidate } from './freshGlassEvidenceCandidate';
import { workbookStorageIdentity } from './teamWorkbookCandidate';

export type ConditionClass = 'clean' | 'screenScratch' | 'crackedGlass' | 'display' | 'nonOriginalScreen' | 'touch' | 'body' | 'functional' | 'combined' | 'unknown';
export const RC_POLICY: Record<ConditionClass, 'LEGACY' | 'MANUAL_INSPECTION_REQUIRED'> = {
  clean: 'LEGACY', screenScratch: 'LEGACY', crackedGlass: 'LEGACY', body: 'LEGACY', functional: 'LEGACY',
  display: 'MANUAL_INSPECTION_REQUIRED', nonOriginalScreen: 'MANUAL_INSPECTION_REQUIRED',
  touch: 'MANUAL_INSPECTION_REQUIRED', combined: 'MANUAL_INSPECTION_REQUIRED', unknown: 'MANUAL_INSPECTION_REQUIRED',
};

/** Exact UI options; count individual faults, never just categories. */
export function conditionClass(d: DiagnosticsType): ConditionClass {
  if (d.calls !== true || d.touch == null || d.originalScreen == null) return 'unknown';
  if ((d.mobileAge != null && !['below3', '3to6', '6to11', 'above11', 'Below 3 months', '3-6 months', '6-11 months', 'Above 11 months'].includes(d.mobileAge)) ||
    (d.eSim != null && !['Single eSIM', 'Dual eSIM'].includes(d.eSim))) return 'unknown';
  const faults: ConditionClass[] = [];
  if (!d.touch) faults.push('touch');
  if (!d.originalScreen) faults.push('nonOriginalScreen');
  const fields: [string | null, string, Record<string, ConditionClass>][] = [
    [d.screenCondition, 'No scratches on screen', { 'More than 2 scratches on screen': 'screenScratch', '1-2 scratches on screen': 'screenScratch', 'Screen cracked/ glass broken': 'crackedGlass', 'Chipped/cracked outside display area': 'crackedGlass' }],
    [d.screenLines, 'No line(s) on Display', { 'Visible line(s) on display': 'display', 'Display faded along edges': 'display' }],
    [d.screenSpots, 'No spots on screen', { 'Large/ heavy visible spots on screen': 'display', '1-2 minor spots on screen': 'display', '3 or more minor spots on screen': 'display' }],
    [d.screenDiscoloration, 'No Discoloration', { 'Major Discoloration': 'display', 'Minor Discoloration': 'display' }],
    [d.bodyScratches, 'No scratches', { 'More than 2 scratches': 'body', '1-2 scratches': 'body' }],
    [d.bodyDents, 'No dents', { 'Major dent(s) or more than 2': 'body', '1-2 minor dents': 'body' }],
    [d.bodyPanel, 'No defect on side or back panel', { 'Cracked/ broken side or back panel': 'body', 'Missing side or back panel': 'body' }],
    [d.bodyBent, 'Phone not bent', { 'Bent/ curved panel': 'body', 'Loose screen (Gap in screen and body)': 'body' }],
  ];
  for (const [value, noFault, options] of fields) {
    if (value == null || value === noFault) continue;
    if (!options[value]) return 'unknown';
    faults.push(options[value]);
  }
  const checks: [string, boolean][] = [
    ['screen_scratch', !!d.screenCondition && d.screenCondition !== 'No scratches on screen'],
    ['screen_spot', [d.screenLines, d.screenSpots, d.screenDiscoloration].some((v, i) => v != null && v !== fields[i + 1][1])],
    ['body_scratch', [d.bodyScratches, d.bodyDents].some((v, i) => v != null && v !== fields[i + 4][1])],
    ['panel_missing', [d.bodyPanel, d.bodyBent].some((v, i) => v != null && v !== fields[i + 6][1])],
  ];
  if ((d.defects ?? []).some(p => !checks.some(([id, selected]) => id === p && selected))) return 'unknown';
  for (const fault of new Set(d.hardware ?? [])) {
    if (!Object.prototype.hasOwnProperty.call(COMMON_FUNCTIONAL_PENALTIES, fault)) return 'unknown';
    faults.push('functional');
  }
  if (d.hardware.includes('battery_service') && d.hardware.includes('battery_health')) return 'unknown';
  if ((d.accessories ?? []).some(a => !['box', 'charger', 'bill', 'spen'].includes(a)) ||
    (d.box === false && d.accessories.includes('box')) || (d.charger === false && d.accessories.includes('charger'))) return 'unknown';
  return faults.length === 0 ? 'clean' : faults.length === 1 ? faults[0] : 'combined';
}

export const RC_ALLOWLIST = [
  ...xiaomiFixture.specs.map(s => ({ brand: 'Xiaomi', ...s, family: 'xiaomi-workbook' as const, evidence: `${xiaomiFixture.version}#${s.deviceId}` })),
  ...onePlusFixture.specs.map(s => ({ ...s, family: 'oneplus-display' as const, evidence: `${onePlusFixture.version}#${s.deviceId}` })),
  ...glassFixture.specs.map(s => ({ ...s, family: 'fresh-glass' as const, evidence: `${glassFixture.version}#${s.deviceId}` })),
];
export type ReleaseCandidateOutcome =
  | { kind: 'VERIFIED'; cashifyConditionEquivalent: number; rule: string; evidence: string; conditionClass: ConditionClass }
  | { kind: 'MANUAL_INSPECTION_REQUIRED'; reason: string; conditionClass: ConditionClass }
  | { kind: 'LEGACY'; flag: 'UNVALIDATED_LEGACY'; reason: string; conditionClass: ConditionClass };

export function releaseCandidateOutcome(input: {
  device: { brand: string; model: string; storage: string }; reference: number; referenceFresh: boolean;
  referenceSource: string | null; baseSource: string; referenceLastVerifiedAt: string | null;
  referenceExact: boolean;
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback'; observedAt?: string; status?: string };
  routeEvidence?: readonly WorkbookRouteEvidence[]; diagnostics: DiagnosticsType; now: Date;
}): ReleaseCandidateOutcome {
  const cls = conditionClass(input.diagnostics);
  const manual = (reason: string): ReleaseCandidateOutcome => ({ kind: 'MANUAL_INSPECTION_REQUIRED', reason, conditionClass: cls });
  if (cls === 'unknown') return manual('Incomplete, conflicting or unrecognized diagnostics');
  const { device, questionnaire: q } = input;
  // The new exact-variant clean control exposes a material baseline error
  // even with correct NOT_ASKED ownership routing. Reference/profile refresh
  // must not enable legacy fallback until its baseline regime is validated.
  if (device.brand === 'Xiaomi' && device.model === 'Xiaomi 14 Ultra' &&
    workbookStorageIdentity(device.storage) === workbookStorageIdentity('16 GB/512 GB')) return manual('Ultra clean baseline requires separately validated pricing');
  // Measured Note single hardware losses expose material legacy overpayments;
  // its earlier additive research regime is not activated by this release.
  if (device.brand === 'Xiaomi' && device.model === 'Xiaomi Redmi Note 15 Pro Plus 5G' &&
    workbookStorageIdentity(device.storage) === workbookStorageIdentity('12 GB/512 GB') && input.diagnostics.hardware.length) return manual('Note functional pricing requires the separately validated additive regime');
  const matches = (s: { brand: string; model: string; storage: string }) => s.brand === device.brand && s.model === device.model && workbookStorageIdentity(s.storage) === workbookStorageIdentity(device.storage);
  const spec = RC_ALLOWLIST.find(matches);
  if (!spec) return RC_POLICY[cls] === 'MANUAL_INSPECTION_REQUIRED' ? manual(`Unvalidated ${cls} condition`) :
    { kind: 'LEGACY', flag: 'UNVALIDATED_LEGACY', reason: 'Variant outside measured release scope', conditionClass: cls };
  const fresh = (t: string | null | undefined) => !!t && Number.isFinite(input.now.getTime()) && Number.isFinite(Date.parse(t)) && Date.parse(t) <= input.now.getTime() && classifyFreshness({ lastVerifiedAt: t, consecutiveFailures: 0, now: input.now }) === 'fresh';
  const route = input.routeEvidence?.find(matches);
  if (!route || !fresh(route.observedAt) || !/^[a-f0-9]{64}$/.test(route.evidenceSha256) || q.source !== 'profile' || q.status !== 'OK' || !fresh(q.observedAt) ||
    (['warrantyMode', 'billMode', 'ageMode'] as const).some(k => q[k] !== route.semantics[k])) return manual('Fresh exact-variant route evidence and compatible stored questionnaire required');
  if (!input.referenceFresh || !input.referenceExact || input.referenceSource !== 'cashify' || input.baseSource !== 'reference_repository' || !fresh(input.referenceLastVerifiedAt)) return manual('Fresh exact Cashify repository reference required');
  // A fixed historical Get Upto amount is a guard for one-point retention
  // baselines. Offset baselines are explicitly expressed against the live
  // Cashify reference and were measured as clean Selling = Get Upto - 20 on
  // the exact route. Keep exact/fresh reference and route checks above; do not
  // pin that supported formula to the old observed amount.
  const referenceRelativeOffset = (spec.family === 'xiaomi-workbook' || spec.family === 'oneplus-display') &&
    spec.baseline.kind === 'reference_minus_observed_offset';
  if (input.reference !== spec.validatedGetUpto && !referenceRelativeOffset) {
    return manual('Changed reference domain requires baseline revalidation');
  }
  if (spec.family === 'fresh-glass' && spec.cleanRetention > 1) return manual('Clean-above-Get-Upto headline compatibility requires explicit production approval');
  // The UI derives above11 for warranty-No; it is not a selected age answer.
  const d = { ...input.diagnostics };
  if (route.semantics.warrantyMode === 'ASKED' && d.warranty === false && route.semantics.ageMode === 'NOT_ASKED' && d.mobileAge === 'above11') d.mobileAge = null;
  const args = { ...device, reference: input.reference, diagnostics: d, route, now: input.now };
  const result = spec.family === 'xiaomi-workbook' ? calculateXiaomiWorkbookEvidenceCandidate(args) : spec.family === 'oneplus-display' ? calculateOnePlusDisplayEvidenceCandidate(args) : calculateFreshGlassEvidenceCandidate(args);
  if (!result.supported) return manual(result.reason);
  return { kind: 'VERIFIED', cashifyConditionEquivalent: result.quote.cashifyConditionEquivalent, rule: spec.family, evidence: spec.evidence, conditionClass: cls };
}
