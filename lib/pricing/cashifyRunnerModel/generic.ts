/**
 * Cross-brand Cashify rules for Android phones that have no measured profile of their own
 * (Vivo, Realme, iQOO, LG, Ai+, and untested models of measured brands).
 *
 * Cashify prices Android phones with one rule set per regime: "newer" phones, whose questionnaire asks
 * warranty, bill and age, and "older" phones, where it does not. Within a regime each deduction is a
 * share of the reference that depends only on the reference (Wi-Fi 30% newer / 40% older, age above
 * 11 months 24%, ...). calibration.generic.json holds those shares as curves fitted from every
 * measured Android brand (scripts/pricing-evidence/fit-generic-android.ts). The curves run through the
 * same evaluator, combination rules and fail-closed checks as the measured brands.
 *
 * Accuracy, predicting each measured brand from the other brands only: most single answers within 5%
 * of the reference; display repairs vary by model and are the largest residual. Every generic quote is
 * labelled inferred.
 */
import generic from './calibration.generic.json';
import { evaluateRunner, storageKey, round10, type DeductionRule, type RunnerProfile } from './model';
import { InspectionRequiredError } from '../inspectionRequired';
import type { DiagnosticsType } from '../../pricingCalculator';

type Regime = 'newer' | 'older';
interface Curve { knots: number[]; shares: number[]; support: number }
const curves = (generic as unknown as { curves: Record<Regime, Record<string, Curve>> }).curves;

/** Points-file answer keys -> runner rule keys. 'calls' sets the scrap value; warranty/bill price as age above 11. */
const RULE_KEY: Record<string, string | null> = {
  'screen:0': 'cracked', 'accessory:box': 'box', 'accessory:charger': 'charger', 'accessories:all': 'both', 'accessory:spen': 'spen',
  calls: null, warranty: null, bill: null,
};

export function genericCallsShare(regime: Regime) { return curves[regime].calls; }

export function genericProfile(model: string, storage: string | null | undefined, reference: number, regime: Regime, accessories: string[], table: Record<Regime, Record<string, Curve>> = curves): RunnerProfile {
  const rules = rulesFor(table, regime);
  const calls = table[regime].calls;
  if (!calls) throw new InspectionRequiredError('Generic scrap value unavailable');
  const share = calls.shares.length ? evaluateCurveShare(calls, reference) : 1;
  const scrap = Math.max(0, round10(reference * (1 - share)));
  return { brand: 'Generic', model, hasAge: regime === 'newer', rules,
    variants: { [storageKey(storage)]: { accessories, scrap, scrapInferredFrom: 'generic-android' } } };
}
const ruleCache = new WeakMap<object, Partial<Record<Regime, Record<string, DeductionRule>>>>();
/** Rule tables are immutable per curve table and regime; build them once. */
function rulesFor(table: Record<Regime, Record<string, Curve>>, regime: Regime) {
  const cached = ruleCache.get(table)?.[regime]; if (cached) return cached;
  const rules: Record<string, DeductionRule> = {};
  for (const [key, curve] of Object.entries(table[regime])) {
    const ruleKey = Object.prototype.hasOwnProperty.call(RULE_KEY, key) ? RULE_KEY[key] : key;
    if (!ruleKey) continue;
    rules[ruleKey] = Object.freeze({ form: 'curve', value: 0, knots: curve.knots, shares: curve.shares, support: 0, residual: 0, inferredFrom: 'generic-android' }) as DeductionRule;
  }
  ruleCache.set(table, { ...(ruleCache.get(table) ?? {}), [regime]: rules });
  return rules;
}
function evaluateCurveShare(curve: Curve, reference: number) {
  const { knots, shares } = curve;
  if (reference <= knots[0]) return shares[0];
  if (reference >= knots[knots.length - 1]) return shares[shares.length - 1];
  const i = knots.findIndex(k => k >= reference) - 1;
  const t = (Math.log(reference) - Math.log(knots[i])) / (Math.log(knots[i + 1]) - Math.log(knots[i]));
  return shares[i] + t * (shares[i + 1] - shares[i]);
}

export interface GenericSemantics { warrantyMode?: string; boxMode?: string; chargerMode?: string }

/** Regime from the crawled questionnaire: warranty asked = newer. Unknown prices both and pays the lower. */
export function genericQuote(model: string, storage: string | null | undefined, reference: number, d: DiagnosticsType, semantics: GenericSemantics = {}, table: Record<Regime, Record<string, Curve>> = curves) {
  const accessories = [...(semantics.boxMode === 'NOT_ASKED' ? [] : ['box']), ...(semantics.chargerMode === 'NOT_ASKED' ? [] : ['charger'])];
  const regimes: Regime[] = semantics.warrantyMode === 'ASKED' ? ['newer'] : semantics.warrantyMode === 'NOT_ASKED' ? ['older'] : ['newer', 'older'];
  const results: ReturnType<typeof evaluateRunner>[] = []; let lastError: unknown = null;
  for (const regime of regimes) {
    try { results.push(evaluateRunner(genericProfile(model, storage, reference, regime, accessories, table), reference, d, storage)); }
    catch (error) { lastError = error; }
  }
  if (!results.length) throw lastError ?? new InspectionRequiredError('Generic rules unavailable');
  const result = results.reduce((a, b) => (b.price < a.price ? b : a));
  return { ...result, support: 'inferred' as const };
}
