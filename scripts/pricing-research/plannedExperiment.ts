/** Fail-closed bridge from Claude's offline plan to the verified quote walker. */
import type { CashifyResearchAnswers } from './profiles';
import type { CollectorResult, QuestionAnswerRecord } from './collector';
import type { PlannedDevice, PlannedExperiment } from '../research-design/design';
import { FACTORS, getLevel, type Factor } from '../research-design/factors';

export type MatrixStatus = 'COMPLETED' | 'UNSUPPORTED' | 'NOT_ASKED' |
  'INVALID_ANSWER_MISMATCH' | 'AUTH_REQUIRED' | 'FAILED';

export interface ActualQuestion {
  factorId: string | null;
  sourcePage: string | null;
  questionText: string;
  status: 'ASKED' | 'NOT_ASKED' | 'UNKNOWN';
  /** Verbatim displayed option, or null when the factor was not rendered. */
  optionText: string | null;
  /** Grid cards can be explicitly unselected; a clicked radio is selected. */
  selectionState: 'SELECTED' | 'UNSELECTED' | null;
  matchedPlan: boolean;
}

export interface TraceVerdict {
  status: 'COMPLETED' | 'NOT_ASKED' | 'INVALID_ANSWER_MISMATCH';
  reason: string | null;
  questions: ActualQuestion[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const gridAnswer = (selected: boolean) => selected ? 'Selected' : 'Not selected';
const isGrid = (f: Factor) => f.page === 'P3' || f.page === 'P4';

/** Reject corrupt plans before a browser or database is opened. */
export function assertPlannedExperiment(device: PlannedDevice, experiment: PlannedExperiment): void {
  if (device.deviceKey !== experiment.deviceKey || !experiment.experimentId || !experiment.blockId ||
    !Number.isInteger(experiment.order) || !device.brand || !device.model || !device.storage ||
    (device.ram && !norm(device.storage).includes(norm(device.ram)))) {
    throw new Error('planned experiment identity or RAM/storage is incomplete');
  }
  const keys = Object.keys(experiment.answers).sort();
  if (JSON.stringify(keys) !== JSON.stringify(FACTORS.map((f) => f.id).sort())) {
    throw new Error('planned answer vector is not complete');
  }
  for (const f of FACTORS) {
    const level = experiment.answers[f.id];
    if ((level === null) !== (device.questionStates[f.id]?.status === 'NOT_ASKED')) {
      throw new Error(`planned answer status disagrees with question state: ${f.id}`);
    }
    if (level !== null) getLevel(f.id, level);
  }
  const changed = new Set(experiment.changes.filter((c) => !c.factorId.startsWith('checkbox:')).map((c) => c.factorId));
  for (const f of FACTORS) {
    if (experiment.answers[f.id] !== device.baselineAnswers[f.id] && !changed.has(f.id)) {
      throw new Error(`undeclared planned change: ${f.id}`);
    }
  }
  for (const c of experiment.changes) {
    if (c.factorId.startsWith('checkbox:')) continue;
    if (c.from !== device.baselineAnswers[c.factorId] || c.to !== experiment.answers[c.factorId]) {
      throw new Error(`incorrect change declaration: ${c.factorId}`);
    }
  }
  if (experiment.kinds.includes('BASELINE_OPEN') && experiment.baselineExperimentId !== null) {
    throw new Error('opening baseline must not reference another experiment');
  }
  if (!experiment.kinds.includes('BASELINE_OPEN') && !experiment.baselineExperimentId) {
    throw new Error('condition or closing baseline lacks opening baseline ID');
  }
}

/** Translate level IDs, never option positions, into the existing collector inputs. */
export function compilePlannedAnswers(device: PlannedDevice, experiment: PlannedExperiment): CashifyResearchAnswers {
  assertPlannedExperiment(device, experiment);
  const v = experiment.answers;
  const defectPages: Array<[string, CashifyResearchAnswers['defects'] extends Array<infer T> | undefined ? T : never]> = [
    ['P2-screen', 'broken_screen'], ['P2-display', 'screen_spot'],
    ['P2-body', 'body_scratch'], ['P2-panel', 'panel_missing'],
  ];
  const defects = defectPages.filter(([page]) =>
    FACTORS.some((f) => f.page === page && v[f.id] !== null && v[f.id] !== f.baseline.id) ||
    FACTORS.some((f) => f.page === page && !!f.opensVia && experiment.forceCheckboxes.includes(f.opensVia))
  ).map(([, id]) => id);
  const text = (id: string) => v[id] === null ? undefined : getLevel(id, v[id]!).optionText;
  return {
    calls: v.calls !== 'no', touch: v.touch !== 'no', originalScreen: v.originalScreen !== 'no',
    warranty: v.warranty !== 'no', validBill: v.validBill !== 'no',
    eSim: v.eSim === 'dual' ? 'Dual eSIM' : 'Single eSIM',
    defects,
    screenCondition: text('screenCondition'), screenSpots: text('screenSpots'),
    screenLines: text('screenLines'), screenDiscoloration: text('screenDiscoloration'),
    bodyScratches: text('bodyScratches'), bodyDents: text('bodyDents'),
    bodyPanel: text('bodyPanel'), bodyBent: text('bodyBent'),
    hardware: FACTORS.filter((f) => f.page === 'P3' && v[f.id] === 'faulty').map((f) => f.id.slice(3)),
    accessories: (['charger', 'box'] as const).filter((id) => v[id] === 'present'),
    mobileAge: (v.mobileAge ?? 'below3') as CashifyResearchAnswers['mobileAge'],
  };
}

/** Verifies every planned factor against an actually rendered, selected option. */
export function verifyPlannedTrace(
  device: PlannedDevice,
  experiment: PlannedExperiment,
  observed: QuestionAnswerRecord[],
): TraceVerdict {
  assertPlannedExperiment(device, experiment);
  const used = new Set<number>();
  const ordered: Array<{ index: number; question: ActualQuestion }> = [];
  const record = (question: ActualQuestion, index: number | null) =>
    ordered.push({ index: index ?? Number.MAX_SAFE_INTEGER, question });
  const failures: string[] = [];
  let absentChanged = false;
  const selectedDefectPages = new Set(compilePlannedAnswers(device, experiment).defects ?? []);
  const triggers: Record<string, string> = {
    broken_screen: 'Broken/scratch on device screen',
    screen_spot: 'Dead Spot/Visible line and Discoloration on screen',
    body_scratch: 'Scratch/Dent on device body',
    panel_missing: 'Device panel missing/broken',
  };
  for (const [id, label] of Object.entries(triggers)) {
    const hits = observed.map((q, i) => ({ q, i })).filter(({ q }) =>
      q.sourcePage === 'P2' && norm(q.questionText) === norm(label));
    const matched = hits.length === 1 && hits[0].q.selectedAnswer === gridAnswer(selectedDefectPages.has(id as any));
    if (!matched) failures.push(`defect-page checkbox not verified: ${id}`);
    if (hits.length === 1) {
      used.add(hits[0].i);
      record({ factorId: null, sourcePage: 'P2', questionText: hits[0].q.questionText, status: 'ASKED',
        optionText: hits[0].q.questionText,
        selectionState: hits[0].q.selectedAnswer === 'Selected' ? 'SELECTED' : 'UNSELECTED', matchedPlan: matched }, hits[0].i);
    }
  }
  for (const f of FACTORS) {
    const levelId = experiment.answers[f.id];
    const changed = experiment.changes.some((c) => c.factorId === f.id);
    const triggerSelected = f.opensVia ? [...selectedDefectPages].some((id) => triggers[id] === f.opensVia) : true;
    const expected = levelId === null ? null : getLevel(f.id, levelId).optionText;
    const shouldRender = levelId !== null && (!f.opensVia || triggerSelected);
    const candidates = observed.map((q, i) => ({ q, i })).filter(({ q, i }) => {
      if (used.has(i)) return false;
      if (q.sourcePage !== f.page) return false;
      if (f.page === 'P1' && f.id !== 'eSim') return norm(q.questionText) === norm(f.questionText);
      if (f.id === 'mobileAge') return norm(q.questionText) === norm(f.questionText);
      if (f.page === 'P3' || f.page === 'P4') return norm(q.questionText) === norm(f.questionText);
      if (f.id === 'eSim') return q.selectedAnswer === 'Single eSIM' || q.selectedAnswer === 'Dual eSIM';
      return !!expected && expected !== '__CHECKBOX_UNTICKED__' &&
        norm(q.selectedAnswer) === norm(expected) && norm(q.questionText) !== norm(expected);
    });
    const hit = candidates.length === 1 ? candidates[0] : null;
    if (hit) used.add(hit.i);
    const absentAllowed = levelId === null || (!triggerSelected && !!f.opensVia) ||
      device.questionStates[f.id]?.status === 'UNKNOWN';
    if (!hit && shouldRender && !absentAllowed) failures.push(`required question/option not rendered: ${f.id}`);
    if (!hit && changed) absentChanged = true;
    let matched = !hit ? absentAllowed && !changed : false;
    if (hit && expected) {
      const actual = hit.q.selectedAnswer;
      matched = isGrid(f)
        ? actual === gridAnswer(levelId === (f.page === 'P3' ? 'faulty' : 'present'))
        : norm(actual) === norm(expected);
      if (f.opensVia && [f.baseline, ...f.levels].some((level) => norm(hit.q.questionText) === norm(level.optionText))) {
        matched = false; // an option label is not a verified question heading
      }
      if (f.opensVia && !triggerSelected) matched = false;
      if (levelId === null) matched = false;
      if (!matched) failures.push(`selected option mismatch: ${f.id}`);
    }
    record({ factorId: f.id, sourcePage: hit?.q.sourcePage ?? null,
      questionText: hit?.q.questionText ?? '', status: hit ? 'ASKED' : 'NOT_ASKED',
      optionText: hit ? isGrid(f) ? hit.q.questionText : hit.q.selectedAnswer : null,
      selectionState: hit ? isGrid(f) && hit.q.selectedAnswer === 'Not selected' ? 'UNSELECTED' : 'SELECTED' : null,
      matchedPlan: matched }, hit?.i ?? null);
  }
  for (let i = 0; i < observed.length; i++) if (!used.has(i)) {
    const q = observed[i];
    const safeNeutralFault = q.sourcePage === 'P3' && q.selectedAnswer === 'Not selected' && !!q.questionText.trim();
    record({ factorId: null, sourcePage: q.sourcePage ?? null, questionText: q.questionText,
      status: 'UNKNOWN', optionText: q.questionText,
      selectionState: q.selectedAnswer === 'Selected' ? 'SELECTED' : q.selectedAnswer === 'Not selected' ? 'UNSELECTED' : null,
      matchedPlan: safeNeutralFault }, i);
    if (!safeNeutralFault) failures.push(q.sourcePage === 'P3' && q.selectedAnswer === 'Selected'
      ? 'unplanned hardware fault was selected' : 'unrecognized rendered questionnaire option');
  }
  return { status: failures.length ? 'INVALID_ANSWER_MISMATCH' : absentChanged ? 'NOT_ASKED' : 'COMPLETED',
    reason: failures.join('; ') || (absentChanged ? 'planned changed factor was not asked' : null),
    questions: ordered.sort((a, b) => a.index - b.index).map((item) => item.question) };
}

export function classifyPlannedResult(result: CollectorResult, verdict: TraceVerdict): MatrixStatus {
  if (result.status === 'AUTH_REQUIRED') return 'AUTH_REQUIRED';
  if (result.status === 'UNSUPPORTED') return 'UNSUPPORTED';
  if (result.status === 'FAILED') return 'FAILED';
  return verdict.status;
}
