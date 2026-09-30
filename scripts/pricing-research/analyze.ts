/**
 * Cashify pricing-research calibration analysis (READ-ONLY, evidence-backed).
 *
 * This script NEVER writes to any pricing config, ReferencePrice table, or
 * the Fhoneify pricing calculator. It only reads COMPLETED rows from the
 * isolated pricing-research tables (via getResearchStore().listCompleted())
 * and prints/exports a proposal for a HUMAN (the repo owner) to review and
 * approve. See AGENTS.md: "Do not invent new penalty percentages" and
 * "pricing rules must NOT be changed casually."
 *
 * Usage:
 *   tsx scripts/pricing-research/analyze.ts [--brand <brand>] [--json <file>]
 *
 * Must run correctly (no crash, no fabricated numbers) against zero
 * completed experiments - the campaign may not have collected any data yet.
 */
import fs from 'node:fs';
import path from 'node:path';
// NOTE: the task brief said to import getResearchStore from
// '../../lib/researchPricing/store', but in the actual repo that factory
// lives in '../../lib/researchPricing/getResearchStore' (store.ts only
// exports the ResearchStore interface and PostgresResearchStore class).
// Importing from the real location so this compiles and runs correctly.
import { getResearchStore } from '../../lib/researchPricing/getResearchStore';
import { classifyPricingFamily } from '../../lib/pricing/families';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Profile = 'A_CLEAN_BASELINE' | 'B_SINGLE_VARIABLE_CONTROL' | 'C_DAMAGE_CONDITION';

interface CompletedRow {
  id: string;
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  profile: Profile;
  status: string;
  sourceUrl?: string | null;
  originalGetUptoReference?: number | null;
  questionsAsked?: unknown;
  answersSelected?: unknown;
  finalQuote?: number | null;
  unsupportedReason?: string | null;
  errorReason?: string | null;
  questionnaireFingerprint?: string | null;
  claimedBy?: string | null;
  claimedAt?: Date | null;
  batchId?: string | null;
}

interface DeviceObservation {
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  reference: number;
  A?: number; // Profile A finalQuote
  B?: number; // Profile B finalQuote (only if B is a supported, completed observation)
  C?: number; // Profile C finalQuote
  bUnsupported?: boolean;
  bUnsupportedReason?: string;
}

interface DeductionPoint {
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  reference: number;
  baseline: number; // Profile A quote
  quote: number; // Profile B or C quote
  absoluteDeductionRupees: number; // baseline - quote
  percentOfBaseline: number; // (baseline - quote) / baseline * 100
  percentOfReference: number; // (baseline - quote) / reference * 100
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const brandFilter = arg('brand');
const jsonOutFile = arg('json');

// ---------------------------------------------------------------------------
// Grouping: brand + "model line" grouping.
//
// We reuse lib/pricing/families.ts's classifyPricingFamily() as the primary
// grouping key because it already encodes the engine's own generation/family
// clustering (e.g. Samsung "S/Plus slab" vs "A-series"), which is exactly the
// axis we want for "consistency across generations within a brand" and for
// eventually mapping a calibrated deduction back onto a specific pricing
// branch. Where that grouping is too coarse for a research question (e.g.
// storage-variant comparisons), we additionally group by raw brand+model.
// ---------------------------------------------------------------------------

function familyLabel(brand: string, model: string): string {
  const family = classifyPricingFamily(brand, model);
  return `${family.engine} / ${family.family}`;
}

function modelLineKey(brand: string, model: string): string {
  return `${brand.trim().toLowerCase()}::${model.trim().toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function round(n: number, dp = 2): number {
  const factor = 10 ** dp;
  return Math.round(n * factor) / factor;
}

// ---------------------------------------------------------------------------
// Step 1: assemble per-device observations from COMPLETED experiment rows.
// ---------------------------------------------------------------------------

function buildDeviceObservations(rows: CompletedRow[]): Map<string, DeviceObservation> {
  const byDevice = new Map<string, DeviceObservation>();

  for (const row of rows) {
    if (row.status !== 'COMPLETED') continue; // defensive; listCompleted already filters
    let obs = byDevice.get(row.deviceKey);
    if (!obs) {
      obs = {
        deviceKey: row.deviceKey,
        brand: row.brand,
        model: row.model,
        storage: row.storage,
        reference: row.originalGetUptoReference ?? NaN,
      };
      byDevice.set(row.deviceKey, obs);
    }
    // Prefer a non-null reference from any profile of this device; profiles
    // should agree, but never overwrite a known reference with a missing one.
    if ((obs.reference === undefined || Number.isNaN(obs.reference)) && row.originalGetUptoReference != null) {
      obs.reference = row.originalGetUptoReference;
    }

    if (row.finalQuote == null) continue; // completed but no numeric quote - do not fabricate

    if (row.profile === 'A_CLEAN_BASELINE') obs.A = row.finalQuote;
    else if (row.profile === 'B_SINGLE_VARIABLE_CONTROL') obs.B = row.finalQuote;
    else if (row.profile === 'C_DAMAGE_CONDITION') obs.C = row.finalQuote;
  }

  return byDevice;
}

// A separate pass to note devices whose Profile B exists but is UNSUPPORTED
// (status !== COMPLETED for B), so we can report them as "skipped" rather
// than silently absent. listCompleted() only returns COMPLETED rows, so we
// cannot see UNSUPPORTED B rows through it directly; instead we infer "B not
// available" whenever obs.B is undefined and report that as "no completed B"
// without asserting *why* (UNSUPPORTED vs never collected) unless the caller
// passed includeHistory and we can see it in the row set. Since listCompleted
// filters to COMPLETED only, "why" is out of scope for this analysis - we
// only ever compare what actually completed.

// ---------------------------------------------------------------------------
// Step 2: derive deduction points for B-vs-A and C-vs-A, skipping any device
// that lacks BOTH quotes for the pair in question. Never impute.
// ---------------------------------------------------------------------------

function deductionPoints(
  observations: DeviceObservation[],
  profile: 'B' | 'C'
): DeductionPoint[] {
  const points: DeductionPoint[] = [];
  for (const obs of observations) {
    const quote = profile === 'B' ? obs.B : obs.C;
    if (obs.A == null || quote == null) continue; // requires both A and the target profile
    if (!(obs.reference > 0)) continue; // reference must be known and positive
    const absoluteDeductionRupees = obs.A - quote;
    const percentOfBaseline = obs.A !== 0 ? (absoluteDeductionRupees / obs.A) * 100 : NaN;
    const percentOfReference = (absoluteDeductionRupees / obs.reference) * 100;
    points.push({
      deviceKey: obs.deviceKey,
      brand: obs.brand,
      model: obs.model,
      storage: obs.storage,
      reference: obs.reference,
      baseline: obs.A,
      quote,
      absoluteDeductionRupees: round(absoluteDeductionRupees, 2),
      percentOfBaseline: Number.isFinite(percentOfBaseline) ? round(percentOfBaseline, 2) : NaN,
      percentOfReference: round(percentOfReference, 2),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Step 3: baseline (A) vs reference, always computable whenever A exists.
// ---------------------------------------------------------------------------

interface BaselinePoint {
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  reference: number;
  baseline: number;
  absoluteRupees: number; // baseline - reference
  percentOfReference: number;
}

function baselinePoints(observations: DeviceObservation[]): BaselinePoint[] {
  const points: BaselinePoint[] = [];
  for (const obs of observations) {
    if (obs.A == null || !(obs.reference > 0)) continue;
    const absoluteRupees = obs.A - obs.reference;
    points.push({
      deviceKey: obs.deviceKey,
      brand: obs.brand,
      model: obs.model,
      storage: obs.storage,
      reference: obs.reference,
      baseline: obs.A,
      absoluteRupees: round(absoluteRupees, 2),
      percentOfReference: round((absoluteRupees / obs.reference) * 100, 2),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Step 4: consistency-across-generations - group deduction points by brand
// (and by family label) and compute variance/stddev of percentOfReference,
// flagging outliers (> 1.5 stddev from the group mean, only when the group
// has >= 3 points so a stddev is meaningful).
// ---------------------------------------------------------------------------

interface GroupConsistency {
  groupKey: string;
  groupType: 'brand' | 'family';
  n: number;
  meanPercentOfReference: number | null;
  stddevPercentOfReference: number | null;
  outliers: Array<{ deviceKey: string; percentOfReference: number; deviationFromMean: number }>;
}

function groupConsistency(
  points: DeductionPoint[],
  keyFn: (p: DeductionPoint) => string,
  groupType: 'brand' | 'family'
): GroupConsistency[] {
  const groups = new Map<string, DeductionPoint[]>();
  for (const p of points) {
    if (!Number.isFinite(p.percentOfReference)) continue;
    const key = keyFn(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const results: GroupConsistency[] = [];
  for (const [groupKey, groupPoints] of groups) {
    const values = groupPoints.map((p) => p.percentOfReference);
    const m = mean(values);
    const sd = stddev(values);
    const outliers = groupPoints
      .filter((p) => sd != null && m != null && sd > 0 && Math.abs(p.percentOfReference - m) > 1.5 * sd)
      .map((p) => ({
        deviceKey: p.deviceKey,
        percentOfReference: p.percentOfReference,
        deviationFromMean: round(p.percentOfReference - (m as number), 2),
      }));
    results.push({
      groupKey,
      groupType,
      n: groupPoints.length,
      meanPercentOfReference: m != null ? round(m, 2) : null,
      stddevPercentOfReference: sd != null ? round(sd, 2) : null,
      outliers,
    });
  }
  return results.sort((a, b) => a.groupKey.localeCompare(b.groupKey));
}

// ---------------------------------------------------------------------------
// Step 5: RAM/storage variant comparison - same brand+model, different
// storage. Report whether baseline-vs-reference and B/C deductions move
// together (small spread) or diverge (large spread) across variants.
// ---------------------------------------------------------------------------

interface VariantComparison {
  modelLine: string;
  brand: string;
  model: string;
  variants: Array<{
    storage: string;
    reference: number;
    baselinePercentOfReference: number | null;
    bPercentOfReference: number | null;
    cPercentOfReference: number | null;
  }>;
  baselineSpreadPercentPoints: number | null; // max - min, across variants with a value
  bSpreadPercentPoints: number | null;
  cSpreadPercentPoints: number | null;
}

function variantComparisons(
  deviceObs: DeviceObservation[],
  bPoints: DeductionPoint[],
  cPoints: DeductionPoint[]
): VariantComparison[] {
  const byModelLine = new Map<string, DeviceObservation[]>();
  for (const obs of deviceObs) {
    const key = modelLineKey(obs.brand, obs.model);
    if (!byModelLine.has(key)) byModelLine.set(key, []);
    byModelLine.get(key)!.push(obs);
  }

  const bByDevice = new Map(bPoints.map((p) => [p.deviceKey, p.percentOfReference]));
  const cByDevice = new Map(cPoints.map((p) => [p.deviceKey, p.percentOfReference]));

  const results: VariantComparison[] = [];
  for (const [modelLine, devices] of byModelLine) {
    // Only interesting when there are 2+ distinct storage variants.
    const distinctStorages = new Set(devices.map((d) => d.storage));
    if (distinctStorages.size < 2) continue;

    const variants = devices.map((d) => {
      const baselinePercentOfReference =
        d.A != null && d.reference > 0 ? round(((d.A - d.reference) / d.reference) * 100, 2) : null;
      return {
        storage: d.storage,
        reference: d.reference,
        baselinePercentOfReference,
        bPercentOfReference: bByDevice.has(d.deviceKey) ? (bByDevice.get(d.deviceKey) as number) : null,
        cPercentOfReference: cByDevice.has(d.deviceKey) ? (cByDevice.get(d.deviceKey) as number) : null,
      };
    });

    const spread = (values: Array<number | null>): number | null => {
      const present = values.filter((v): v is number => v != null && Number.isFinite(v));
      if (present.length < 2) return null;
      return round(Math.max(...present) - Math.min(...present), 2);
    };

    results.push({
      modelLine,
      brand: devices[0].brand,
      model: devices[0].model,
      variants,
      baselineSpreadPercentPoints: spread(variants.map((v) => v.baselinePercentOfReference)),
      bSpreadPercentPoints: spread(variants.map((v) => v.bPercentOfReference)),
      cSpreadPercentPoints: spread(variants.map((v) => v.cPercentOfReference)),
    });
  }
  return results.sort((a, b) => a.modelLine.localeCompare(b.modelLine));
}

// ---------------------------------------------------------------------------
// Step 6: candidate-pattern evaluation with a hold-out validation split.
//
// For each family with >= 4 deduction points for a given profile (B or C),
// split into a fit set (first ~70%, deterministic by deviceKey sort - no
// randomness so results are reproducible) and a held-out set. Fit two
// candidate rules on the fit set:
//   - FLAT_RUPEES: mean absoluteDeductionRupees
//   - PERCENT_OF_REFERENCE: mean percentOfReference
// Then compute each candidate's residual error against the held-out set.
// Families with < 4 points are reported as "insufficient for hold-out
// validation" rather than given a fabricated rule.
// ---------------------------------------------------------------------------

interface CandidateEvaluation {
  familyKey: string;
  profile: 'B' | 'C';
  totalPoints: number;
  status: 'EVALUATED' | 'INSUFFICIENT_FOR_HOLDOUT';
  fitSetSize?: number;
  holdoutSetSize?: number;
  candidates?: Array<{
    pattern: 'FLAT_RUPEES' | 'PERCENT_OF_REFERENCE';
    fittedValue: number; // rupees for FLAT_RUPEES, percent for PERCENT_OF_REFERENCE
    fittedFromN: number;
    holdoutMeanAbsoluteErrorRupees: number;
    holdoutMeanAbsoluteErrorPercentOfReference: number;
  }>;
  supportingObservations: DeductionPoint[]; // the full point set (fit + holdout), for transparency
}

function evaluateCandidates(points: DeductionPoint[], profile: 'B' | 'C', familyKey: string): CandidateEvaluation {
  const sorted = [...points].sort((a, b) => a.deviceKey.localeCompare(b.deviceKey));

  if (sorted.length < 4) {
    return {
      familyKey,
      profile,
      totalPoints: sorted.length,
      status: 'INSUFFICIENT_FOR_HOLDOUT',
      supportingObservations: sorted,
    };
  }

  const fitSize = Math.max(2, Math.round(sorted.length * 0.7));
  const fitSet = sorted.slice(0, fitSize);
  const holdoutSet = sorted.slice(fitSize);

  if (holdoutSet.length === 0) {
    return {
      familyKey,
      profile,
      totalPoints: sorted.length,
      status: 'INSUFFICIENT_FOR_HOLDOUT',
      supportingObservations: sorted,
    };
  }

  const flatFitted = mean(fitSet.map((p) => p.absoluteDeductionRupees))!;
  const percentFitted = mean(fitSet.map((p) => p.percentOfReference))!;

  const flatHoldoutErrorsRupees = holdoutSet.map((p) => Math.abs(p.absoluteDeductionRupees - flatFitted));
  const flatHoldoutErrorsPercent = holdoutSet.map((p) =>
    p.reference > 0 ? Math.abs((flatFitted / p.reference) * 100 - p.percentOfReference) : NaN
  );

  const percentHoldoutErrorsRupees = holdoutSet.map((p) =>
    Math.abs((percentFitted / 100) * p.reference - p.absoluteDeductionRupees)
  );
  const percentHoldoutErrorsPercent = holdoutSet.map((p) => Math.abs(percentFitted - p.percentOfReference));

  return {
    familyKey,
    profile,
    totalPoints: sorted.length,
    status: 'EVALUATED',
    fitSetSize: fitSet.length,
    holdoutSetSize: holdoutSet.length,
    candidates: [
      {
        pattern: 'FLAT_RUPEES',
        fittedValue: round(flatFitted, 2),
        fittedFromN: fitSet.length,
        holdoutMeanAbsoluteErrorRupees: round(mean(flatHoldoutErrorsRupees) ?? NaN, 2),
        holdoutMeanAbsoluteErrorPercentOfReference: round(
          mean(flatHoldoutErrorsPercent.filter((v) => Number.isFinite(v))) ?? NaN,
          2
        ),
      },
      {
        pattern: 'PERCENT_OF_REFERENCE',
        fittedValue: round(percentFitted, 2),
        fittedFromN: fitSet.length,
        holdoutMeanAbsoluteErrorRupees: round(mean(percentHoldoutErrorsRupees) ?? NaN, 2),
        holdoutMeanAbsoluteErrorPercentOfReference: round(mean(percentHoldoutErrorsPercent) ?? NaN, 2),
      },
    ],
    supportingObservations: sorted,
  };
}

// ---------------------------------------------------------------------------
// Step 7: "highest-value next experiments" - rank families/devices by data
// gaps (no damage-condition data at all) and by variance (high spread in
// existing C deductions = low calibration confidence).
// ---------------------------------------------------------------------------

interface NextExperimentRecommendation {
  familyKey: string;
  devicesInFamily: number;
  devicesWithAnyCompletedProfile: number;
  devicesWithCompletedC: number;
  devicesWithCompletedB: number;
  cVariancePercentPoints: number | null; // stddev of C percentOfReference, if >= 2 points
  reason: string;
  priority: number; // higher = more valuable to collect next
}

function nextExperimentRecommendations(
  familyToDevices: Map<string, DeviceObservation[]>,
  cPointsByFamily: Map<string, DeductionPoint[]>,
  bPointsByFamily: Map<string, DeductionPoint[]>
): NextExperimentRecommendation[] {
  const recs: NextExperimentRecommendation[] = [];

  for (const [familyKey, devices] of familyToDevices) {
    const withAny = devices.filter((d) => d.A != null || d.B != null || d.C != null).length;
    const cPoints = cPointsByFamily.get(familyKey) ?? [];
    const bPoints = bPointsByFamily.get(familyKey) ?? [];
    const cVariance = cPoints.length >= 2 ? stddev(cPoints.map((p) => p.percentOfReference)) : null;

    let priority = 0;
    let reason: string;

    if (cPoints.length === 0) {
      priority = 100 + devices.length; // no damage-condition data at all: highest priority, scaled by family size
      reason = 'No completed damage-condition (Profile C) observations in this family - zero calibration data for screen-defect deductions.';
    } else if (cVariance != null && cVariance > 5) {
      priority = 50 + cVariance;
      reason = `High variance (stddev ${round(cVariance, 2)} percentage points) in Profile C deduction across ${cPoints.length} devices - low confidence in a single rule for this family.`;
    } else {
      priority = 10 - Math.min(cPoints.length, 9); // more points = lower priority to add more
      reason = `${cPoints.length} completed Profile C observation(s); consider only if other higher-priority families are exhausted.`;
    }

    recs.push({
      familyKey,
      devicesInFamily: devices.length,
      devicesWithAnyCompletedProfile: withAny,
      devicesWithCompletedC: cPoints.length,
      devicesWithCompletedB: bPoints.length,
      cVariancePercentPoints: cVariance != null ? round(cVariance, 2) : null,
      reason,
      priority: round(priority, 2),
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const store = getResearchStore();
  let rows: CompletedRow[] = [];
  try {
    rows = (await store.listCompleted(brandFilter ? { brandFilter } : undefined)) as unknown as CompletedRow[];
  } finally {
    // Always release the DB connection, even on error, so this script never
    // leaves a hanging Postgres client behind.
    await store.disconnect().catch(() => {});
  }

  const deviceObsMap = buildDeviceObservations(rows);
  const deviceObs = [...deviceObsMap.values()];

  const bPoints = deductionPoints(deviceObs, 'B');
  const cPoints = deductionPoints(deviceObs, 'C');
  const bPointsSkipped = deviceObs.filter((d) => d.A != null && d.B == null);
  const cPointsSkipped = deviceObs.filter((d) => d.A != null && d.C == null);

  const baseline = baselinePoints(deviceObs);

  const byBrand = (p: DeductionPoint) => p.brand;
  const byFamily = (p: DeductionPoint) => familyLabel(p.brand, p.model);

  const bConsistencyByBrand = groupConsistency(bPoints, byBrand, 'brand');
  const bConsistencyByFamily = groupConsistency(bPoints, byFamily, 'family');
  const cConsistencyByBrand = groupConsistency(cPoints, byBrand, 'brand');
  const cConsistencyByFamily = groupConsistency(cPoints, byFamily, 'family');

  const variantCmp = variantComparisons(deviceObs, bPoints, cPoints);

  // Group deduction points by family for candidate evaluation.
  const cByFamilyMap = new Map<string, DeductionPoint[]>();
  for (const p of cPoints) {
    const key = familyLabel(p.brand, p.model);
    if (!cByFamilyMap.has(key)) cByFamilyMap.set(key, []);
    cByFamilyMap.get(key)!.push(p);
  }
  const bByFamilyMap = new Map<string, DeductionPoint[]>();
  for (const p of bPoints) {
    const key = familyLabel(p.brand, p.model);
    if (!bByFamilyMap.has(key)) bByFamilyMap.set(key, []);
    bByFamilyMap.get(key)!.push(p);
  }

  const cCandidateEvaluations = [...cByFamilyMap.entries()].map(([familyKey, pts]) =>
    evaluateCandidates(pts, 'C', familyKey)
  );
  const bCandidateEvaluations = [...bByFamilyMap.entries()].map(([familyKey, pts]) =>
    evaluateCandidates(pts, 'B', familyKey)
  );

  // Family -> all devices in that family (for next-experiment gap analysis).
  const familyToDevices = new Map<string, DeviceObservation[]>();
  for (const d of deviceObs) {
    const key = familyLabel(d.brand, d.model);
    if (!familyToDevices.has(key)) familyToDevices.set(key, []);
    familyToDevices.get(key)!.push(d);
  }

  const nextExperiments = nextExperimentRecommendations(familyToDevices, cByFamilyMap, bByFamilyMap);

  const report = {
    disclaimer:
      'READ-ONLY calibration proposal. This tool never writes to pricing config, ReferencePrice, or the Fhoneify pricing calculator. ' +
      'Every number below is derived only from COMPLETED CashifyResearchExperiment rows - nothing is invented or imputed for ' +
      'skipped/unsupported devices. A human (the repo owner) must review and explicitly approve any resulting change to ' +
      'lib/pricingCalculator.ts per AGENTS.md ("Do not invent new penalty percentages"; pricing rules "must NOT be changed casually").',
    inputSummary: {
      totalCompletedExperimentRows: rows.length,
      distinctDevicesWithAnyCompletedProfile: deviceObs.length,
      devicesWithCompletedBaselineA: deviceObs.filter((d) => d.A != null).length,
      devicesWithCompletedB: bPoints.length,
      devicesWithCompletedC: cPoints.length,
      devicesWithBaselineButNoCompletedB: bPointsSkipped.length,
      devicesWithBaselineButNoCompletedC: cPointsSkipped.length,
      brandFilterApplied: brandFilter ?? null,
    },
    groupingMethodNote:
      'Primary grouping is lib/pricing/families.ts classifyPricingFamily() (brand + engine + generation/segment), ' +
      'matching the pricing engine\'s own dispatch so a calibrated coefficient maps directly onto a code branch. ' +
      'RAM/storage-variant comparison additionally groups by raw brand+model (modelLineKey) since families.ts does ' +
      'not distinguish storage.',
    cleanBaselineVsReference: {
      description: 'Profile A (clean baseline) finalQuote vs originalGetUptoReference, for every device with a completed A.',
      points: baseline,
    },
    profileBVsA: {
      description:
        'Profile B vs Profile A, only for devices with a COMPLETED and SUPPORTED Profile B. Devices with a baseline but ' +
        'no completed B (e.g. UNSUPPORTED, still pending) are listed separately and never assigned an imputed number.',
      points: bPoints,
      devicesSkipped: bPointsSkipped.map((d) => ({ deviceKey: d.deviceKey, brand: d.brand, model: d.model, storage: d.storage })),
    },
    profileCVsA: {
      description: 'Profile C (screen-defect condition) vs Profile A, only for devices with both completed.',
      points: cPoints,
      devicesSkipped: cPointsSkipped.map((d) => ({ deviceKey: d.deviceKey, brand: d.brand, model: d.model, storage: d.storage })),
    },
    consistencyAcrossGenerations: {
      description:
        'Variance/stddev of percent-of-reference deduction across devices grouped by brand and by pricing family. ' +
        'Outliers are points more than 1.5 stddev from the group mean (only computed for groups with >= 3 points, ' +
        'so stddev is not degenerate).',
      profileB: { byBrand: bConsistencyByBrand, byFamily: bConsistencyByFamily },
      profileC: { byBrand: cConsistencyByBrand, byFamily: cConsistencyByFamily },
    },
    ramStorageVariantComparison: {
      description:
        'For the same brand+model with 2+ observed storage variants: how much does baseline-vs-reference %, ' +
        'Profile B %, and Profile C % spread across variants? A small spread suggests deductions move together ' +
        '(storage-independent); a large spread suggests they diverge.',
      comparisons: variantCmp,
    },
    candidatePatternEvaluation: {
      description:
        'For each pricing family with >= 4 completed deduction points for a profile, fit FLAT_RUPEES and ' +
        'PERCENT_OF_REFERENCE candidates on a ~70% fit split (deterministic, sorted by deviceKey) and report the ' +
        'mean-absolute-error of each candidate against the held-out ~30%. Families with < 4 points are reported as ' +
        'INSUFFICIENT_FOR_HOLDOUT rather than given a fabricated rule. This evaluates only single-defect deductions; ' +
        'a MIXED (flat-below/percent-above) or GENERATION_DEPENDENT pattern is not separately fitted here - use the ' +
        'per-family and per-generation (family-grouped) breakdown above to judge by eye whether the deduction rule ' +
        'changes shape across price bands or generations before proposing a mixed/generation-dependent rule.',
      profileB: bCandidateEvaluations,
      profileC: cCandidateEvaluations,
    },
    conditionInteractionsCaveat:
      'Each experiment collects at most 3 quotes per device (A, B, C). This CANNOT establish multi-defect interaction ' +
      'effects (e.g. "screen crack AND dead touch together" vs the two effects added independently). No interaction ' +
      'coefficient is proposed or should be inferred from this data.',
    highestValueNextExperiments: {
      description:
        'Families ranked by how much they would benefit from additional single-condition profiles (e.g. a body-damage' +
        '-only profile, a functional-defect-only profile), based on (1) having zero completed damage-condition (C) ' +
        'data at all, and (2) high variance in existing C deductions.',
      recommendations: nextExperiments,
    },
  };

  if (jsonOutFile) {
    const outPath = path.resolve(jsonOutFile);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Wrote JSON report to ${outPath}`);
  }

  console.log('=== Cashify Pricing Research - Calibration Proposal (READ-ONLY) ===');
  console.log(report.disclaimer);
  console.log('');
  console.log('Input summary:', report.inputSummary);

  if (deviceObs.length === 0) {
    console.log('\nNo completed experiments found. Nothing to analyze yet - this is expected before the collector has run.');
    if (!jsonOutFile) console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('\n-- Clean baseline (A) vs reference --');
  console.table(
    baseline.map((p) => ({
      device: `${p.brand} ${p.model} ${p.storage}`,
      reference: p.reference,
      baseline: p.baseline,
      diffRs: p.absoluteRupees,
      diffPct: `${p.percentOfReference}%`,
    }))
  );

  console.log(`\n-- Profile B vs A (${bPoints.length} supported, ${bPointsSkipped.length} skipped/unsupported/missing) --`);
  if (bPoints.length > 0) {
    console.table(
      bPoints.map((p) => ({
        device: `${p.brand} ${p.model} ${p.storage}`,
        baseline: p.baseline,
        bQuote: p.quote,
        deductionRs: p.absoluteDeductionRupees,
        pctOfBaseline: `${p.percentOfBaseline}%`,
        pctOfReference: `${p.percentOfReference}%`,
      }))
    );
  }

  console.log(`\n-- Profile C vs A (${cPoints.length} available, ${cPointsSkipped.length} missing) --`);
  if (cPoints.length > 0) {
    console.table(
      cPoints.map((p) => ({
        device: `${p.brand} ${p.model} ${p.storage}`,
        baseline: p.baseline,
        cQuote: p.quote,
        deductionRs: p.absoluteDeductionRupees,
        pctOfBaseline: `${p.percentOfBaseline}%`,
        pctOfReference: `${p.percentOfReference}%`,
      }))
    );
  }

  console.log('\n-- Consistency across generations (Profile C, by family) --');
  console.table(
    cConsistencyByFamily.map((g) => ({
      family: g.groupKey,
      n: g.n,
      meanPct: g.meanPercentOfReference,
      stddevPct: g.stddevPercentOfReference,
      outliers: g.outliers.length,
    }))
  );

  console.log('\n-- RAM/storage variant comparisons --');
  console.table(
    variantCmp.map((v) => ({
      modelLine: `${v.brand} ${v.model}`,
      variants: v.variants.length,
      baselineSpreadPts: v.baselineSpreadPercentPoints,
      bSpreadPts: v.bSpreadPercentPoints,
      cSpreadPts: v.cSpreadPercentPoints,
    }))
  );

  console.log('\n-- Candidate pattern evaluation (Profile C, per family) --');
  console.table(
    cCandidateEvaluations.map((e) => ({
      family: e.familyKey,
      totalPoints: e.totalPoints,
      status: e.status,
      flatFittedRs: e.candidates?.[0]?.fittedValue ?? null,
      flatHoldoutMAE_Rs: e.candidates?.[0]?.holdoutMeanAbsoluteErrorRupees ?? null,
      pctFittedPct: e.candidates?.[1]?.fittedValue ?? null,
      pctHoldoutMAE_pct: e.candidates?.[1]?.holdoutMeanAbsoluteErrorPercentOfReference ?? null,
    }))
  );

  console.log('\n-- Highest-value next experiments (top 10) --');
  console.table(
    nextExperiments.slice(0, 10).map((r) => ({
      family: r.familyKey,
      devices: r.devicesInFamily,
      completedC: r.devicesWithCompletedC,
      completedB: r.devicesWithCompletedB,
      cVariancePts: r.cVariancePercentPoints,
      priority: r.priority,
      reason: r.reason,
    }))
  );

  console.log('\nNote: with only 3 quotes/device (A, B, C), multi-defect interaction effects cannot be established - none are proposed.');
  console.log('This proposal is for owner review only; it changes nothing in lib/pricingCalculator.ts.');
}

main().catch((error) => {
  console.error('[pricing-research:analyze] failed:', error);
  process.exitCode = 1;
});
