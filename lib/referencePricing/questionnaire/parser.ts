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

/** One page of the questionnaire walk, as the browser saw it. */
export interface QuestionnaireFlowPage {
  index: number;
  text: string;
}

/** The pages read for one device, or null when the device page does not exist. */
export interface QuestionnaireFlowFetch {
  pages: QuestionnaireFlowPage[] | null;
  url: string;
}

/** Version of the multi-page walk. Profiles learned by an older parser are re-learned. */
export const QUESTIONNAIRE_FLOW_PARSER_VERSION = 'cashify-questionnaire/2';

/** Marker labels: their presence proves that page was reached and read. */
export const FLOW_MARKERS = {
  defects: 'flow:defects-page',
  problems: 'flow:problems-page',
  accessories: 'flow:accessories-page',
  age: 'flow:age-page',
} as const;

const PAGE_HEADINGS: { key: keyof typeof FLOW_MARKERS; heading: RegExp; prefix: string }[] = [
  { key: 'defects', heading: /select screen\/body defects/i, prefix: 'defect:' },
  { key: 'problems', heading: /functional or physical problems/i, prefix: 'problem:' },
  { key: 'accessories', heading: /do you have the following\?/i, prefix: 'accessory:' },
  { key: 'age', heading: /what is your mobile age\?|how old is your (device|phone)\?/i, prefix: 'age:' },
];

/** Tile/option lines of one page: the lines after the heading and its subtitle,
 * up to Continue or the "Device Evaluation" side card. */
function optionLines(text: string, heading: RegExp): string[] {
  const lines = text.split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 2)) {
    if (/^continue\b/i.test(line) || /device evaluation|follow us on/i.test(line)) break;
    if (/^valid bill mandatory$/i.test(line) || /^\(because/i.test(line)) continue;
    if (line.length > 80) continue;
    out.push(line);
  }
  // Stop at the device name that heads the summary card (it repeats the model).
  return out.filter((l) => !/\(\d+\s*(gb|tb)\s*\/\s*\d+\s*(gb|tb)\)$/i.test(l));
}

export interface QuestionnaireFlowParse extends QuestionnaireParse {
  boxMode: QuestionMode;
  chargerMode: QuestionMode;
  sPenMode: QuestionMode;
  eSimMode: QuestionMode;
  /** First-page question headings plus prefixed labels of every later page. */
  flowLabels: string[];
}

/**
 * Parses a questionnaire walk. The first page gives warranty/bill/age exactly as
 * before (parseQuestionnairePage). Later pages give the defect and problem
 * tiles, the accessories Cashify asks for, and the age options; a page that was
 * not reached leaves its modes UNKNOWN, never NOT_ASKED.
 */
export function parseQuestionnaireFlow(pages: QuestionnaireFlowPage[] | null | undefined): QuestionnaireFlowParse {
  const list = [...(pages ?? [])].sort((a, b) => a.index - b.index);
  const first = parseQuestionnairePage(list[0]?.text);
  const unknown = { boxMode: 'UNKNOWN', chargerMode: 'UNKNOWN', sPenMode: 'UNKNOWN', eSimMode: 'UNKNOWN' } as const;
  if (!first.ok) return { ...first, ...unknown, flowLabels: first.questionLabels };

  const labels = [...first.questionLabels];
  const eSimMode: QuestionMode = /how many esims does your device support/i.test(list[0].text) ? 'ASKED' : 'NOT_ASKED';
  let accessories: string[] | null = null;
  for (const page of list.slice(1)) {
    const kind = PAGE_HEADINGS.find((h) => h.heading.test(page.text));
    if (!kind) continue;
    const options = optionLines(page.text, kind.heading);
    labels.push(FLOW_MARKERS[kind.key], ...options.map((o) => `${kind.prefix}${o}`));
    if (kind.key === 'accessories') accessories = options;
  }
  const accessoryMode = (re: RegExp): QuestionMode => accessories === null ? 'UNKNOWN' : accessories.some((a) => re.test(a)) ? 'ASKED' : 'NOT_ASKED';
  return {
    ...first,
    boxMode: accessoryMode(/\bbox\b/i),
    chargerMode: accessoryMode(/charger/i),
    sPenMode: accessoryMode(/s\s?-?pen/i),
    eSimMode,
    flowLabels: [...new Set(labels)].slice(0, 80),
  };
}

/** Accessory and eSIM modes recovered from stored labels (profiles keep the
 * walk in questionLabels, so no extra columns are needed). UNKNOWN when the
 * accessories page was never read. */
export function flowModesFromLabels(labels: string[] | null | undefined): Pick<QuestionnaireFlowParse, 'boxMode' | 'chargerMode' | 'sPenMode' | 'eSimMode'> {
  const all = labels ?? [];
  const read = all.includes(FLOW_MARKERS.accessories);
  const accessories = all.filter((l) => l.startsWith('accessory:'));
  const mode = (re: RegExp): QuestionMode => !read ? 'UNKNOWN' : accessories.some((a) => re.test(a)) ? 'ASKED' : 'NOT_ASKED';
  const walked = all.includes(FLOW_MARKERS.defects) || read;
  return {
    boxMode: mode(/\bbox\b/i),
    chargerMode: mode(/charger/i),
    sPenMode: mode(/s\s?-?pen/i),
    eSimMode: !walked ? 'UNKNOWN' : all.some((l) => /how many esims/i.test(l)) ? 'ASKED' : 'NOT_ASKED',
  };
}
