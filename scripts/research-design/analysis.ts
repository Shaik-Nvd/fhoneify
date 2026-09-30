/**
 * Offline analysis primitives for observations collected against the plan.
 * Pure functions only - no I/O, no database, no pricing-config writes.
 *
 * The unit of evidence is a deduction measured INSIDE one valid block:
 *   deduction = price(block opening baseline) - price(experiment)
 * Prices from different blocks are never subtracted from each other; they
 * are compared only as ratios to their own block baseline.
 */

export interface Observation {
  experimentId: string;
  blockId: string;
  finalPrice: number | null;
  status: 'COMPLETED' | 'UNSUPPORTED' | 'NOT_ASKED' | 'AUTH_REQUIRED' | 'FAILED' | 'INVALID_ANSWER_MISMATCH';
  collectedAt: string; // ISO
  getUptoAtCollection: number | null;
  questionnaireFingerprint: string | null;
}

export interface BlockValidityConfig {
  /** Max rupee difference between the opening and closing baseline. Cashify
   * quotes are rounded to Rs 10, so the default tolerates one rounding step. */
  bracketToleranceRs: number;
  /** Max wall-clock span of a block. */
  maxBlockSpanMs: number;
}

export const DEFAULT_VALIDITY: BlockValidityConfig = {
  bracketToleranceRs: 10,
  maxBlockSpanMs: 6 * 60 * 60 * 1000,
};

export type BlockVerdict =
  | { valid: true; baseline: number }
  | { valid: false; reason: string };

/** A block is usable only if both bracketing baselines completed, agree,
 * the Get Upto did not change, the questionnaire fingerprint did not change,
 * and the block fits inside the time window. */
export function blockValidity(
  open: Observation | undefined,
  close: Observation | undefined,
  members: Observation[],
  cfg: BlockValidityConfig = DEFAULT_VALIDITY,
): BlockVerdict {
  if (!open || open.status !== 'COMPLETED' || open.finalPrice == null) return { valid: false, reason: 'opening baseline missing or not COMPLETED' };
  if (!close || close.status !== 'COMPLETED' || close.finalPrice == null) return { valid: false, reason: 'closing baseline missing or not COMPLETED' };
  if (Math.abs(open.finalPrice - close.finalPrice) > cfg.bracketToleranceRs) {
    return { valid: false, reason: `baseline drifted inside block: ${open.finalPrice} -> ${close.finalPrice}` };
  }
  const all = [open, close, ...members];
  const getUptos = new Set(all.map((o) => o.getUptoAtCollection).filter((x) => x != null));
  if (getUptos.size > 1) return { valid: false, reason: `Get Upto changed inside block: ${[...getUptos].join(', ')}` };
  const fps = new Set(all.map((o) => o.questionnaireFingerprint).filter((x) => x != null));
  if (fps.size > 1) return { valid: false, reason: 'questionnaire fingerprint changed inside block' };
  const times = all.map((o) => Date.parse(o.collectedAt)).filter((t) => !Number.isNaN(t));
  if (times.length && Math.max(...times) - Math.min(...times) > cfg.maxBlockSpanMs) return { valid: false, reason: 'block span exceeds time window' };
  return { valid: true, baseline: open.finalPrice };
}

export interface Deduction { abs: number; pct: number }

export function deduction(baseline: number, price: number): Deduction {
  const abs = baseline - price;
  return { abs, pct: baseline > 0 ? abs / baseline : 0 };
}

export type InteractionClass =
  | 'ADDITIVE'
  | 'MULTIPLICATIVE'
  | 'ADDITIVE_OR_MULTIPLICATIVE' // predictions closer together than the tolerance
  | 'OVERLAP_MAX'                // only the larger deduction applies
  | 'FLOOR'                      // price pinned at a floor
  | 'SUB_ADDITIVE'               // less than either model predicts (partial overlap / cap)
  | 'SUPER_ADDITIVE'             // more than additive (condition-dependent extra penalty)
  | 'NO_EFFECT_SINGLES'          // singles too small to learn anything
  | 'INDETERMINATE';             // hypotheses coincide within tolerance

export interface InteractionResult {
  cls: InteractionClass;
  predictions: { additive: number; multiplicative: number; overlapMax: number };
  observed: number;
  /** |additive - multiplicative| = dA*dB/B. If this is below the tolerance
   * the pair cannot separate the two hypotheses on this device. */
  discrimination: number;
}

/**
 * Classifies one pair observed in one valid block.
 *   B    block baseline price
 *   dA   deduction of A alone, dB of B alone, dAB of A and B together
 *   tol  measurement tolerance in rupees (rounding + bracket tolerance)
 *   floor  optional known floor price (e.g. repeated identical ladder tail)
 */
export function classifyInteraction(B: number, dA: number, dB: number, dAB: number, tol = 20, floor?: number): InteractionResult {
  const additive = dA + dB;
  const multiplicative = B > 0 ? B * (1 - (1 - dA / B) * (1 - dB / B)) : additive;
  const overlapMax = Math.max(dA, dB);
  const discrimination = Math.abs(additive - multiplicative);
  const near = (x: number) => Math.abs(dAB - x) <= tol;
  const predictions = { additive, multiplicative, overlapMax };
  const out = (cls: InteractionClass): InteractionResult => ({ cls, predictions, observed: dAB, discrimination });

  if (Math.abs(dA) <= tol && Math.abs(dB) <= tol) return out('NO_EFFECT_SINGLES');
  if (floor != null && Math.abs(B - dAB - floor) <= tol && B - dAB < B - Math.max(dA, dB)) return out('FLOOR');
  if (near(additive) && near(multiplicative)) {
    // All three hypotheses coincide when one single is ~0: nothing learned.
    if (near(overlapMax)) return out('INDETERMINATE');
    return out('ADDITIVE_OR_MULTIPLICATIVE');
  }
  if (near(overlapMax) && !near(additive)) return out('OVERLAP_MAX');
  if (near(additive)) return out('ADDITIVE');
  if (near(multiplicative)) return out('MULTIPLICATIVE');
  if (dAB > additive + tol) return out('SUPER_ADDITIVE');
  return out('SUB_ADDITIVE');
}

export interface FormFit {
  n: number;
  intercept: number; // rupees
  slope: number;     // fraction of baseline
  r2: number;
  form: 'CONSTANT_RUPEES' | 'PROPORTIONAL' | 'AFFINE' | 'INSUFFICIENT';
}

/**
 * Fits deduction = intercept + slope * baseline across devices/variants for
 * one factor level. CONSTANT_RUPEES: slope ~ 0 (repair-cost-like);
 * PROPORTIONAL: intercept ~ 0 (percentage rule); AFFINE otherwise.
 * `relTol` is the fraction of the mean deduction treated as "about zero".
 */
export function fitDeductionForm(points: Array<{ baseline: number; deduction: number }>, relTol = 0.1): FormFit {
  const n = points.length;
  if (n < 3) return { n, intercept: 0, slope: 0, r2: 0, form: 'INSUFFICIENT' };
  const mx = points.reduce((a, p) => a + p.baseline, 0) / n;
  const my = points.reduce((a, p) => a + p.deduction, 0) / n;
  const sxx = points.reduce((a, p) => a + (p.baseline - mx) ** 2, 0);
  const sxy = points.reduce((a, p) => a + (p.baseline - mx) * (p.deduction - my), 0);
  if (sxx === 0) return { n, intercept: my, slope: 0, r2: 0, form: 'INSUFFICIENT' };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssTot = points.reduce((a, p) => a + (p.deduction - my) ** 2, 0);
  const ssRes = points.reduce((a, p) => a + (p.deduction - (intercept + slope * p.baseline)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const zero = Math.abs(my) * relTol;
  // Contribution of the slope term across the observed baseline range.
  const range = Math.max(...points.map((p) => p.baseline)) - Math.min(...points.map((p) => p.baseline));
  let form: FormFit['form'] = 'AFFINE';
  if (Math.abs(slope * range) <= zero) form = 'CONSTANT_RUPEES';
  else if (Math.abs(intercept) <= zero) form = 'PROPORTIONAL';
  return { n, intercept, slope, r2, form };
}

export interface ErrorSummary {
  n: number;
  maeRs: number;
  mape: number;
  biasRs: number; // mean(predicted - actual): positive = over-paying vs Cashify
  maxAbsRs: number;
}

export function errorSummary(pairs: Array<{ predicted: number; actual: number }>): ErrorSummary {
  const n = pairs.length;
  if (!n) return { n: 0, maeRs: 0, mape: 0, biasRs: 0, maxAbsRs: 0 };
  const err = pairs.map((p) => p.predicted - p.actual);
  return {
    n,
    maeRs: err.reduce((a, e) => a + Math.abs(e), 0) / n,
    mape: pairs.reduce((a, p) => a + (p.actual ? Math.abs(p.predicted - p.actual) / p.actual : 0), 0) / n,
    biasRs: err.reduce((a, e) => a + e, 0) / n,
    maxAbsRs: Math.max(...err.map(Math.abs)),
  };
}

/** Main effects and two-factor interactions from a completed 2^(k-p) run
 * set in +/-1 coding. `runs[i]` is the factor coding, `y[i]` the price. */
export function factorialEffects(runs: number[][], y: number[], names: string[]): Record<string, number> {
  const k = names.length;
  const out: Record<string, number> = {};
  const half = runs.length / 2;
  for (let i = 0; i < k; i++) {
    out[names[i]] = runs.reduce((a, r, j) => a + r[i] * y[j], 0) / half;
  }
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    out[`${names[i]}x${names[j]}`] = runs.reduce((a, r, t) => a + r[i] * r[j] * y[t], 0) / half;
  }
  return out;
}
