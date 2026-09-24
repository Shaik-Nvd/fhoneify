/**
 * Cashify questionnaire semantics, learned per MODEL (not per RAM/storage
 * variant) from Cashify's public "Get Exact Value" questionnaire.
 *
 * Every question is tri-state. "Cashify does not ask warranty" (NOT_ASKED) is
 * a different state from "the customer answered warranty = No": for a model
 * Cashify never asks about, its quote applies no warranty/age deduction at
 * all - the public Get Upto already reflects the model's age. UNKNOWN means
 * we have not (successfully) looked, and must never be read as false.
 */
import type { QuestionnaireSemantics } from '../../pricing/questionnaireSemantics';

export type { QuestionMode, QuestionnaireSemantics } from '../../pricing/questionnaireSemantics';

export type QuestionnaireProfileStatus =
  | 'OK'
  | 'PARSE_FAILED'
  | 'FETCH_FAILED'
  | 'NOT_FOUND'
  | 'VARIANT_MISMATCH';

export interface CashifyQuestionnaireProfile extends QuestionnaireSemantics {
  modelKey: string;
  brand: string;
  model: string;
  questionLabels: string[];
  status: QuestionnaireProfileStatus;
  statusDetail: string | null;
  sourceUrl: string | null;
  variantsChecked: number;
  parserVersion: string;
  observedAt: string;
}

/** One model's identity. Variants of the same model share a key. */
export function questionnaireModelKey(device: { brand: string; model: string }): string {
  return `${device.brand}|${device.model}`.trim().toLowerCase().replace(/\s+/g, ' ');
}
