/**
 * Factor catalog for the Cashify experimental design.
 *
 * Every factor is one Cashify questionnaire question (or one sub-page
 * question), with the exact option text the live questionnaire renders.
 * Option texts are copied from the collector/quote-page selectors already in
 * this repo (scripts/pricing-research/collector.ts on the research branch,
 * server/modules/quote/cashifyScraper.ts, app/quote/page.tsx) - nothing here
 * is invented. Whether a question is actually presented for a given model is
 * NOT assumed: see `gate` and the ASKED / NOT_ASKED / UNKNOWN handling in
 * design.ts.
 *
 * Pure data + pure helpers. No I/O.
 */

export type QuestionMode = 'ASKED' | 'NOT_ASKED' | 'UNKNOWN';

/** Which questionnaire metadata decides whether a factor exists for a model. */
export type FactorGate =
  /** Always rendered on the page (Cashify's core condition pages). Still
   * verified at collection time by exact question/option text. */
  | 'ALWAYS'
  /** Only when CashifyQuestionnaireProfile.warrantyMode is ASKED. */
  | 'WARRANTY_MODE'
  /** Only when billMode is ASKED. */
  | 'BILL_MODE'
  /** Only when ageMode is ASKED. */
  | 'AGE_MODE'
  /** Option set differs by model (e.g. Face Sensor vs Finger Touch, eSIM,
   * Silent Button). No stored metadata says which models show it, so the
   * factor is UNKNOWN until a baseline run records the option text. */
  | 'MODEL_DEPENDENT_OPTION';

export type FactorGroup =
  | 'functional_core'
  | 'ownership'
  | 'screen_physical'
  | 'screen_display'
  | 'body'
  | 'panel_frame'
  | 'hardware'
  | 'accessories'
  | 'age';

export interface FactorLevel {
  /** Stable id used in experiment ids and analysis output. */
  id: string;
  /** Exact option text to select on Cashify. */
  optionText: string;
}

export interface Factor {
  id: string;
  group: FactorGroup;
  /** Questionnaire page and, for sub-pages, the checkbox that opens it. */
  page: string;
  /** Exact question text as rendered (or the checkbox label for checkbox
   * factors). Used by the collector to verify the answer landed on the
   * intended question - never positional. */
  questionText: string;
  /** The clean-baseline level. */
  baseline: FactorLevel;
  /** Non-baseline levels, mildest first. */
  levels: FactorLevel[];
  gate: FactorGate;
  /** Checkbox on the defect page that must be ticked to reach this sub-page
   * question, if any. Ticking it forces every sibling sub-page question to be
   * answered too (siblings are held at their own baseline "No ..." option). */
  opensVia?: string;
  /** Sibling factors on the same sub-page. */
  siblings?: string[];
  /** Known or suspected conditional-questionnaire effects of choosing a
   * non-baseline level. A control with any of these is NOT a clean
   * one-factor-at-a-time contrast and is flagged in the plan. */
  conditional?: string;
  /** Fhoneify's calculator has an explicit input for this factor (so the
   * observation maps directly onto an existing, owner-approved rule). */
  fhoneifyInput?: string;
  /** Screening priority: 1 = measured on every training device; 2 = anchor
   * devices plus promotion if anchors show model-dependence; 3 = anchor
   * devices only (factor discovery). */
  priority: 1 | 2 | 3;
}

const L = (id: string, optionText: string): FactorLevel => ({ id, optionText });

export const DEFECT_CHECKBOX = {
  screen: 'Broken/scratch on device screen',
  display: 'Dead Spot/Visible line and Discoloration on screen',
  body: 'Scratch/Dent on device body',
  panel: 'Device panel missing/broken',
} as const;

export const FACTORS: Factor[] = [
  // PAGE 1 - Yes/No
  {
    id: 'calls', group: 'functional_core', page: 'P1', gate: 'ALWAYS', priority: 1,
    questionText: 'Are you able to make and receive calls?',
    baseline: L('yes', 'Yes'), levels: [L('no', 'No')], fhoneifyInput: 'calls',
  },
  {
    id: 'touch', group: 'functional_core', page: 'P1', gate: 'ALWAYS', priority: 1,
    questionText: "Is your device's touch screen working properly?",
    baseline: L('yes', 'Yes'), levels: [L('no', 'No')], fhoneifyInput: 'touch',
  },
  {
    id: 'originalScreen', group: 'functional_core', page: 'P1', gate: 'ALWAYS', priority: 1,
    questionText: "Is your phone's screen original?",
    baseline: L('yes', 'Yes'), levels: [L('no', 'No')], fhoneifyInput: 'originalScreen',
  },
  {
    id: 'warranty', group: 'ownership', page: 'P1', gate: 'WARRANTY_MODE', priority: 1,
    questionText: 'Is your device under manufacturer warranty?',
    baseline: L('yes', 'Yes'), levels: [L('no', 'No')], fhoneifyInput: 'warranty',
    conditional:
      'Suspected: the mobile-age page is only shown when warranty=Yes and bill=Yes (collector.ts PAGE 5 heuristic). ' +
      'warranty=No may therefore also remove the age answer, confounding the warranty effect with the baseline age credit.',
  },
  {
    id: 'validBill', group: 'ownership', page: 'P1', gate: 'BILL_MODE', priority: 1,
    questionText: 'Do you have GST valid bill with the same IMEI?',
    baseline: L('yes', 'Yes'), levels: [L('no', 'No')], fhoneifyInput: 'validBill',
    conditional: 'Suspected: bill=No may also suppress the mobile-age page (same heuristic as warranty).',
  },
  {
    id: 'eSim', group: 'functional_core', page: 'P1', gate: 'MODEL_DEPENDENT_OPTION', priority: 3,
    questionText: 'eSIM type',
    baseline: L('single', 'Single eSIM'), levels: [L('dual', 'Dual eSIM')], fhoneifyInput: 'eSim',
  },

  // PAGE 2a - screen physical (checkbox + one sub-page question)
  {
    id: 'screenCondition', group: 'screen_physical', page: 'P2-screen', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.screen,
    questionText: 'Screen physical condition',
    baseline: L('none', '__CHECKBOX_UNTICKED__'),
    levels: [
      L('scratch_1_2', '1-2 scratches on screen'),
      L('scratch_gt2', 'More than 2 scratches on screen'),
      L('chipped_outside', 'Chipped/cracked outside display area'),
      L('cracked', 'Screen cracked/ glass broken'),
    ],
    fhoneifyInput: 'screenCondition',
  },

  // PAGE 2b - display defects (checkbox opens three questions)
  {
    id: 'screenSpots', group: 'screen_display', page: 'P2-display', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.display, siblings: ['screenLines', 'screenDiscoloration'],
    questionText: 'Spots on screen',
    baseline: L('none', 'No spots on screen'),
    levels: [
      L('minor_1_2', '1-2 minor spots on screen'),
      L('minor_3plus', '3 or more minor spots on screen'),
      L('heavy', 'Large/ heavy visible spots on screen'),
    ],
    fhoneifyInput: 'screenSpots',
  },
  {
    id: 'screenLines', group: 'screen_display', page: 'P2-display', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.display, siblings: ['screenSpots', 'screenDiscoloration'],
    questionText: 'Lines on display',
    baseline: L('none', 'No line(s) on Display'),
    levels: [L('faded_edges', 'Display faded along edges'), L('visible_lines', 'Visible line(s) on display')],
    fhoneifyInput: 'screenLines',
  },
  {
    id: 'screenDiscoloration', group: 'screen_display', page: 'P2-display', gate: 'ALWAYS', priority: 2,
    opensVia: DEFECT_CHECKBOX.display, siblings: ['screenSpots', 'screenLines'],
    questionText: 'Screen discoloration',
    baseline: L('none', 'No Discoloration'),
    levels: [L('minor', 'Minor Discoloration'), L('major', 'Major Discoloration')],
    fhoneifyInput: 'screenDiscoloration',
  },

  // PAGE 2c - body (checkbox opens scratches + dents)
  {
    id: 'bodyScratches', group: 'body', page: 'P2-body', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.body, siblings: ['bodyDents'],
    questionText: 'Scratches on device body',
    baseline: L('none', 'No scratches'),
    levels: [L('scratch_1_2', '1-2 scratches'), L('scratch_gt2', 'More than 2 scratches')],
    fhoneifyInput: 'bodyScratches',
  },
  {
    id: 'bodyDents', group: 'body', page: 'P2-body', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.body, siblings: ['bodyScratches'],
    questionText: 'Dents on device body',
    baseline: L('none', 'No dents'),
    levels: [L('minor_1_2', '1-2 minor dents'), L('major', 'Major dent(s) or more than 2')],
    fhoneifyInput: 'bodyDents',
  },

  // PAGE 2d - panel / frame (checkbox opens panel + bent)
  {
    id: 'bodyPanel', group: 'panel_frame', page: 'P2-panel', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.panel, siblings: ['bodyBent'],
    questionText: 'Side or back panel condition',
    baseline: L('none', 'No defect on side or back panel'),
    levels: [L('cracked', 'Cracked/ broken side or back panel'), L('missing', 'Missing side or back panel')],
    fhoneifyInput: 'bodyPanel',
  },
  {
    id: 'bodyBent', group: 'panel_frame', page: 'P2-panel', gate: 'ALWAYS', priority: 1,
    opensVia: DEFECT_CHECKBOX.panel, siblings: ['bodyPanel'],
    questionText: 'Bent or loose frame',
    baseline: L('none', 'Phone not bent'),
    levels: [L('loose_screen', 'Loose screen (Gap in screen and body)'), L('bent', 'Bent/ curved panel')],
    fhoneifyInput: 'bodyBent',
  },

  // PAGE 3 - functional hardware checkboxes (each is its own binary factor)
  ...(
    [
      ['back_camera', 'Back Camera not working', 1, 'ALWAYS'],
      ['front_camera', 'Front Camera not working', 1, 'ALWAYS'],
      // POCO F4 5G rendered "Battery Faulty" instead (2026-10-01 pilot).
      // These labels are not semantically interchangeable without evidence.
      ['battery_service', 'Battery in Service (Health < 80%)', 1, 'MODEL_DEPENDENT_OPTION'],
      ['battery_health', 'Battery Health 80-85%', 2, 'MODEL_DEPENDENT_OPTION'],
      ['charging', 'Charging Port not working', 2, 'ALWAYS'],
      ['speaker', 'Speaker Faulty', 2, 'ALWAYS'],
      ['microphone', 'Microphone not working', 2, 'ALWAYS'],
      ['wifi', 'WiFi not working', 2, 'ALWAYS'],
      ['fingerprint', 'Finger Touch not working', 2, 'MODEL_DEPENDENT_OPTION'],
      ['face', 'Face Sensor not working', 2, 'MODEL_DEPENDENT_OPTION'],
      ['power', 'Power Button not working', 2, 'ALWAYS'],
      ['volume', 'Volume Button not working', 2, 'ALWAYS'],
      ['camera_glass', 'Camera Glass Broken', 2, 'ALWAYS'],
      ['audio_receiver', 'Audio Receiver not working', 3, 'ALWAYS'],
      ['bluetooth', 'Bluetooth not working', 3, 'ALWAYS'],
      ['vibrator', 'Vibrator is not working', 3, 'ALWAYS'],
      ['proximity', 'Proximity Sensor not working', 3, 'ALWAYS'],
      ['silent', 'Silent Button not working', 3, 'MODEL_DEPENDENT_OPTION'],
    ] as Array<[string, string, 1 | 2 | 3, FactorGate]>
  ).map(([id, text, priority, gate]): Factor => ({
    id: `hw_${id}`, group: 'hardware', page: 'P3', gate, priority,
    questionText: text,
    baseline: L('ok', '__UNTICKED__'),
    levels: [L('faulty', text)],
    fhoneifyInput: `hardware:${id}`,
  })),

  // PAGE 4 - accessories. Baseline = both present (ticked).
  {
    // Model-dependent: app/quote/page.tsx hasChargerInBox() hides the charger
    // for Nothing/CMF and Samsung S21-S26/Z Flip/Z Fold. Whether Cashify also
    // hides it is unverified, so it is resolved at runtime.
    id: 'charger', group: 'accessories', page: 'P4', gate: 'MODEL_DEPENDENT_OPTION', priority: 1,
    questionText: 'Original Charger of device',
    baseline: L('present', 'Original Charger of device'), levels: [L('missing', '__UNTICKED__')],
    fhoneifyInput: 'accessories:charger',
  },
  {
    // Samsung Note / S Ultra only (app/quote/page.tsx hasSPen()).
    id: 'sPen', group: 'accessories', page: 'P4', gate: 'MODEL_DEPENDENT_OPTION', priority: 3,
    questionText: 'Original S Pen',
    baseline: L('present', 'Original S Pen'), levels: [L('missing', '__UNTICKED__')],
    fhoneifyInput: 'accessories:spen',
  },
  {
    id: 'box', group: 'accessories', page: 'P4', gate: 'ALWAYS', priority: 1,
    questionText: 'Original Box with same IMEI',
    baseline: L('present', 'Original Box with same IMEI'), levels: [L('missing', '__UNTICKED__')],
    fhoneifyInput: 'accessories:box',
  },

  // PAGE 5 - mobile age
  {
    id: 'mobileAge', group: 'age', page: 'P5', gate: 'AGE_MODE', priority: 1,
    questionText: 'What is your mobile age?',
    baseline: L('below3', 'Below 3 months'),
    levels: [L('3to6', '3 months - 6 months'), L('6to11', '6 months - 11 months'), L('above11', 'Above 11 months')],
    fhoneifyInput: 'mobileAge',
    conditional: 'Page is only rendered when Cashify asks age for this model and (suspected) only when warranty=Yes and bill=Yes.',
  },
];

/**
 * Factors whose `questionText` is a descriptive label, not the verbatim
 * Cashify heading (the repo only holds their option texts). The collector
 * must record the real heading it sees; verification for these uses the
 * option text alone. Everything else is verbatim from app/quote/page.tsx /
 * the questionnaire parser / the collector selectors.
 */
export const UNVERIFIED_QUESTION_TEXT = new Set([
  'eSim', 'screenCondition', 'screenSpots', 'screenLines', 'screenDiscoloration',
  'bodyScratches', 'bodyDents', 'bodyPanel', 'bodyBent', 'sPen',
]);

export const FACTOR_BY_ID: Record<string, Factor> = Object.fromEntries(FACTORS.map((f) => [f.id, f]));

export function getFactor(id: string): Factor {
  const f = FACTOR_BY_ID[id];
  if (!f) throw new Error(`unknown factor ${id}`);
  return f;
}

export function getLevel(factorId: string, levelId: string): FactorLevel {
  const f = getFactor(factorId);
  if (f.baseline.id === levelId) return f.baseline;
  const l = f.levels.find((x) => x.id === levelId);
  if (!l) throw new Error(`unknown level ${factorId}=${levelId}`);
  return l;
}

/** The most severe level - used where one level must represent the factor. */
export const severest = (f: Factor): FactorLevel => f.levels[f.levels.length - 1];
