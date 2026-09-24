/**
 * Which questions Cashify's own questionnaire presents for a model. Shared by
 * the pricing engine, the quote page and the metadata scraper, so all three
 * read the same three states. Browser-safe: no imports.
 */
export type QuestionMode = 'ASKED' | 'NOT_ASKED' | 'UNKNOWN';

export interface QuestionnaireSemantics {
  warrantyMode: QuestionMode;
  billMode: QuestionMode;
  ageMode: QuestionMode;
}

/** No stored profile yet: the conservative, explicit fallback. The quote page
 * asks every question and the engine prices the answers as given - nothing is
 * silently mapped to "No". Quotes record that this fallback was used. */
export const UNKNOWN_QUESTIONNAIRE: QuestionnaireSemantics = Object.freeze({
  warrantyMode: 'UNKNOWN',
  billMode: 'UNKNOWN',
  ageMode: 'UNKNOWN',
}) as QuestionnaireSemantics;

/** Whether the quote page should show a question: Cashify asks it, or we do
 * not know yet (then asking is the safe choice). */
export const showsQuestion = (mode: QuestionMode) => mode !== 'NOT_ASKED';

export function isQuestionMode(value: unknown): value is QuestionMode {
  return value === 'ASKED' || value === 'NOT_ASKED' || value === 'UNKNOWN';
}
