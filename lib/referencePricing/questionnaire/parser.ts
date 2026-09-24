/**
 * Reads which questions Cashify's first questionnaire page presents. Pure:
 * takes the visible page text the browser saw, returns tri-state modes.
 *
 * The anchor question ("Are you able to make and receive calls?") is asked
 * for every phone and proves the calculator page actually rendered. Without
 * it nothing can be concluded, so every mode is UNKNOWN - a failed or partial
 * load must never be read as "not asked".
 */
import type { QuestionMode } from './types';

export const QUESTIONNAIRE_PARSER_VERSION = 'cashify-questionnaire/1';

const ANCHOR = /are you able to make and receive calls/i;
const WARRANTY = /under manufacturer warranty/i;
const BILL = /gst valid bill/i;
/** Cashify has not been observed to ask device age; these are the phrasings
 * that would indicate it if it ever does. */
const AGE = /how old is your (device|phone)|age of (your|the) (device|phone)|when did you (buy|purchase)|purchase date/i;
/** Question headings end in "?". Kept short so labels stay auditable. */
const QUESTION_LINE = /^[^\n?]{6,140}\?$/;

export interface QuestionnaireParse {
  ok: boolean;
  warrantyMode: QuestionMode;
  billMode: QuestionMode;
  ageMode: QuestionMode;
  questionLabels: string[];
  reason: string | null;
}

export function parseQuestionnairePage(pageText: string | null | undefined): QuestionnaireParse {
  const text = String(pageText ?? '');
  const questionLabels = [...new Set(
    text.split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter((line) => QUESTION_LINE.test(line))
  )].slice(0, 20);

  if (!ANCHOR.test(text)) {
    return {
      ok: false,
      warrantyMode: 'UNKNOWN',
      billMode: 'UNKNOWN',
      ageMode: 'UNKNOWN',
      questionLabels,
      reason: 'questionnaire page not detected (calls question missing)',
    };
  }

  const mode = (re: RegExp): QuestionMode => (re.test(text) ? 'ASKED' : 'NOT_ASKED');
  return {
    ok: true,
    warrantyMode: mode(WARRANTY),
    billMode: mode(BILL),
    ageMode: mode(AGE),
    questionLabels,
    reason: null,
  };
}
