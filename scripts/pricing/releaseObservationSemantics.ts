import type { QuestionMode } from '../../lib/pricing/questionnaireSemantics';

/** An absent row is an incomplete trace, not evidence the question was absent. */
export function observationRouteMode(
  questions: readonly { factorId: string | null; status: string }[],
  factor: string
): QuestionMode {
  const records = questions.filter(q => q.factorId === factor);
  if (records.length !== 1) return 'UNKNOWN';
  return records[0].status === 'ASKED' ? 'ASKED' : records[0].status === 'NOT_ASKED' ? 'NOT_ASKED' : 'UNKNOWN';
}
