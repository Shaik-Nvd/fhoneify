/** Research-only candidate. No production caller imports this module.
 * Development source: xiaomi-independent-2026-10-01, comparable clean,
 * non-original-display and charging quotes. Those observations are no longer
 * holdouts for this candidate; its combination predictions require new data.
 * Retentions are conditional on warranty No, GST bill Yes, box only, age and
 * eSIM not asked. They do not identify a general warranty or accessory rule.
 */
import { calculateXiaomiPrice, type DiagnosticsType, type PricingResult } from '../pricingCalculator';
import type { QuestionnaireSemantics } from './questionnaireSemantics';
import { xiaomiInrDeductions } from './inrDeductionTables';
import type { InrDeductionConfig } from './inrDeductions';

export const XIAOMI_EVIDENCE_CANDIDATE_VERSION = 'xiaomi-research/2026-10-01-v1';
export const XIAOMI_CANDIDATE_DEVELOPMENT = [
  { model: 'Xiaomi 17', storage: '12 GB/512 GB', reference: 57750, clean: 42720,
    localDisplay: 9000, charging: 1500, sourceIds: ['C0-V1', 'V1', 'V3', 'CLOSE-V1'] },
  { model: 'Xiaomi Redmi Turbo 5', storage: '12 GB/256 GB', reference: 26750, clean: 19640,
    localDisplay: 4000, charging: 1000, sourceIds: ['V7', 'V2', 'V4', 'CLOSE-V7'] },
] as const;

/** Fresh copies preserve the cached active tables, anchors and combination
 * semantics. Only the two observed defect amounts and conditional baseline
 * change; there is no extrapolation to other devices or display faults. */
export function xiaomiEvidenceCandidateConfig(): InrDeductionConfig {
  const active = xiaomiInrDeductions();
  const config: InrDeductionConfig = {
    ...active, enabled: true, version: XIAOMI_EVIDENCE_CANDIDATE_VERSION,
    groups: {}, modelGroups: {}, tierGroups: [], warrantyRetention: {},
  };
  for (const evidence of XIAOMI_CANDIDATE_DEVELOPMENT) {
    const key = evidence.model.toLowerCase();
    const original = active.groups[active.modelGroups[key]];
    config.groups[key] = { ...original, screen: { ...original.screen, localDisplay: evidence.localDisplay },
      body: { ...original.body }, functional: { ...original.functional, charging: evidence.charging } };
    config.modelGroups[key] = key;
    config.warrantyRetention[key] = (evidence.clean - original.box) / evidence.reference;
  }
  return config;
}

export type XiaomiCandidateResult = { supported: true; version: string; quote: PricingResult } |
  { supported: false; reason: string };

/** Fail closed outside the preregistered experimental scope. Never silently
 * fall back to the active formula and present that as a candidate prediction.
 * NOT_ASKED is required explicitly for age; UNKNOWN does not prove absence. */
export function calculateXiaomiEvidenceCandidate(
  model: string, storage: string, reference: number, d: DiagnosticsType, semantics: QuestionnaireSemantics,
  eSimNotAsked: boolean,
): XiaomiCandidateResult {
  const match = XIAOMI_CANDIDATE_DEVELOPMENT.find(e => e.model === model && e.storage === storage);
  if (!match) return { supported: false, reason: 'No development evidence for this exact model and variant' };
  if (!(reference > 0) || !Number.isFinite(reference)) return { supported: false, reason: 'Invalid Get Upto reference' };
  if (semantics.warrantyMode !== 'ASKED' || semantics.billMode !== 'ASKED' || semantics.ageMode !== 'NOT_ASKED' || !eSimNotAsked ||
    d.warranty !== false || d.validBill !== true || d.mobileAge != null || d.eSim != null) {
    return { supported: false, reason: 'Warranty, bill, age or eSIM route differs from development evidence' };
  }
  const accessories = [...new Set(d.accessories ?? [])];
  if (accessories.length !== 1 || accessories[0] !== 'box' || d.calls !== true || d.touch !== true || typeof d.originalScreen !== 'boolean') {
    return { supported: false, reason: 'Only a working phone with box only is supported' };
  }
  if ((d.defects ?? []).length || [d.screenCondition,d.screenSpots,d.screenLines,d.screenDiscoloration,
    d.bodyScratches,d.bodyDents,d.bodyPanel,d.bodyBent].some(value => value != null && value !== '') ||
    (d.hardware ?? []).some(fault => fault !== 'charging')) {
    return { supported: false, reason: 'Only non-original display and charging faults, singly or combined, are experimental candidates' };
  }
  return { supported: true, version: XIAOMI_EVIDENCE_CANDIDATE_VERSION,
    quote: calculateXiaomiPrice(model, reference, d, semantics, xiaomiEvidenceCandidateConfig()) };
}
