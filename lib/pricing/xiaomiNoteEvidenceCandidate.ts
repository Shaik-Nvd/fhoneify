/** Opt-in research only: six measured component losses, not a severe-price
 * lookup. Development: N-OPEN and N-PORT/SPEAKER/FRONT/BACK/WIFI/FINGER.
 * Four combinations were frozen before observation; see the report/fixture.
 */
import { applyCompetitorUplift, COMMON_BONUSES, type DiagnosticsType } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import type { XiaomiCandidateResult } from './xiaomiEvidenceCandidate';

export const XIAOMI_NOTE_CANDIDATE_VERSION = 'xiaomi-note-research/2026-10-01-v1';
export const XIAOMI_NOTE_IDENTITY = { model: 'Xiaomi Redmi Note 15 Pro Plus 5G', storage: '12 GB/512 GB' } as const;
export const XIAOMI_NOTE_CALIBRATION_AT = '2026-10-01T17:39:32.261Z';
export const XIAOMI_NOTE_VALIDATED_REFERENCE = 29250;
// Conditional retention learned from the opening control after subtracting
// the inherited box term. Not a universal age rule or a stored live quote.
export const XIAOMI_NOTE_CLEAN_RETENTION = 21400 / XIAOMI_NOTE_VALIDATED_REFERENCE;
export const XIAOMI_NOTE_COMPONENT_COSTS: Readonly<Record<string, number>> = Object.freeze({
  charging: 1000, speaker: 400, front_camera: 2000,
  back_camera: 3200, wifi: 8770, fingerprint: 5850,
});

const combinations = [
  [], ...Object.keys(XIAOMI_NOTE_COMPONENT_COSTS).map(f => [f]),
  ['front_camera', 'back_camera'], ['speaker', 'charging'],
  ['front_camera', 'back_camera', 'wifi', 'speaker'],
  ['front_camera', 'back_camera', 'wifi', 'speaker', 'charging'],
  ['front_camera', 'back_camera', 'wifi', 'speaker', 'charging', 'fingerprint'],
];
const signature = (faults: readonly string[]) => [...new Set(faults)].sort().join('|');
const verifiedCombinations = new Set(combinations.map(signature));

export type NoteBaseline =
  { kind: 'get_upto'; reference: number } |
  { kind: 'measured_clean_control'; reference: number; cleanSellingPrice: number };

export function calculateXiaomiNoteEvidenceCandidate(input: {
  model: string; storage: string; diagnostics: DiagnosticsType;
  questionnaire: QuestionnaireSemantics; eSimNotAsked: boolean; baseline: NoteBaseline;
}): XiaomiCandidateResult {
  const { model, storage, diagnostics: d, questionnaire: q, baseline } = input;
  const unsupported = (reason: string): XiaomiCandidateResult => ({ supported: false, reason });
  if (model !== XIAOMI_NOTE_IDENTITY.model || storage !== XIAOMI_NOTE_IDENTITY.storage) {
    return unsupported('Note evidence supports only the exact 12 GB/512 GB variant');
  }
  if (q.warrantyMode !== 'ASKED' || q.billMode !== 'ASKED' || q.ageMode !== 'NOT_ASKED' ||
    !input.eSimNotAsked || d.warranty !== false || d.validBill !== true || d.mobileAge != null || d.eSim != null) {
    return unsupported('Note warranty-No, bill-Yes, age/eSIM-NOT_ASKED regime is required');
  }
  const accessories = [...new Set(d.accessories ?? [])];
  if (accessories.length !== 1 || accessories[0] !== 'box' || d.box === false || d.charger === true ||
    d.calls !== true || d.touch !== true || d.originalScreen !== true) {
    return unsupported('Only working calls/touch, original screen and box-only accessories are verified');
  }
  if ((d.defects ?? []).length || [d.screenCondition, d.screenSpots, d.screenLines, d.screenDiscoloration,
    d.bodyScratches, d.bodyDents, d.bodyPanel, d.bodyBent].some(v => v != null && v !== '') ||
    !verifiedCombinations.has(signature(d.hardware ?? []))) {
    return unsupported('Unmeasured faults, combinations and display/body interactions are unsupported');
  }
  if (!Number.isFinite(baseline.reference) || baseline.reference <= 0) return unsupported('Invalid Get Upto');
  const clean = baseline.kind === 'measured_clean_control'
    ? baseline.cleanSellingPrice : baseline.reference * XIAOMI_NOTE_CLEAN_RETENTION + COMMON_BONUSES.box;
  if (!Number.isFinite(clean) || clean <= 0 || clean > baseline.reference) return unsupported('Invalid clean baseline');
  const deduction = [...new Set(d.hardware ?? [])].reduce((sum, f) => sum + XIAOMI_NOTE_COMPONENT_COSTS[f], 0);
  // Evidence supports full component addition for these exact profiles. No
  // legacy aggregate cap or dead-phone floor is applied within this candidate.
  // The active engine and its cap/floor remain untouched. No-price/negative
  // outcomes are never converted into zero, scrap, or an invented quote.
  const value = Math.round((clean - deduction) / 10) * 10;
  if (!Number.isFinite(value) || value <= 0) return unsupported('No validated positive price at this baseline');
  return { supported: true, version: XIAOMI_NOTE_CANDIDATE_VERSION,
    quote: { cashifyConditionEquivalent: value, fhoneifyPrice: applyCompetitorUplift(baseline.reference, value) } };
}
