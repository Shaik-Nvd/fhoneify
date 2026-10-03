/**
 * The condition answer sets used by the 2026-10-01 Cashify benchmark, mapped
 * to the quote page's DiagnosticsType (app/quote/page.tsx sends exactly these
 * strings). Shared by the calibration harness and the regression snapshot so
 * both price the same answers.
 */
import type { DiagnosticsType } from '../../lib/pricingCalculator';
import type { QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';

const BASE: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: [],
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: [],
  accessories: ['box'],
  warranty: false,
  validBill: true,
  eSim: null,
  mobileAge: 'above11',
};

/** Combo 1: local (non-original) screen + large spots, visible lines, major
 * discoloration. */
export const COMBO_1: DiagnosticsType = {
  ...BASE,
  originalScreen: false,
  defects: ['screen_spot'],
  screenSpots: 'Large/ heavy visible spots on screen',
  screenLines: 'Visible line(s) on display',
  screenDiscoloration: 'Major Discoloration',
};

/** Combo 2: original screen, more than 2 screen scratches, charging port not
 * working. */
export const COMBO_2: DiagnosticsType = {
  ...BASE,
  defects: ['screen_scratch'],
  screenCondition: 'More than 2 scratches on screen',
  hardware: ['charging'],
};

/** Combo 0: no defects, warranty No, bill Yes, box. Isolates the
 * warranty/age cut from condition deductions. */
export const COMBO_0: DiagnosticsType = { ...BASE };

export const COMBOS: Record<0 | 1 | 2, DiagnosticsType> = { 0: COMBO_0, 1: COMBO_1, 2: COMBO_2 };

/** Cashify asked warranty and bill for every benchmark model. */
export const BENCHMARK_SEMANTICS: QuestionnaireSemantics = {
  warrantyMode: 'ASKED',
  billMode: 'ASKED',
  ageMode: 'UNKNOWN',
};

/** Cashify "Selling price" = base - this fee (Sanchar Saathi). */
export const CASHIFY_SELLING_FEE = 20;
