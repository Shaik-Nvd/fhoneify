import { runnerScope } from './cashifyRunnerModel/scope';
/**
 * Which quote-flow questions actually change a device's price.
 *
 * lib/pricingCalculator.ts (calculateFhoneifyPrice) dispatches to one of
 * eight brand calculators by brand/model substring match. This module
 * mirrors that same dispatch so the questionnaire eligibility can never
 * drift from the engine it is describing - see scripts/test/
 * pricing.questionnaire-coverage.test.ts, which verifies the mirror
 * empirically against every catalog device.
 *
 * Findings (verified empirically, 2026-09-24, reference=30000):
 * - diagnostics.warranty changes price for every brand: either directly
 *   (the age multiplier branches on `warranty === false`) or indirectly
 *   (the GST-bill penalty only applies while `warranty !== false`).
 * - diagnostics.validBill / accessories 'bill' changes price for every
 *   brand for the same reason, whenever warranty is not explicitly false.
 * - diagnostics.mobileAge changes price only for Apple, Xiaomi, Oppo,
 *   OnePlus and non-fold Vivo/iQOO. Samsung, Nothing/CMF, the generic
 *   Android fallback, and foldable Vivo/iQOO never read mobileAge.
 *   (Apple/Xiaomi/OnePlus additionally treat mobileAge === 'above11' as
 *   forcing out-of-warranty pricing even when warranty === true, via an
 *   `||` check - so age must be asked for those brands regardless of the
 *   warranty answer, not just when warranty is false/unknown.)
 *
 * Because warranty/bill are asked for every device, this matches Cashify's
 * own flow, which always asks "under warranty?" and "GST bill?" on the
 * first page for every model.
 */

export type EngineBrand =
  | 'apple'
  | 'samsung'
  | 'xiaomi'
  | 'vivo'
  | 'oppo'
  | 'oneplus'
  | 'nothing'
  | 'generic';

export interface QuestionnaireDevice {
  brand: string;
  model: string;
}

/**
 * How finely the active pricing path prices the age answer.
 * - 'brackets': each of Cashify's four brackets (below 3, 3-6, 6-11, above 11 months) has its own value.
 * - 'elevenMonths': the path has no values for the 3-6 and 6-11 brackets, so only below/above 11 months is
 *   asked. Above 11 months prices as out of warranty, which is what Cashify does (measured on every brand
 *   whose questionnaire has been recorded: warranty No = bill No = above 11 months).
 */
export type AgeResolution = 'brackets' | 'elevenMonths';

export interface QuestionnaireEligibility {
  asksWarranty: boolean;
  asksBill: boolean;
  asksAge: boolean;
  ageResolution: AgeResolution;
}

/**
 * Mirrors the brand routing in calculateFhoneifyPrice (lib/pricingCalculator.ts)
 * exactly, including its brand/model substring checks and precedence order.
 */
export function resolveEngineBrand(brand: string, model: string): EngineBrand {
  const safeBrand = String(brand || '').toLowerCase().trim();
  const safeModel = String(model || '').toLowerCase().trim();

  if (safeBrand === 'apple' || safeModel.includes('iphone')) return 'apple';
  if (safeBrand === 'samsung' || safeModel.includes('galaxy')) return 'samsung';
  if (
    safeBrand === 'xiaomi' || safeBrand === 'redmi' || safeBrand === 'poco' ||
    safeModel.includes('xiaomi') || safeModel.includes('redmi') || safeModel.includes('poco')
  ) return 'xiaomi';
  if (
    safeBrand === 'vivo' || safeBrand === 'iqoo' ||
    safeModel.includes('vivo') || safeModel.includes('iqoo')
  ) return 'vivo';
  if (
    safeBrand === 'oppo' || safeModel.includes('oppo') ||
    safeModel.includes('reno') || safeModel.includes('find x')
  ) return 'oppo';
  if (safeBrand === 'oneplus' || safeModel.includes('oneplus') || safeModel.includes('nord')) return 'oneplus';
  if (
    safeBrand === 'nothing' || safeBrand === 'cmf' ||
    safeModel.includes('nothing') || safeModel.includes('cmf')
  ) return 'nothing';

  return 'generic';
}

/** Brands whose calculator ever branches on diagnostics.mobileAge. */
const AGE_SENSITIVE_BRANDS: ReadonlySet<EngineBrand> = new Set([
  'apple', 'xiaomi', 'oppo', 'oneplus', 'vivo',
]);

/**
 * The single source of truth for which questions the quote UI must ask for
 * a given device, driven by which inputs the active pricing path actually
 * reads. app/quote/page.tsx calls this directly so the UI and the coverage
 * test can never drift apart.
 */
export function questionnaireFor(device: QuestionnaireDevice): QuestionnaireEligibility {
  const runner = runnerScope(device.model);
  if (runner) return { asksWarranty: runner.hasAge, asksBill: runner.hasAge, asksAge: runner.hasAge, ageResolution: 'brackets' };
  return { asksWarranty: true, asksBill: true, asksAge: true, ageResolution: ageResolutionFor(device) };
}

/** Whether the brand calculator prices every age bracket or only below/above 11 months. */
export function ageResolutionFor(device: QuestionnaireDevice): AgeResolution {
  const engineBrand = resolveEngineBrand(device.brand, device.model);
  // calculateVivoPrice's foldable branch never reads diagnostics.mobileAge.
  const isFoldVivo = engineBrand === 'vivo' && String(device.model || '').toLowerCase().includes('fold');
  return AGE_SENSITIVE_BRANDS.has(engineBrand) && !isFoldVivo ? 'brackets' : 'elevenMonths';
}

/** Engines whose calculator has no branch for an "above 11 months" answer given with warranty Yes. */
const ABOVE_ELEVEN_UNREAD: ReadonlySet<EngineBrand> = new Set(['samsung', 'vivo', 'nothing', 'generic']);

/** True when "above 11 months" must be passed to this engine as out of warranty to be priced at all. */
export function aboveElevenNeedsOutOfWarranty(brand: string, model: string): boolean {
  return ABOVE_ELEVEN_UNREAD.has(resolveEngineBrand(brand, model));
}
