/**
 * Offline Cashify experiment planner.
 *
 *   npx tsx scripts/research-design/plan.ts [--out <dir>] [--questionnaire <snapshot.json>] [--seed <s>]
 *
 * Reads only committed catalog files (and an optional questionnaire snapshot
 * file). Never navigates Cashify, never needs OTP or secrets, never touches a
 * database, never writes outside --out, never dispatches workflows.
 * Deterministic: same inputs + seed => byte-identical output.
 */
import { buildModelIndex, BuildInputs, ModelEntry } from './catalog';
import { selectSample, DEFAULT_SAMPLING, SamplingConfig, Selection } from './sampling';
import {
  DEFAULT_DESIGN, DesignConfig, PlannedBlock, PlannedDevice, PlannedExperiment,
  assignPairs, buildDeviceExperiments, packBlocks, pickFactorialAnchors, plannedDevice, storageContrastVariant,
  CANDIDATE_PAIRS, CORE_LEVELS, FRACTIONAL_FACTORS, LADDER, VALIDATION_PROFILES,
} from './design';
import { FACTORS, UNVERIFIED_QUESTION_TEXT } from './factors';
import { DEFAULT_VALIDITY } from './analysis';

export const PLAN_VERSION = 'cashify-design/2';

/** Observed seconds per COMPLETED quote: gaps between consecutive
 * observations ending in COMPLETED, 19 gaps from the 49 pilot observations
 * in CashifyResearchObservation (9 batches, 2026-09-30, read-only query). */
export const OBSERVED_SPEEDS = [
  { label: 'fast (p10)', secondsPerQuote: 17 },
  { label: 'typical (p50)', secondsPerQuote: 32 },
  { label: 'slow (p90)', secondsPerQuote: 75 },
];
/** Pilot outcome mix: 26 COMPLETED / 18 UNSUPPORTED / 3 FAILED / 2 AUTH of 49. */
export const PILOT_COMPLETION_RATE = 26 / 49;

export interface EstimateConfig {
  /** GitHub Actions job ceiling is 6 h; plan batches to 5 h. */
  batchWallClockHours: number;
}

export function estimate(experiments: PlannedExperiment[], variantCount: number, cfg: EstimateConfig = { batchWallClockHours: 5 }) {
  const n = experiments.length;
  const by = (key: (e: PlannedExperiment) => string) => {
    const out: Record<string, number> = {};
    for (const e of experiments) out[key(e)] = (out[key(e)] ?? 0) + 1;
    return Object.fromEntries(Object.entries(out).sort());
  };
  const runtime = OBSERVED_SPEEDS.map((s) => {
    const hours = (n * s.secondsPerQuote) / 3600;
    const perBatch = Math.floor((cfg.batchWallClockHours * 3600) / s.secondsPerQuote);
    return {
      speed: s.label, secondsPerQuote: s.secondsPerQuote,
      totalHours: Number(hours.toFixed(1)),
      quotesPerBatch: perBatch,
      batches: Math.ceil(n / perBatch),
    };
  });
  const original = variantCount * 3;
  return {
    totalQuotationRequests: n,
    byRole: by((e) => e.role),
    byPhase: by((e) => `phase${e.phase}`),
    byPrimaryKind: by((e) => e.kinds[0]),
    expectedCompletedAtPilotRate: Math.round(n * PILOT_COMPLETION_RATE),
    pilotCompletionRate: Number(PILOT_COMPLETION_RATE.toFixed(3)),
    runtime,
    comparisonWithOriginal: {
      originalDesign: `${variantCount} catalog variants x 3 profiles (A/B/C)`,
      originalRequests: original,
      thisDesignRequests: n,
      ratio: Number((n / original).toFixed(2)),
      originalRuntimeHoursAtTypical: Number(((original * 32) / 3600).toFixed(1)),
    },
  };
}

export const ADAPTIVE_RULES = [
  {
    id: 'R1-drop-null-factor',
    when: 'after Phase 1 (anchors)',
    rule: 'A factor level whose |deduction| <= 20 Rs in every valid anchor block (>= 8 anchors observed, spanning >= 3 price bands) is dropped from CORE blocks not yet collected.',
    why: 'no measurable effect; spend requests where there is signal',
  },
  {
    id: 'R2-promote-model-dependent',
    when: 'after Phase 1',
    rule: 'A priority-2 factor whose anchor deductions fit neither CONSTANT_RUPEES nor PROPORTIONAL (fitDeductionForm r2 < 0.8) is added to CORE blocks.',
    why: 'deduction depends on the model in a way the anchors cannot generalise',
  },
  {
    id: 'R3-thin-settled-pairs',
    when: 'after Phase 1',
    rule: 'A pair classified identically (same InteractionClass, discrimination > tolerance) on every anchor where it was discriminable is reduced to 1 CORE device per price-band group.',
    why: 'combination rule already settled',
  },
  {
    id: 'R4-expand-disagreeing-pairs',
    when: 'after Phase 1 and after every 25 CORE blocks',
    rule: 'A pair whose class differs between anchors is added to 3 more CORE devices in the band group where classes disagree.',
    why: 'resolve a condition-dependent interaction',
  },
  {
    id: 'R5-recollect-drifted-blocks',
    when: 'continuously',
    rule: 'A block that fails blockValidity (baseline drift, Get Upto change, fingerprint change, window exceeded) is re-queued once; a second failure marks the device DRIFT_UNSTABLE.',
    why: 'never mix prices from different Cashify baselines',
  },
  {
    id: 'R6-escalate-stratum',
    when: 'after Phase 2',
    rule: 'If the out-of-sample MAPE of the fitted rule on a brand x band stratum exceeds 5%, add 2 more CORE models from that stratum.',
    why: 'the stratum is heterogeneous; the sample was too thin there',
  },
];

export const STOPPING_CRITERIA = [
  'Every priority-1 factor level has deductions from >= 3 valid blocks in each price-band group (low/mid/high) where the question is asked.',
  'For every priority-1 factor level the deduction form (CONSTANT_RUPEES / PROPORTIONAL / AFFINE) is stable: adding the last 20% of blocks changes the fitted slope and intercept by < 10%.',
  'Every candidate pair has an InteractionClass on >= 3 devices where discrimination > tolerance, or is documented as not discriminable.',
  'Held-out validation (plan VALIDATION devices + prospective POCO comparisons with verified answers): MAPE <= 3% and |bias| <= 1% of Get Upto overall, and MAPE <= 5% in every brand with >= 3 validation devices.',
  'Hard stop: 2 consecutive batches ending AUTH_REQUIRED without a new session, or > 20% of blocks invalid in a batch (suggests Cashify changed its questionnaire).',
];

export interface Plan {
  planVersion: string;
  seed: string;
  inputs: { catalogRows: number; variants: number; models: number; skippedRows: number; duplicateRows: number; questionnaireSnapshot: boolean };
  config: { sampling: SamplingConfig; design: DesignConfig; validity: typeof DEFAULT_VALIDITY };
  factors: typeof FACTORS;
  unverifiedQuestionText: string[];
  candidatePairs: typeof CANDIDATE_PAIRS;
  coreLevels: typeof CORE_LEVELS;
  ladder: typeof LADDER;
  fractionalFactors: typeof FRACTIONAL_FACTORS;
  validationProfiles: typeof VALIDATION_PROFILES;
  sampling: {
    cells: ReturnType<typeof selectSample>['cells'];
    ineligible: ReturnType<typeof selectSample>['ineligible'];
    groupEvidence: Record<string, string[]>;
  };
  devices: PlannedDevice[];
  blocks: PlannedBlock[];
  experiments: PlannedExperiment[];
  adaptiveRules: typeof ADAPTIVE_RULES;
  stoppingCriteria: string[];
  estimate: ReturnType<typeof estimate>;
  stats: Record<string, unknown>;
}

export function buildPlan(
  inputs: BuildInputs,
  opts: { sampling?: Partial<SamplingConfig>; design?: Partial<DesignConfig> } = {},
): Plan {
  const sampling = { ...DEFAULT_SAMPLING, ...opts.sampling };
  const design = { ...DEFAULT_DESIGN, seed: sampling.seed, ...opts.design };
  const index = buildModelIndex(inputs);
  const sample = selectSample(index.models, sampling);

  const reps: Array<{ sel: Selection; device: PlannedDevice }> = sample.selections.map((sel) => ({
    sel, device: plannedDevice(sel, sel.model.representative!, 'REPRESENTATIVE'),
  }));
  const core = reps.filter((r) => r.sel.role === 'CORE').map((r) => r.device);
  const anchors = reps.filter((r) => r.sel.role === 'ANCHOR').map((r) => r.device);
  const pairLoad = assignPairs(core, design);
  const factorial = pickFactorialAnchors(anchors);

  // Storage contrasts: every anchor + one CORE model per brand.
  const contrastModels: Selection[] = [];
  const brandsDone = new Set<string>();
  for (const r of reps) {
    if (r.sel.role === 'ANCHOR') contrastModels.push(r.sel);
  }
  for (const r of reps) {
    if (r.sel.role !== 'CORE' || brandsDone.has(r.sel.model.brand)) continue;
    if (storageContrastVariant(r.sel.model, design.storageContrastMinGap)) { contrastModels.push(r.sel); brandsDone.add(r.sel.model.brand); }
  }

  const devices: PlannedDevice[] = [];
  const blocks: PlannedBlock[] = [];
  const experiments: PlannedExperiment[] = [];
  const emit = (device: PlannedDevice, builder: ReturnType<typeof buildDeviceExperiments>) => {
    const packed = packBlocks(builder, design);
    devices.push(device);
    blocks.push(...packed.blocks);
    experiments.push(...packed.experiments);
  };
  for (const r of reps) {
    emit(r.device, buildDeviceExperiments(r.device, pairLoad.get(r.device.deviceKey) ?? [], {
      factorial: factorial.has(r.device.deviceKey), kind: 'FULL',
    }));
  }
  for (const sel of contrastModels) {
    const v = storageContrastVariant(sel.model, design.storageContrastMinGap);
    if (!v) continue;
    const d = plannedDevice(sel, v, 'STORAGE_CONTRAST');
    emit(d, buildDeviceExperiments(d, [], { factorial: false, kind: 'STORAGE_CONTRAST' }));
  }

  // Candidate groups (Part 2 distinction).
  const fams = new Set(index.models.map((m: ModelEntry) => m.fhoneifyFamily));
  const groupEvidence = {
    inferredFromFhoneifyCode: [...fams].sort(),
    supportedByCashifyObservations: [] as string[],
    needsInvestigation: [...fams].sort(),
  };

  const count = (xs: string[]) => {
    const o: Record<string, number> = {};
    for (const x of xs) o[x] = (o[x] ?? 0) + 1;
    return Object.fromEntries(Object.entries(o).sort());
  };
  const repDevices = devices.filter((d) => d.variantRole === 'REPRESENTATIVE');
  const stats = {
    modelsByRole: count(repDevices.map((d) => d.role)),
    storageContrastVariants: devices.length - repDevices.length,
    trainingModelsByBrand: count(repDevices.filter((d) => d.role !== 'VALIDATION').map((d) => d.brand)),
    validationModelsByBrand: count(repDevices.filter((d) => d.role === 'VALIDATION').map((d) => d.brand)),
    trainingModelsByBand: count(repDevices.filter((d) => d.role !== 'VALIDATION').map((d) => d.strata.priceBand)),
    trainingModelsByFhoneifyFamily: count(repDevices.filter((d) => d.role !== 'VALIDATION').map((d) => d.strata.fhoneifyFamily)),
    fhoneifyFamiliesCoveredByTraining: new Set(repDevices.filter((d) => d.role !== 'VALIDATION').map((d) => d.strata.fhoneifyFamily)).size,
    fhoneifyFamiliesInCatalog: fams.size,
    blocks: blocks.length,
    experimentsByIsolation: count(experiments.map((e) => e.isolation)),
    experimentsNeedingRuntimeConfirmation: experiments.filter((e) => e.requiresRuntimeConfirmation.length).length,
    blindValidationExperiments: experiments.filter((e) => e.blind).length,
    distinctOfatContrasts: experiments.filter((e) => e.kinds.includes('OFAT')).length,
    pairExperiments: experiments.filter((e) => e.kinds.includes('PAIR')).length,
    pairCoverageDevices: Object.fromEntries(CANDIDATE_PAIRS.map((p) => [p.id,
      new Set(experiments.filter((e) => e.kinds.includes('PAIR') && e.purposes.some((x) => x.startsWith(`pair ${p.id}:`))).map((e) => e.deviceKey)).size])),
    factorialDevices: factorial.size,
  };

  return {
    planVersion: PLAN_VERSION,
    seed: sampling.seed,
    inputs: {
      catalogRows: inputs.rows.length,
      variants: index.variantCount,
      models: index.models.length,
      skippedRows: index.skippedRows,
      duplicateRows: index.duplicateRows,
      questionnaireSnapshot: !!inputs.questionnaire,
    },
    config: { sampling, design, validity: DEFAULT_VALIDITY },
    factors: FACTORS,
    unverifiedQuestionText: [...UNVERIFIED_QUESTION_TEXT].sort(),
    candidatePairs: CANDIDATE_PAIRS,
    coreLevels: CORE_LEVELS,
    ladder: LADDER,
    fractionalFactors: FRACTIONAL_FACTORS,
    validationProfiles: VALIDATION_PROFILES,
    sampling: { cells: sample.cells, ineligible: sample.ineligible, groupEvidence },
    devices,
    blocks,
    experiments,
    adaptiveRules: ADAPTIVE_RULES,
    stoppingCriteria: STOPPING_CRITERIA,
    estimate: estimate(experiments, index.variantCount),
    stats,
  };
}

// ---------------------------------------------------------------------------
// Output

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(plan: Plan): string {
  const deviceByKey = new Map(plan.devices.map((d) => [d.deviceKey, d]));
  const factorIds = plan.factors.map((f) => f.id);
  const header = ['experimentId', 'blockId', 'order', 'phase', 'role', 'kinds', 'brand', 'model', 'storage', 'ram', 'getUpto', 'priceBand',
    'fhoneifyFamily', 'baselineExperimentId', 'changes', 'forceCheckboxes', 'referenceExperimentIds', 'isolation', 'requiresRuntimeConfirmation', 'blind',
    ...factorIds];
  const lines = [header.join(',')];
  for (const e of plan.experiments) {
    const d = deviceByKey.get(e.deviceKey)!;
    lines.push([
      e.experimentId, e.blockId, e.order, e.phase, e.role, e.kinds.join('|'), d.brand, d.model, d.storage, d.ram, d.getUpto, d.strata.priceBand,
      d.strata.fhoneifyFamily, e.baselineExperimentId, e.changes.map((c) => `${c.factorId}:${c.from}->${c.to}`).join('|'),
      e.forceCheckboxes.join('|'), e.referenceExperimentIds.join('|'), e.isolation, e.requiresRuntimeConfirmation.join('|'), e.blind,
      ...factorIds.map((f) => (e.answers[f] === null ? 'NOT_ASKED' : e.answers[f])),
    ].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

/**
 * JSON form written to disk. Answer vectors are arrays aligned with
 * `answerOrder` (null = NOT_ASKED) - the same complete vector, without
 * repeating 36 key names per experiment. `expandAnswers` restores objects.
 */
export function serializePlan(plan: Plan) {
  const answerOrder = plan.factors.map((f) => f.id);
  const vec = (a: Record<string, string | null>) => answerOrder.map((k) => a[k]);
  return {
    ...plan,
    answerOrder,
    devices: plan.devices.map((d) => ({ ...d, baselineAnswers: vec(d.baselineAnswers) })),
    experiments: plan.experiments.map(({ answers, ...rest }) => ({ ...rest, answerVector: vec(answers) })),
  };
}

export function expandAnswers(answerOrder: string[], vector: Array<string | null>): Record<string, string | null> {
  return Object.fromEntries(answerOrder.map((k, i) => [k, vector[i]]));
}

export function summarize(plan: Plan) {
  return {
    planVersion: plan.planVersion,
    seed: plan.seed,
    inputs: plan.inputs,
    stats: plan.stats,
    estimate: plan.estimate,
    ineligibleModels: plan.sampling.ineligible.length,
    strataCells: plan.sampling.cells.length,
  };
}

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const args = process.argv.slice(2);
  const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const out = path.resolve(arg('--out') ?? path.join(__dirname, 'output'));
  const { loadRealInputs } = await import('./catalog');
  const inputs = await loadRealInputs(arg('--questionnaire'));
  const plan = buildPlan(inputs, arg('--seed') ? { sampling: { seed: arg('--seed')! } } : {});
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'experiment-plan.json'), JSON.stringify(serializePlan(plan)) + '\n');
  fs.writeFileSync(path.join(out, 'experiment-plan.csv'), toCsv(plan));
  fs.writeFileSync(path.join(out, 'plan-summary.json'), JSON.stringify(summarize(plan), null, 2) + '\n');
  console.log(JSON.stringify(summarize(plan), null, 2));
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
