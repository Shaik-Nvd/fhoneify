import { applyCompetitorUplift, COMMON_BONUSES, DiagnosticsType } from '../pricingCalculator';
import { priceDevice } from './engine';
import { PERFECT_CONDITION_DIAGNOSTICS } from './perfectCondition';

/**
 * Transparent breakdown of one quote, for comparing identical scenarios
 * against Cashify by hand.
 *
 * It contains NO pricing formula of its own. Each answer's effect is measured
 * by re-running the real engine (priceDevice -> calculateFhoneifyPrice) as the
 * answers are applied one group at a time, starting from perfect condition.
 * The size of a step can depend on the age-adjusted base and on repair-group
 * waivers; the order used is fixed and printed, and the steps always add up
 * exactly to the final Cashify-equivalent value.
 */

export interface ExplainStep {
  step: string;
  fields: Partial<DiagnosticsType>;
  cashifyEquivalent: number;
  delta: number;
}

export interface QuoteExplanation {
  brand: string;
  model: string;
  referencePrice: number;
  perfectConditionCashifyEquivalent: number;
  steps: ExplainStep[];
  cashifyEquivalent: number;
  uplift: {
    tierPercent: number;
    uncappedRupees: number;
    capRupees: number;
    capApplied: boolean;
    rupees: number;
    floorApplied: boolean;
  };
  finalPrice: number;
  /** Answers the brand's formula ignored completely (changing them from
   * perfect to the given value moved the price by ₹0). */
  ignoredAnswers: string[];
}

const UPLIFT_CAP = 2000;

const SCREEN_DEFECTS = new Set(['screen_scratch', 'screen_spot', 'broken_screen', 'screen_lines', 'screen_discoloration']);
const BODY_DEFECTS = new Set(['body_scratch', 'panel_missing', 'body_bent']);

interface ExplainGroup {
  step: string;
  fields: (target: DiagnosticsType, current: DiagnosticsType) => Partial<DiagnosticsType>;
}

const picked = (target: DiagnosticsType, keys: (keyof DiagnosticsType)[]): Partial<DiagnosticsType> => {
  const fields: Partial<DiagnosticsType> = {};
  for (const key of keys) (fields as any)[key] = target[key];
  return fields;
};

/** The public pricing pipeline, in the order used by the explanation. */
const GROUPS: ExplainGroup[] = [
  { step: 'age', fields: (target) => picked(target, ['mobileAge']) },
  { step: 'warranty / bill', fields: (target) => picked(target, ['warranty', 'validBill']) },
  {
    step: 'screen',
    fields: (target, current) => ({
      ...picked(target, ['touch', 'originalScreen', 'screenCondition', 'screenSpots', 'screenLines', 'screenDiscoloration']),
      defects: [...new Set([...(current.defects || []), ...(target.defects || []).filter((d) => SCREEN_DEFECTS.has(d))])],
    }),
  },
  {
    step: 'body',
    fields: (target, current) => ({
      ...picked(target, ['bodyScratches', 'bodyDents', 'bodyPanel', 'bodyBent']),
      defects: [...new Set([...(current.defects || []), ...(target.defects || []).filter((d) => BODY_DEFECTS.has(d))])],
    }),
  },
  { step: 'functional', fields: (target) => picked(target, ['calls', 'hardware']) },
  { step: 'accessories', fields: (target) => picked(target, ['accessories', 'box', 'charger']) },
  { step: 'eSIM', fields: (target) => picked(target, ['eSim']) },
];

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function explainQuote(brand: string, model: string, referencePrice: number, diagnostics: DiagnosticsType): QuoteExplanation {
  const price = (d: DiagnosticsType) => priceDevice(brand, model, referencePrice, d);

  let current: DiagnosticsType = { ...PERFECT_CONDITION_DIAGNOSTICS };
  const perfect = price(current).cashifyBasePrice;
  let previous = perfect;
  const steps: ExplainStep[] = [];
  const ignoredAnswers: string[] = [];

  for (const group of GROUPS) {
    const selected = group.fields(diagnostics, current);
    const fields: Partial<DiagnosticsType> = {};
    for (const [key, value] of Object.entries(selected)) {
      if (!sameValue(value, (current as any)[key])) (fields as any)[key] = value;
    }

    // Is each changed answer, applied on its own to a perfect device, ignored?
    for (const [key, value] of Object.entries(fields)) {
      const alone = price({ ...PERFECT_CONDITION_DIAGNOSTICS, [key]: value } as DiagnosticsType).cashifyBasePrice;
      if (alone === perfect) ignoredAnswers.push(`${key}=${JSON.stringify(value)}`);
    }

    current = { ...current, ...fields } as DiagnosticsType;
    const now = price(current).cashifyBasePrice;
    steps.push({ step: group.step, fields, cashifyEquivalent: now, delta: now - previous });
    previous = now;
  }

  const result = price(diagnostics);
  if (result.cashifyBasePrice !== previous) {
    // Only possible if a field outside GROUPS affects price - the breakdown
    // would then be incomplete, so refuse rather than mislead.
    throw new Error(`explain: breakdown ended at ${previous} but the engine returned ${result.cashifyBasePrice}; a diagnostics field is not covered`);
  }

  const cashifyEquivalent = result.cashifyBasePrice;
  const tierPercent = referencePrice <= 20000 ? 8 : referencePrice <= 50000 ? 6 : 4;
  const uncappedRupees = cashifyEquivalent * (tierPercent / 100);
  const capApplied = uncappedRupees > UPLIFT_CAP;
  const rupees = Math.min(uncappedRupees, UPLIFT_CAP);
  const beforeFloor = Math.round(cashifyEquivalent + rupees);

  // Cross-check the description above against the real uplift function.
  const engineFinal = applyCompetitorUplift(referencePrice, cashifyEquivalent);
  if (engineFinal !== result.fhoneifyPrice || Math.max(beforeFloor, COMMON_BONUSES.floorPrice) !== engineFinal) {
    throw new Error(`explain: uplift description (${beforeFloor}) disagrees with the engine (${result.fhoneifyPrice})`);
  }

  return {
    brand,
    model,
    referencePrice,
    perfectConditionCashifyEquivalent: perfect,
    steps,
    cashifyEquivalent,
    uplift: {
      tierPercent,
      uncappedRupees: Math.round(uncappedRupees),
      capRupees: UPLIFT_CAP,
      capApplied,
      rupees: Math.round(rupees),
      floorApplied: beforeFloor < COMMON_BONUSES.floorPrice,
    },
    finalPrice: result.fhoneifyPrice,
    ignoredAnswers,
  };
}
