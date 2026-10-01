/** Opt-in readiness gate around the preserved v1 research candidate.
 * Never imported by production. No clean Selling price is a runtime input.
 * The weekly reference interface supplies Get Upto, not a condition baseline.
 * Its freshness cannot refresh the separately learned retention coefficient.
 */
import type { DiagnosticsType } from '../pricingCalculator';
import type { ResolvedReference } from './engine';
import type { QuestionMode, QuestionnaireSemantics } from './questionnaireSemantics';
import { calculateXiaomiEvidenceCandidate, type XiaomiCandidateResult } from './xiaomiEvidenceCandidate';

export type XiaomiApplicationCandidateResult = XiaomiCandidateResult |
  { supported: false; reason: string; reasonCode: 'UNVALIDATED_CONDITION' | 'REFERENCE_NOT_VERIFIED' |
    'REFERENCE_OUTSIDE_VALIDATED_DOMAIN' | 'QUESTIONNAIRE_NOT_VERIFIED' };

// Domains contain observed Get Upto references, not stored clean quotations.
// Changed references require new validation; no extrapolation range is guessed.
const VALIDATED_REFERENCES: Record<string, readonly number[]> = {
  'Xiaomi 17|12 GB/512 GB': [57750],
  'Xiaomi Redmi Turbo 5|12 GB/256 GB': [26750],
};

export function calculateXiaomiApplicationCandidate(input: {
  model: string; storage: string; reference: ResolvedReference | null;
  diagnostics: DiagnosticsType;
  questionnaire: QuestionnaireSemantics & { source: 'profile' | 'fallback' };
  eSimMode: QuestionMode;
}): XiaomiApplicationCandidateResult {
  const { model, storage, reference, diagnostics, questionnaire, eSimMode } = input;
  // The original guard explicitly rejects Note, unverified hardware faults,
  // physical damage and warranty/accessory extensions. No fallback price.
  const scope = calculateXiaomiEvidenceCandidate(model, storage, reference?.cashifyGetUptoReference ?? 1,
    diagnostics, questionnaire, eSimMode === 'NOT_ASKED');
  if (!scope.supported) return { supported: false, reasonCode: 'UNVALIDATED_CONDITION', reason: scope.reason };
  if (questionnaire.source !== 'profile' || eSimMode !== 'NOT_ASKED') {
    return { supported: false, reasonCode: 'QUESTIONNAIRE_NOT_VERIFIED', reason: 'Verified route metadata is required; fallback and null answers do not prove NOT_ASKED' };
  }
  if (!reference || reference.source !== 'reference_repository' || reference.referenceSource !== 'cashify' ||
    !reference.referenceLastVerifiedAt || reference.referenceStatus !== 'fresh') {
    return { supported: false, reasonCode: 'REFERENCE_NOT_VERIFIED', reason: 'Requires a fresh Cashify Get Upto repository record; legacy and undated snapshots are research estimates' };
  }
  if (!VALIDATED_REFERENCES[`${model}|${storage}`]?.includes(reference.cashifyGetUptoReference)) {
    return { supported: false, reasonCode: 'REFERENCE_OUTSIDE_VALIDATED_DOMAIN', reason: 'This Get Upto was not independently validated; the refresh does not remeasure clean retention' };
  }
  return scope;
}
