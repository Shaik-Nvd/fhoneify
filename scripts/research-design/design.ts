/**
 * Experiment generation: turns selected models into blocks of fully
 * specified Cashify answer vectors.
 *
 * Invariants (enforced by tests):
 *   - every experiment carries a value for EVERY factor: a level id, or null
 *     only when that question is NOT_ASKED for the device;
 *   - a NOT_ASKED factor is never varied, and null is never read as "No";
 *   - an OFAT experiment differs from its block baseline in exactly one
 *     factor; sub-page sibling answers are stated explicitly;
 *   - a PAIR/LADDER experiment's single-factor references are in the same
 *     block, so every deduction is computed against a baseline collected in
 *     the same session window;
 *   - each block opens and closes with a clean baseline (drift bracket).
 */
import { FACTORS, Factor, getFactor, UNVERIFIED_QUESTION_TEXT, QuestionMode } from './factors';
import { ModelEntry, Variant, PriceBand } from './catalog';
import { Role, Selection, fnv1a } from './sampling';

export type StatusSource = 'always_rendered' | 'questionnaire_snapshot' | 'runtime_discovery' | 'physical_inference';

export interface QuestionState {
  status: QuestionMode;
  source: StatusSource;
  note?: string;
}

/** factorId -> level id, or null iff the question is NOT_ASKED. */
export type AnswerVector = Record<string, string | null>;

export type ExperimentKind =
  | 'BASELINE_OPEN' | 'BASELINE_CLOSE' | 'OFAT' | 'CHECKBOX_NULL' | 'PAIR'
  | 'LADDER' | 'FRACTIONAL' | 'STORAGE_CONTRAST' | 'VALIDATION_PROFILE' | 'REPLICATE';

export type Isolation = 'CLEAN' | 'SUBPAGE_SIBLINGS_HELD' | 'CONDITIONAL_CONFOUNDED';

export interface Change { factorId: string; from: string | null; to: string | null }

export interface PlannedExperiment {
  experimentId: string;
  blockId: string;
  deviceKey: string;
  modelKey: string;
  role: Role;
  phase: 1 | 2;
  kinds: ExperimentKind[];
  purposes: string[];
  order: number;
  answers: AnswerVector;
  /** Defect-page checkboxes to tick even though every sub-question on that
   * page is answered "none". Otherwise a checkbox is ticked iff some factor
   * on its page is at a non-baseline level. */
  forceCheckboxes: string[];
  changes: Change[];
  /** Set on REPLICATE copies: the experiment this repeats in another block. */
  replicateOf?: string;
  /** The block's opening baseline. Null only for the baselines themselves. */
  baselineExperimentId: string | null;
  /** Experiments this one must be compared with (the singles of a pair, the
   * previous ladder step, the confounder decomposition). */
  referenceExperimentIds: string[];
  isolation: Isolation;
  isolationNotes: string[];
  /** Changed factors whose presence is UNKNOWN: the collector must confirm
   * the question (by text) rendered, or record NOT_ASKED - never a price. */
  requiresRuntimeConfirmation: string[];
  /** When true, analysis must not look at the result until the hypothesis
   * is frozen (validation profiles). */
  blind: boolean;
}

export interface PlannedBlock {
  blockId: string;
  deviceKey: string;
  modelKey: string;
  role: Role;
  phase: 1 | 2;
  experimentIds: string[];
}

export interface PlannedDevice {
  deviceKey: string;
  modelKey: string;
  brand: string;
  model: string;
  storage: string;
  ram: string | null;
  cashifyLink: string | null;
  role: Role;
  variantRole: 'REPRESENTATIVE' | 'STORAGE_CONTRAST';
  selectionReasons: string[];
  strata: {
    fhoneifyFamily: string;
    series: string;
    generation: number | null;
    eraTercile: 0 | 1 | 2 | null;
    deviceClass: string;
    priceBand: PriceBand;
    exceptionTags: string[];
  };
  getUpto: number | null;
  getUptoVerifiedAt: string | null;
  questionStates: Record<string, QuestionState>;
  baselineAnswers: AnswerVector;
}

export interface DesignConfig {
  /** Max experiments per block including its two bracketing baselines. */
  maxBlockSize: number;
  /** Each candidate pair is assigned to this many CORE devices. */
  pairCoverageCore: number;
  maxPairsPerCoreDevice: number;
  /** Storage-contrast variant must differ from the representative's Get Upto
   * by at least this fraction. */
  storageContrastMinGap: number;
  seed: string;
}

export const DEFAULT_DESIGN: DesignConfig = {
  maxBlockSize: 30,
  pairCoverageCore: 9,
  maxPairsPerCoreDevice: 2,
  storageContrastMinGap: 0.15,
  seed: 'fhoneify-cashify-design-v2',
};

// ---------------------------------------------------------------------------
// Question status

export function resolveQuestionStates(model: ModelEntry): Record<string, QuestionState> {
  const out: Record<string, QuestionState> = {};
  for (const f of FACTORS) {
    switch (f.gate) {
      case 'ALWAYS':
        out[f.id] = { status: 'ASKED', source: 'always_rendered', note: 'core questionnaire page; collector still verifies the option text rendered' };
        break;
      case 'WARRANTY_MODE':
      case 'BILL_MODE': {
        const mode = f.gate === 'WARRANTY_MODE' ? model.warrantyMode : model.billMode;
        out[f.id] = mode === 'UNKNOWN'
          ? { status: 'UNKNOWN', source: 'runtime_discovery', note: 'no questionnaire snapshot for this model; the baseline run records whether it is asked' }
          : { status: mode, source: 'questionnaire_snapshot' };
        break;
      }
      case 'AGE_MODE':
        out[f.id] = {
          status: 'UNKNOWN', source: 'runtime_discovery',
          note: 'the age question is on the last page; the stored ageMode comes from a first-page parser that cannot see it, so it is never trusted here' +
            (model.exceptionTags.some((t) => t.startsWith('age_')) ? `; Fhoneify special-cases age for this model (${model.exceptionTags.filter((t) => t.startsWith('age_')).join(', ')})` : ''),
        };
        break;
      case 'MODEL_DEPENDENT_OPTION':
        if (f.id === 'sPen' && !model.exceptionTags.includes('s_pen')) {
          out[f.id] = { status: 'NOT_ASKED', source: 'physical_inference', note: 'device has no S Pen' };
        } else {
          out[f.id] = { status: 'UNKNOWN', source: 'runtime_discovery', note: 'option set varies by model; baseline run records whether the option is shown' };
        }
        break;
    }
  }
  return out;
}

export function baselineVector(states: Record<string, QuestionState>): AnswerVector {
  const v: AnswerVector = {};
  for (const f of FACTORS) v[f.id] = states[f.id].status === 'NOT_ASKED' ? null : f.baseline.id;
  return v;
}

// ---------------------------------------------------------------------------
// Which levels each role measures

/** CORE devices measure these levels; ANCHOR devices measure every level of
 * every applicable factor. */
export const CORE_LEVELS: Record<string, string[]> = {
  calls: ['no'], touch: ['no'], originalScreen: ['no'], warranty: ['no'], validBill: ['no'],
  screenCondition: ['scratch_1_2', 'scratch_gt2', 'cracked'],
  screenSpots: ['minor_1_2', 'heavy'],
  screenLines: ['visible_lines'],
  bodyScratches: ['scratch_1_2', 'scratch_gt2'],
  bodyDents: ['major'],
  bodyPanel: ['cracked'],
  bodyBent: ['bent'],
  hw_back_camera: ['faulty'], hw_front_camera: ['faulty'], hw_battery_service: ['faulty'],
  charger: ['missing'], box: ['missing'],
  mobileAge: ['6to11', 'above11'],
};

/** Candidate interactions (brief, Part 4). Candidates only - each is
 * generated for a device only if every factor is not NOT_ASKED there. */
export const CANDIDATE_PAIRS: Array<{ id: string; a: [string, string]; b: [string, string]; question: string }> = [
  { id: 'P01', a: ['bodyScratches', 'scratch_gt2'], b: ['bodyDents', 'major'], question: 'same body sub-page: additive, or one body deduction?' },
  { id: 'P02', a: ['screenCondition', 'cracked'], b: ['bodyDents', 'major'], question: 'cross-group screen + body' },
  { id: 'P03', a: ['originalScreen', 'no'], b: ['screenCondition', 'cracked'], question: 'replaced display + cracked: is the crack deduction conditional on originality?' },
  { id: 'P04', a: ['screenCondition', 'cracked'], b: ['touch', 'no'], question: 'screen damage + touch failure: overlapping screen-replacement cost?' },
  { id: 'P05', a: ['screenCondition', 'cracked'], b: ['hw_back_camera', 'faulty'], question: 'independent parts: expected additive/multiplicative' },
  { id: 'P06', a: ['warranty', 'no'], b: ['screenCondition', 'cracked'], question: 'warranty status x damage' },
  { id: 'P07', a: ['mobileAge', 'above11'], b: ['charger', 'missing'], question: 'accessories x age' },
  { id: 'P08', a: ['screenCondition', 'scratch_gt2'], b: ['bodyScratches', 'scratch_gt2'], question: 'the common "used phone" wear combination' },
  { id: 'P09', a: ['screenSpots', 'heavy'], b: ['screenLines', 'visible_lines'], question: 'same display sub-page: worst-of or sum?' },
  { id: 'P10', a: ['bodyPanel', 'cracked'], b: ['bodyBent', 'bent'], question: 'same panel sub-page: worst-of or sum?' },
  { id: 'P11', a: ['hw_battery_service', 'faulty'], b: ['hw_back_camera', 'faulty'], question: 'two hardware faults' },
  { id: 'P12', a: ['calls', 'no'], b: ['touch', 'no'], question: 'two core-function failures: floor/cap?' },
  { id: 'P13', a: ['charger', 'missing'], b: ['box', 'missing'], question: 'accessory bundle: additive or single "no accessories" deduction?' },
  { id: 'P14', a: ['mobileAge', 'above11'], b: ['screenCondition', 'cracked'], question: 'is the damage deduction taken from the aged value (multiplicative) or the original (additive)?' },
  { id: 'P15', a: ['warranty', 'no'], b: ['validBill', 'no'], question: 'ownership pair: overlapping?' },
];

/** Severity ladder (anchors): cumulative defects to expose floors and caps. */
export const LADDER: Array<[string, string]> = [
  ['screenCondition', 'cracked'],
  ['bodyDents', 'major'],
  ['bodyPanel', 'cracked'],
  ['hw_back_camera', 'faulty'],
  ['calls', 'no'],
  ['box', 'missing'],
];

/** 2^(5-1) resolution V fraction, generator E = ABCD. Main effects and all
 * ten two-factor interactions are mutually unaliased. Factors chosen from
 * different questionnaire pages and free of known conditional-page effects. */
export const FRACTIONAL_FACTORS: Array<[string, string]> = [
  ['screenCondition', 'cracked'],   // A
  ['bodyDents', 'major'],           // B
  ['hw_back_camera', 'faulty'],     // C
  ['box', 'missing'],               // D
  ['originalScreen', 'no'],         // E = ABCD
];

export function fractionalRuns(): number[][] {
  const runs: number[][] = [];
  for (let i = 0; i < 16; i++) {
    const a = i & 1 ? 1 : -1, b = i & 2 ? 1 : -1, c = i & 4 ? 1 : -1, d = i & 8 ? 1 : -1;
    runs.push([a, b, c, d, a * b * c * d]);
  }
  return runs;
}

/** Held-out validation profiles: realistic multi-defect customer states. */
export const VALIDATION_PROFILES: Array<{ id: string; label: string; set: Array<[string, string]> }> = [
  { id: 'V1', label: 'light wear', set: [['screenCondition', 'scratch_1_2'], ['bodyScratches', 'scratch_1_2'], ['box', 'missing'], ['mobileAge', 'above11']] },
  { id: 'V2', label: 'typical used', set: [['screenCondition', 'scratch_gt2'], ['bodyScratches', 'scratch_gt2'], ['bodyDents', 'minor_1_2'], ['hw_battery_service', 'faulty'], ['charger', 'missing'], ['mobileAge', 'above11']] },
  { id: 'V3', label: 'heavy screen damage', set: [['screenCondition', 'cracked'], ['screenLines', 'visible_lines'], ['bodyDents', 'major']] },
  { id: 'V4', label: 'functional faults', set: [['originalScreen', 'no'], ['hw_back_camera', 'faulty'], ['hw_speaker', 'faulty'], ['hw_battery_service', 'faulty']] },
  { id: 'V5', label: 'out of warranty, no bill', set: [['warranty', 'no'], ['validBill', 'no'], ['bodyScratches', 'scratch_1_2']] },
];

// ---------------------------------------------------------------------------
// Construction helpers

const shortHash = (s: string) => fnv1a(s).toString(36).padStart(7, '0').slice(0, 7);

function isolationFor(changes: Change[], states: Record<string, QuestionState>): { isolation: Isolation; notes: string[] } {
  const notes: string[] = [];
  let isolation: Isolation = 'CLEAN';
  const pages = new Set<string>();
  for (const c of changes) {
    const f = getFactor(c.factorId);
    if (f.siblings && f.opensVia) {
      pages.add(f.page);
      if (isolation === 'CLEAN') isolation = 'SUBPAGE_SIBLINGS_HELD';
    }
    if ((c.factorId === 'warranty' || c.factorId === 'validBill') && c.to === 'no' && states.mobileAge.status !== 'NOT_ASKED') {
      isolation = 'CONDITIONAL_CONFOUNDED';
      notes.push(`${c.factorId}=No may hide the mobile-age page; compare with the mobileAge OFAT runs in this block and record whether the age page rendered`);
    }
    if (c.factorId === 'mobileAge' && changes.some((x) => (x.factorId === 'warranty' || x.factorId === 'validBill') && x.to === 'no')) {
      isolation = 'CONDITIONAL_CONFOUNDED';
      notes.push('age answer may be unreachable when warranty/bill is No');
    }
  }
  for (const p of pages) {
    const sib = FACTORS.filter((f) => f.page === p).map((f) => f.id);
    notes.push(`checkbox "${FACTORS.find((f) => f.page === p)!.opensVia}" ticked; ${sib.join(', ')} answered explicitly (unchanged ones at their "none" option)`);
  }
  return { isolation, notes };
}

interface BlockBuilder {
  device: PlannedDevice;
  role: Role;
  phase: 1 | 2;
  experiments: PlannedExperiment[];
  bySignature: Map<string, PlannedExperiment>;
}

function signature(answers: AnswerVector, forceCheckboxes: string[] = []): string {
  return FACTORS.map((f) => `${f.id}=${answers[f.id]}`).join(';') + `|cb=${[...forceCheckboxes].sort().join(',')}`;
}

function describeChanges(changes: Change[]): string {
  return changes.length ? changes.map((c) => `${c.factorId}=${c.to}`).join('+') : 'baseline';
}

/** Adds (or merges into an identical existing) experiment. Returns it, or
 * null when a factor is NOT_ASKED for the device. */
function addExperiment(
  b: BlockBuilder,
  kind: ExperimentKind,
  set: Array<[string, string]>,
  purpose: string,
  refs: string[] = [],
  forceCheckboxes: string[] = [],
): PlannedExperiment | null {
  const states = b.device.questionStates;
  for (const [fid] of set) if (states[fid].status === 'NOT_ASKED') return null;
  const answers: AnswerVector = { ...b.device.baselineAnswers };
  for (const [fid, level] of set) answers[fid] = level;
  const changes: Change[] = set
    .filter(([fid, level]) => b.device.baselineAnswers[fid] !== level)
    .map(([fid, level]) => ({ factorId: fid, from: b.device.baselineAnswers[fid], to: level }));
  for (const cb of forceCheckboxes) changes.push({ factorId: `checkbox:${cb}`, from: 'unticked', to: 'ticked' });
  const sig = signature(answers, forceCheckboxes);
  // The closing baseline repeats the opening one on purpose (drift check).
  const existing = kind === 'BASELINE_CLOSE' ? undefined : b.bySignature.get(sig);
  if (existing) {
    if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
    if (!existing.purposes.includes(purpose)) existing.purposes.push(purpose);
    for (const r of refs) if (!existing.referenceExperimentIds.includes(r) && r !== existing.experimentId) existing.referenceExperimentIds.push(r);
    return existing;
  }
  const iso = isolationFor(changes.filter((c) => !c.factorId.startsWith('checkbox:')), states);
  const isolation: Isolation = forceCheckboxes.length && iso.isolation === 'CLEAN' ? 'SUBPAGE_SIBLINGS_HELD' : iso.isolation;
  const notes = [...iso.notes, ...forceCheckboxes.map((cb) => `checkbox "${cb}" ticked with every sub-question at its "none" option`)];
  const exp: PlannedExperiment = {
    experimentId: `${shortHash(b.device.deviceKey)}:${kind === 'BASELINE_CLOSE' ? 'baseline-close' : describeChanges(changes)}`,
    blockId: '',
    deviceKey: b.device.deviceKey,
    modelKey: b.device.modelKey,
    role: b.role,
    phase: b.phase,
    kinds: [kind],
    purposes: [purpose],
    order: 0,
    answers,
    forceCheckboxes: [...forceCheckboxes],
    changes,
    baselineExperimentId: null,
    referenceExperimentIds: refs,
    isolation,
    isolationNotes: notes,
    requiresRuntimeConfirmation: changes.map((c) => c.factorId).filter((fid) => states[fid]?.status === 'UNKNOWN'),
    blind: kind === 'VALIDATION_PROFILE',
  };
  if (kind !== 'BASELINE_CLOSE') b.bySignature.set(sig, exp);
  b.experiments.push(exp);
  return exp;
}

function ofat(b: BlockBuilder, factorId: string, level: string, purpose: string): PlannedExperiment | null {
  return addExperiment(b, 'OFAT', [[factorId, level]], purpose);
}

// ---------------------------------------------------------------------------
// Device and block construction

export function plannedDevice(sel: Selection, variant: Variant, variantRole: PlannedDevice['variantRole']): PlannedDevice {
  const m = sel.model;
  const states = resolveQuestionStates(m);
  return {
    deviceKey: variant.deviceKey,
    modelKey: m.modelKey,
    brand: m.brand,
    model: m.model,
    storage: variant.storage,
    ram: variant.ram,
    cashifyLink: variant.cashifyLink,
    role: sel.role,
    variantRole,
    selectionReasons: variantRole === 'REPRESENTATIVE' ? [...sel.reasons] : ['storage contrast: same model, different Get Upto, tests rupee vs percentage deductions'],
    strata: {
      fhoneifyFamily: m.fhoneifyFamily,
      series: m.series,
      generation: m.generation,
      eraTercile: m.eraTercile,
      deviceClass: m.deviceClass,
      priceBand: m.band,
      exceptionTags: m.exceptionTags,
    },
    getUpto: variant.getUpto,
    getUptoVerifiedAt: variant.getUptoVerifiedAt,
    questionStates: states,
    baselineAnswers: baselineVector(states),
  };
}

export function buildDeviceExperiments(
  device: PlannedDevice,
  assignedPairs: string[],
  opts: { factorial: boolean; kind: 'FULL' | 'STORAGE_CONTRAST' },
): BlockBuilder {
  const role = device.role;
  const phase: 1 | 2 = role === 'ANCHOR' ? 1 : 2;
  const b: BlockBuilder = { device, role, phase, experiments: [], bySignature: new Map() };
  const open = addExperiment(b, 'BASELINE_OPEN', [], 'clean baseline (block open)')!;

  if (opts.kind === 'STORAGE_CONTRAST') {
    for (const [fid, lvl] of [['screenCondition', 'cracked'], ['bodyScratches', 'scratch_gt2'], ['hw_back_camera', 'faulty'], ['warranty', 'no']] as Array<[string, string]>) {
      addExperiment(b, 'STORAGE_CONTRAST', [[fid, lvl]], 'same deduction on a different-value variant of the same model: constant rupees vs constant percentage');
    }
  } else if (role === 'VALIDATION') {
    for (const p of VALIDATION_PROFILES) {
      addExperiment(b, 'VALIDATION_PROFILE', p.set.filter(([fid]) => device.questionStates[fid].status !== 'NOT_ASKED'), `held-out profile ${p.id} (${p.label})`);
    }
  } else {
    // One-factor-at-a-time controls.
    for (const f of FACTORS) {
      if (device.questionStates[f.id].status === 'NOT_ASKED') continue;
      if (f.id === 'sPen' && !device.strata.exceptionTags.includes('s_pen')) continue;
      if (f.id === 'eSim' && !device.strata.exceptionTags.includes('esim_question_candidate') && role !== 'ANCHOR') continue;
      const levels = role === 'ANCHOR' ? f.levels.map((l) => l.id) : (CORE_LEVELS[f.id] ?? []);
      for (const l of levels) ofat(b, f.id, l, role === 'ANCHOR' ? 'factor screen: every level' : 'priority-1 deduction across the catalog');
    }

    if (role === 'ANCHOR') {
      // Does ticking a defect checkbox cost anything by itself?
      for (const page of ['P2-display', 'P2-body', 'P2-panel']) {
        const sib = FACTORS.filter((f) => f.page === page);
        addExperiment(b, 'CHECKBOX_NULL', [],
          `checkbox-null: tick "${sib[0].opensVia}" and answer ${sib.map((f) => f.id).join(', ')} with "none" - does the tick alone cost anything?`,
          [], [sib[0].opensVia!]);
      }
      // Severity ladder.
      const steps: Array<[string, string]> = [];
      let prev: string | null = null;
      for (const step of LADDER) {
        if (device.questionStates[step[0]].status === 'NOT_ASKED') continue;
        steps.push(step);
        const single = ofat(b, step[0], step[1], 'ladder single');
        const exp = addExperiment(b, 'LADDER', [...steps], `severity ladder step ${steps.length}: cap/floor detection`,
          [...(prev ? [prev] : []), ...(single ? [single.experimentId] : [])]);
        prev = exp?.experimentId ?? prev;
      }
    }

    // Pairs: anchors get all candidates, core devices their assignment.
    const pairs = role === 'ANCHOR' ? CANDIDATE_PAIRS : CANDIDATE_PAIRS.filter((p) => assignedPairs.includes(p.id));
    for (const p of pairs) {
      if (device.questionStates[p.a[0]].status === 'NOT_ASKED' || device.questionStates[p.b[0]].status === 'NOT_ASKED') continue;
      const sa = ofat(b, p.a[0], p.a[1], `single for pair ${p.id}`);
      const sb = ofat(b, p.b[0], p.b[1], `single for pair ${p.id}`);
      addExperiment(b, 'PAIR', [p.a, p.b], `pair ${p.id}: ${p.question}`, [sa!.experimentId, sb!.experimentId]);
    }

    if (opts.factorial) {
      const usable = FRACTIONAL_FACTORS.every(([fid]) => device.questionStates[fid].status !== 'NOT_ASKED');
      if (usable) {
        for (const run of fractionalRuns()) {
          const set = FRACTIONAL_FACTORS.filter((_, i) => run[i] === 1);
          addExperiment(b, 'FRACTIONAL', set, '2^(5-1) resolution V: all main effects and two-factor interactions estimable');
        }
      }
    }
  }

  addExperiment(b, 'BASELINE_CLOSE', [], 'clean baseline (block close): drift check against the opening baseline');
  // Everything references the opening baseline.
  for (const e of b.experiments) if (e !== open) e.baselineExperimentId = open.experimentId;
  return b;
}

/** Splits a device's experiments into blocks of at most maxBlockSize, each
 * with its own opening and closing baseline, keeping every experiment in the
 * same block as the experiments it references. */
export function packBlocks(b: BlockBuilder, cfg: DesignConfig): { blocks: PlannedBlock[]; experiments: PlannedExperiment[] } {
  const open = b.experiments[0];
  const close = b.experiments[b.experiments.length - 1];
  const body = b.experiments.slice(1, -1);
  const byId = new Map(body.map((e) => [e.experimentId, e]));
  const h = (e: PlannedExperiment) => fnv1a(cfg.seed + e.experimentId);

  // Transitive reference closure of an experiment, inside this device.
  const closure = (e: PlannedExperiment): PlannedExperiment[] => {
    const out = new Map<string, PlannedExperiment>();
    const walk = (x: PlannedExperiment) => {
      if (out.has(x.experimentId)) return;
      out.set(x.experimentId, x);
      for (const r of x.referenceExperimentIds) { const y = byId.get(r); if (y) walk(y); }
    };
    walk(e);
    return [...out.values()];
  };

  const capacity = cfg.maxBlockSize - 2;
  if (body.some((e) => closure(e).length > capacity)) {
    throw new Error(`reference chain longer than block capacity ${capacity} for ${b.device.deviceKey}`);
  }
  interface Bin { items: PlannedExperiment[]; local: Map<string, string> } // original id -> id in this bin
  const bins: Bin[] = [];
  const firstPlaced = new Map<string, number>();

  // Composites (experiments with references) first, largest closure first,
  // so a whole ladder chain lands together.
  const composites = body.filter((e) => e.referenceExperimentIds.some((r) => byId.has(r)))
    .sort((x, y) => closure(y).length - closure(x).length || h(x) - h(y));
  const placeInto = (bin: Bin, binIdx: number, e: PlannedExperiment) => {
    if (bin.local.has(e.experimentId)) return;
    if (firstPlaced.has(e.experimentId)) {
      // Already measured in another block: replicate here so every
      // comparison in this block uses this block's baseline.
      const copy: PlannedExperiment = {
        ...e,
        experimentId: `${e.experimentId}@r${binIdx + 1}`,
        kinds: ['REPLICATE', ...e.kinds.filter((k) => k !== 'REPLICATE')],
        purposes: [`replicate of ${e.experimentId} (reference needed in this block; also measures repeatability)`],
        replicateOf: e.experimentId,
        referenceExperimentIds: [],
      };
      bin.items.push(copy);
      bin.local.set(e.experimentId, copy.experimentId);
    } else {
      bin.items.push({ ...e });
      bin.local.set(e.experimentId, e.experimentId);
      firstPlaced.set(e.experimentId, binIdx);
    }
  };
  for (const e of composites) {
    if (firstPlaced.has(e.experimentId)) continue;
    const cl = closure(e);
    let idx = bins.findIndex((bin) => bin.items.length + cl.filter((x) => !bin.local.has(x.experimentId)).length <= capacity);
    if (idx < 0) { bins.push({ items: [], local: new Map() }); idx = bins.length - 1; }
    // Place references before the experiment that uses them.
    for (const x of cl.sort((p, q) => closure(p).length - closure(q).length || h(p) - h(q))) placeInto(bins[idx], idx, x);
  }
  for (const e of [...body].sort((x, y) => h(x) - h(y))) {
    if (firstPlaced.has(e.experimentId)) continue;
    let idx = bins.findIndex((bin) => bin.items.length < capacity);
    if (idx < 0) { bins.push({ items: [], local: new Map() }); idx = bins.length - 1; }
    placeInto(bins[idx], idx, e);
  }
  if (bins.length === 0) bins.push({ items: [], local: new Map() });

  const blocks: PlannedBlock[] = [];
  const experiments: PlannedExperiment[] = [];
  bins.forEach((bin, i) => {
    const blockId = `${shortHash(b.device.deviceKey)}:${b.device.variantRole === 'STORAGE_CONTRAST' ? 'sc' : 'blk'}${i + 1}`;
    const suffix = bins.length > 1 ? `#${i + 1}` : '';
    const o: PlannedExperiment = { ...open, experimentId: open.experimentId + suffix, blockId, kinds: ['BASELINE_OPEN'], baselineExperimentId: null, referenceExperimentIds: [] };
    const c: PlannedExperiment = { ...close, experimentId: close.experimentId + suffix, blockId, baselineExperimentId: o.experimentId, referenceExperimentIds: [o.experimentId] };
    const members = [
      o,
      ...bin.items.map((e) => ({
        ...e,
        blockId,
        baselineExperimentId: o.experimentId,
        referenceExperimentIds: e.referenceExperimentIds.map((r) => bin.local.get(r) ?? r),
      })),
      c,
    ];
    members.forEach((e, j) => { e.order = j; });
    experiments.push(...members);
    blocks.push({ blockId, deviceKey: b.device.deviceKey, modelKey: b.device.modelKey, role: b.role, phase: b.phase, experimentIds: members.map((e) => e.experimentId) });
  });
  return { blocks, experiments };
}

/**
 * Assigns candidate pairs to CORE devices: each pair to `pairCoverageCore`
 * devices, cycling through price bands so each pair is seen at low, middle
 * and high Get Upto (needed to tell rupee from percentage structure), and at
 * most `maxPairsPerCoreDevice` pairs per device.
 */
export function assignPairs(core: PlannedDevice[], cfg: DesignConfig): Map<string, string[]> {
  const load = new Map<string, string[]>(core.map((d) => [d.deviceKey, []]));
  const bandGroup = (b: PriceBand) => (b === 'B1_lt5k' || b === 'B2_5k_10k' ? 'low' : b === 'B3_10k_20k' ? 'mid' : 'high');
  for (const p of CANDIDATE_PAIRS) {
    const eligible = core.filter((d) =>
      d.questionStates[p.a[0]].status !== 'NOT_ASKED' && d.questionStates[p.b[0]].status !== 'NOT_ASKED');
    const groups = ['low', 'mid', 'high'].map((g) => eligible.filter((d) => bandGroup(d.strata.priceBand) === g));
    let assigned = 0;
    for (let round = 0; assigned < cfg.pairCoverageCore && round < cfg.pairCoverageCore; round++) {
      for (const g of groups) {
        if (assigned >= cfg.pairCoverageCore) break;
        const pick = g
          .filter((d) => !load.get(d.deviceKey)!.includes(p.id) && load.get(d.deviceKey)!.length < cfg.maxPairsPerCoreDevice)
          .sort((x, y) => load.get(x.deviceKey)!.length - load.get(y.deviceKey)!.length ||
            fnv1a(cfg.seed + p.id + x.deviceKey) - fnv1a(cfg.seed + p.id + y.deviceKey))[0];
        if (pick) { load.get(pick.deviceKey)!.push(p.id); assigned++; }
      }
    }
  }
  return load;
}

/** Picks factorial anchors: the highest-Get-Upto non-foldable anchor in each
 * of the low, middle and high band groups (largest deductions, best
 * signal-to-rounding; foldables only if a group has nothing else, since
 * their repair costs are atypical). */
export function pickFactorialAnchors(anchors: PlannedDevice[]): Set<string> {
  const out = new Set<string>();
  const groups: PriceBand[][] = [['B1_lt5k', 'B2_5k_10k'], ['B3_10k_20k'], ['B4_20k_40k', 'B5_ge40k']];
  for (const g of groups) {
    const best = anchors.filter((a) => g.includes(a.strata.priceBand))
      .sort((x, y) => Number(x.strata.deviceClass === 'foldable') - Number(y.strata.deviceClass === 'foldable') ||
        (y.getUpto ?? 0) - (x.getUpto ?? 0) || (x.deviceKey < y.deviceKey ? -1 : 1))[0];
    if (best) out.add(best.deviceKey);
  }
  return out;
}

export function storageContrastVariant(m: ModelEntry, minGap: number): Variant | null {
  const rep = m.representative;
  if (!rep?.getUpto) return null;
  const candidates = m.variants
    .filter((v) => v !== rep && v.getUpto != null && v.getUptoStatus === 'fresh' && Math.abs(v.getUpto - rep.getUpto!) / rep.getUpto! >= minGap)
    .sort((a, b) => Math.abs(b.getUpto! - rep.getUpto!) - Math.abs(a.getUpto! - rep.getUpto!) || (a.deviceKey < b.deviceKey ? -1 : 1));
  return candidates[0] ?? null;
}

export { UNVERIFIED_QUESTION_TEXT, Factor };
