/** Opt-in readiness gate around the preserved v1 research candidate.
 * Never imported by production. No clean Selling price is a runtime input.
 * The weekly reference interface supplies Get Upto, not a condition baseline.
 * Its freshness cannot refresh the separately learned retention coefficient.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import type { ResolvedReference } from './engine';
import type { QuestionMode, QuestionnaireSemantics } from './questionnaireSemantics';
import { calculateXiaomiEvidenceCandidate, type XiaomiCandidateResult } from './xiaomiEvidenceCandidate';
import { calculateXiaomiNoteEvidenceCandidate, XIAOMI_NOTE_IDENTITY, XIAOMI_NOTE_CALIBRATION_AT,
  XIAOMI_NOTE_VALIDATED_REFERENCE } from './xiaomiNoteEvidenceCandidate';
import { classifyFreshness } from '../referencePricing/freshnessPolicy';

export type XiaomiApplicationCandidateResult = XiaomiCandidateResult |
  { supported: false; reason: string; reasonCode: 'UNVALIDATED_CONDITION' | 'REFERENCE_NOT_VERIFIED' |
    'REFERENCE_OUTSIDE_VALIDATED_DOMAIN' | 'QUESTIONNAIRE_NOT_VERIFIED' | 'CALIBRATION_NOT_CURRENT' };

// Domains contain observed Get Upto references, not stored clean quotations.
// Changed references require new validation; no extrapolation range is guessed.
const VALIDATED_REFERENCES: Record<string, readonly number[]> = {
  'Xiaomi 17|12 GB/512 GB': [57750],
  'Xiaomi Redmi Turbo 5|12 GB/256 GB': [26750],
  [`${XIAOMI_NOTE_IDENTITY.model}|${XIAOMI_NOTE_IDENTITY.storage}`]: [XIAOMI_NOTE_VALIDATED_REFERENCE],
};

export function calculateXiaomiApplicationCandidate(input: {
  model: string; storage: string; reference: ResolvedReference | null;
  diagnostics: DiagnosticsType;
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback' };
  eSimMode: QuestionMode;
  now?: Date;
}): XiaomiApplicationCandidateResult {
  const { model, storage, reference, diagnostics, questionnaire, eSimMode } = input;
  const at = input.now ?? new Date();
  // Preserve v1 and its support boundaries; Note has its own explicit rule.
  const isNote = model === XIAOMI_NOTE_IDENTITY.model;
  const scope = isNote ? calculateXiaomiNoteEvidenceCandidate({ model, storage, diagnostics, questionnaire,
    eSimNotAsked: eSimMode === 'NOT_ASKED', baseline: { kind: 'get_upto', reference: reference?.cashifyGetUptoReference ?? 1 } })
    : calculateXiaomiEvidenceCandidate(model, storage, reference?.cashifyGetUptoReference ?? 1,
      diagnostics, questionnaire, eSimMode === 'NOT_ASKED');
  if (!scope.supported) return { supported: false, reasonCode: 'UNVALIDATED_CONDITION', reason: scope.reason };
  if (diagnostics.box === false || diagnostics.charger === true) {
    return { supported: false, reasonCode: 'UNVALIDATED_CONDITION', reason: 'Accessory flags contradict the verified box-only regime' };
  }
  if (questionnaire.source !== 'profile' || eSimMode !== 'NOT_ASKED') {
    return { supported: false, reasonCode: 'QUESTIONNAIRE_NOT_VERIFIED', reason: 'Verified route metadata is required; fallback and null answers do not prove NOT_ASKED' };
  }
  if (!reference || reference.source !== 'reference_repository' || reference.referenceSource !== 'cashify' ||
    !reference.referenceLastVerifiedAt || reference.referenceStatus !== 'fresh' ||
    !Number.isFinite(Date.parse(reference.referenceLastVerifiedAt)) || Date.parse(reference.referenceLastVerifiedAt) > at.getTime() ||
    classifyFreshness({ lastVerifiedAt: reference.referenceLastVerifiedAt, consecutiveFailures: 0, now: at }) !== 'fresh') {
    return { supported: false, reasonCode: 'REFERENCE_NOT_VERIFIED', reason: 'Requires a fresh Cashify Get Upto repository record; legacy and undated snapshots are research estimates' };
  }
  if (!VALIDATED_REFERENCES[`${model}|${storage}`]?.includes(reference.cashifyGetUptoReference)) {
    return { supported: false, reasonCode: 'REFERENCE_OUTSIDE_VALIDATED_DOMAIN', reason: 'This Get Upto was not independently validated; the refresh does not remeasure clean retention' };
  }
  // Reference freshness does not renew the condition calibration. Use the
  // existing freshness policy, with separate provenance, to avoid permanent
  // reuse of an old clean retention even if Get Upto happens to be unchanged.
  const calibratedAt = isNote ? XIAOMI_NOTE_CALIBRATION_AT : '2026-10-01T15:02:57.985Z';
  if (Date.parse(calibratedAt) > at.getTime() ||
    classifyFreshness({ lastVerifiedAt: calibratedAt, consecutiveFailures: 0, now: at }) !== 'fresh') {
    return { supported: false, reasonCode: 'CALIBRATION_NOT_CURRENT', reason: 'Condition evidence is not current; a fresh Get Upto cannot renew it' };
  }
  return scope;
}
