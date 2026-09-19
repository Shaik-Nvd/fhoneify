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
 * Because the methodology multiplies some factors together, the size of a
 * step can depend on the order; the order used is fixed and printed, and the
 * steps always add up exactly to the final Cashify-equivalent value.
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

/** Answer groups in the order they are applied. */
const GROUPS: { step: string; keys: (keyof DiagnosticsType)[] }[] = [
  { step: 'age / warranty / bill', keys: ['warranty', 'validBill', 'mobileAge'] },
  { step: 'calls', keys: ['calls'] },
  { step: 'touch', keys: ['touch'] },
  { step: 'original screen', keys: ['originalScreen'] },
  { step: 'defect selection', keys: ['defects'] },
  { step: 'screen condition', keys: ['screenCondition', 'screenSpots', 'screenLines', 'screenDiscoloration'] },
  { step: 'body condition', keys: ['bodyScratches', 'bodyDents', 'bodyPanel', 'bodyBent'] },
  { step: 'functional problems', keys: ['hardware'] },
  { step: 'accessories', keys: ['accessories', 'box', 'charger'] },
  { step: 'eSIM', keys: ['eSim'] },
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
    const fields: Partial<DiagnosticsType> = {};
    for (const key of group.keys) {
      if (!sameValue(diagnostics[key], PERFECT_CONDITION_DIAGNOSTICS[key])) (fields as any)[key] = diagnostics[key];
    }
    if (Object.keys(fields).length === 0) continue;

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
