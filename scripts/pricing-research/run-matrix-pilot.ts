/** Explicit five-quote local P08 pilot; no production DB, batch, or campaign dispatch. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { collectCashifyQuote, describeSessionPool } from './collector';
import { compilePlannedAnswers, verifyPlannedTrace, type MatrixStatus } from './plannedExperiment';
import { LocalMatrixStore, type MatrixObservation } from './matrixStore';
import { blockValidity } from '../research-design/analysis';
import { expandAnswers, type Plan } from '../research-design/plan';
import type { PlannedBlock, PlannedDevice, PlannedExperiment } from '../research-design/design';
import { FACTORS } from '../research-design/factors';
import { closeCashifyBrowser } from '../../server/modules/quote/cashifyScraper';

type SerializedPlan = Omit<Plan, 'experiments' | 'devices'> & {
  answerOrder: string[];
  experiments: Array<Omit<PlannedExperiment, 'answers'> & { answerVector: Array<string | null> }>;
  devices: Array<Omit<PlannedDevice, 'baselineAnswers'> & { baselineAnswers: Array<string | null> }>;
};

export function loadMatrixPlan(file: string): Plan {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as SerializedPlan;
  if (raw.planVersion !== 'cashify-design/2' || !Array.isArray(raw.answerOrder) ||
    raw.answerOrder.length !== raw.factors.length || new Set(raw.answerOrder).size !== raw.answerOrder.length) {
    throw new Error('unsupported or malformed matrix plan');
  }
  // Preserve Claude's fixed sample/IDs. Its only known stale copy is the
  // box card; refuse all other plan/collector catalog disagreement.
  const normalizedFactors = raw.factors.map((f) => {
    if (f.id === 'box') return {
      ...f, questionText: f.questionText === 'Box with same IMEI' ? 'Original Box with same IMEI' : f.questionText,
      baseline: { ...f.baseline, optionText: f.baseline.optionText === 'Box with same IMEI' ? 'Original Box with same IMEI' : f.baseline.optionText },
    };
    if (f.id === 'hw_battery_service' && f.gate === 'ALWAYS') return { ...f, gate: 'MODEL_DEPENDENT_OPTION' as const };
    return f;
  });
  if (JSON.stringify(normalizedFactors) !== JSON.stringify(FACTORS) ||
    JSON.stringify(raw.answerOrder) !== JSON.stringify(FACTORS.map((f) => f.id))) {
    throw new Error('planned factor catalog differs from reviewed collector contract');
  }
  const plan = { ...raw,
    factors: FACTORS,
    devices: raw.devices.map((d) => ({ ...d,
      questionStates: { ...d.questionStates,
        hw_battery_service: d.questionStates.hw_battery_service.status === 'ASKED' &&
          d.questionStates.hw_battery_service.source === 'always_rendered'
          ? { status: 'UNKNOWN' as const, source: 'runtime_discovery' as const,
            note: 'option label varies by model; POCO F4 5G showed Battery Faulty, not the planned health threshold' }
          : d.questionStates.hw_battery_service },
      baselineAnswers: expandAnswers(raw.answerOrder, d.baselineAnswers) })),
    experiments: raw.experiments.map(({ answerVector, ...e }) => {
      if (!Array.isArray(answerVector) || answerVector.length !== raw.answerOrder.length) throw new Error('incomplete answer vector');
      return { ...e, answers: expandAnswers(raw.answerOrder, answerVector),
        requiresRuntimeConfirmation: e.changes.some((c) => c.factorId === 'hw_battery_service')
          ? [...new Set([...e.requiresRuntimeConfirmation, 'hw_battery_service'])]
          : e.requiresRuntimeConfirmation };
    }),
  } as Plan;
  if (new Set(plan.experiments.map((e) => e.experimentId)).size !== plan.experiments.length) {
    throw new Error('duplicate experiment IDs in plan');
  }
  return plan;
}

/** Use an existing Claude P08 pair and its two referenced singles, not a new planner. */
export function selectP08Pilot(plan: Plan, blockId: string): { block: PlannedBlock; device: PlannedDevice; experiments: PlannedExperiment[] } {
  const block = plan.blocks.find((b) => b.blockId === blockId);
  if (!block) throw new Error('requested block ID not in plan');
  const device = plan.devices.find((d) => d.deviceKey === block.deviceKey);
  if (!device) throw new Error('block device missing from plan');
  const members = plan.experiments.filter((e) => e.blockId === blockId).sort((a, b) => a.order - b.order);
  const pair = members.find((e) => e.kinds.includes('PAIR') && e.purposes.some((p) => p.startsWith('pair P08:')));
  const open = members.find((e) => e.kinds.includes('BASELINE_OPEN'));
  const close = members.find((e) => e.kinds.includes('BASELINE_CLOSE'));
  const singles = pair?.referenceExperimentIds.map((id) => members.find((e) => e.experimentId === id));
  if (!pair || !open || !close || !singles || singles.length !== 2 || singles.some((e) => !e) ||
    pair.baselineExperimentId !== open.experimentId || close.baselineExperimentId !== open.experimentId ||
    !pair.changes.some((c) => c.factorId === 'screenCondition' && c.to === 'scratch_gt2') ||
    !pair.changes.some((c) => c.factorId === 'bodyScratches' && c.to === 'scratch_gt2')) {
    throw new Error('block does not contain the complete screen/body P08 pilot');
  }
  const experiments = [open, ...(singles as PlannedExperiment[]), pair, close];
  if (new Set(experiments.map((e) => e.experimentId)).size !== 5 ||
    experiments.some((e) => e.deviceKey !== device.deviceKey)) throw new Error('P08 pilot identities are not unique');
  return { block, device, experiments };
}

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const planFile = path.resolve(arg('plan') ?? path.join(__dirname, '../research-design/output/experiment-plan.json'));
  const blockId = arg('block-id');
  if (!blockId) throw new Error('--block-id is required; no unscoped matrix runs');
  const plan = loadMatrixPlan(planFile);
  const pilot = selectP08Pilot(plan, blockId);
  if (flag('dry-run')) {
    console.log(JSON.stringify({ dryRun: true, blockId, device: {
      brand: pilot.device.brand, model: pilot.device.model, ram: pilot.device.ram, storage: pilot.device.storage,
    }, experiments: pilot.experiments.map((e) => ({ id: e.experimentId, changes: e.changes })) }, null, 2));
    return;
  }
  const sessionFileName = arg('session-file');
  if (!flag('pilot') || !flag('headed') || arg('max-experiments') !== '5' ||
    !sessionFileName || !/^session-\d+\.json$/.test(sessionFileName)) {
    throw new Error('live collection requires --pilot --headed --max-experiments 5 and one explicit local session file');
  }
  const sessions = describeSessionPool(sessionFileName);
  if (sessions.length !== 1 || !sessions[0].valid) throw new Error('selected local session is unavailable or expired; authenticate manually');
  const dbPath = path.resolve(arg('db') ?? path.join(process.cwd(), 'research-evidence/matrix.sqlite'));
  const evidenceRoot = path.resolve(process.cwd(), 'research-evidence');
  if (!dbPath.startsWith(evidenceRoot + path.sep) || !dbPath.endsWith('.sqlite')) {
    throw new Error('matrix pilot DB must be a local .sqlite file under ignored research-evidence/');
  }
  const runId = crypto.randomUUID();
  const store = new LocalMatrixStore(dbPath);
  try {
    for (const experiment of pilot.experiments) {
      const answers = compilePlannedAnswers(pilot.device, experiment);
      const result = await collectCashifyQuote({ brand: pilot.device.brand, model: pilot.device.model,
        storage: pilot.device.storage, cashifyUrl: pilot.device.cashifyLink ?? undefined }, answers,
      { headless: false, sessionFileName, evidenceDir: path.join(evidenceRoot, 'matrix'), evidenceId: experiment.experimentId,
        verifyPlannedAnswers: (questions) => verifyPlannedTrace(pilot.device, experiment, questions) });
      const verdict = verifyPlannedTrace(pilot.device, experiment, result.questionsAsked ?? []);
      const status: MatrixStatus = result.status === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' :
        result.status === 'FAILED' ? 'FAILED' : verdict.status !== 'COMPLETED' ? verdict.status :
        result.status === 'COMPLETED' ?
          (result.originalGetUptoReference && result.finalQuote && result.evidence && result.questionnaireFingerprint ? 'COMPLETED' : 'FAILED') :
          'UNSUPPORTED';
      const row: MatrixObservation = {
        runId, planVersion: plan.planVersion, experimentId: experiment.experimentId, blockId,
        baselineExperimentId: experiment.baselineExperimentId, referenceExperimentIds: experiment.referenceExperimentIds,
        deviceKey: pilot.device.deviceKey, brand: pilot.device.brand, model: pilot.device.model,
        ram: pilot.device.ram, storage: pilot.device.storage, candidateFamily: pilot.device.strata.fhoneifyFamily,
        getUptoAtCollection: result.originalGetUptoReference ?? null, getUptoOffline: pilot.device.getUpto,
        answers: experiment.answers, questions: status === 'COMPLETED' ? verdict.questions :
          result.questionsAsked?.length ? verdict.questions.filter((q) => q.status !== 'NOT_ASKED') : [],
        changedFactors: experiment.changes.map((c) => c.factorId),
        checkboxesTicked: verdict.questions.filter((q) => q.factorId === null && q.optionText === 'Selected').map((q) => q.questionText),
        agePageRendered: result.questionsAsked?.length ? verdict.questions.find((q) => q.factorId === 'mobileAge')?.status === 'ASKED' : null,
        finalPrice: status === 'COMPLETED' ? result.finalQuote ?? null : null,
        status, statusReason: status === 'COMPLETED' ? null :
          result.errorReason ?? result.unsupportedReason ?? verdict.reason ?? 'collector evidence is incomplete',
        collectedAt: new Date().toISOString(), sessionValidity: status === 'AUTH_REQUIRED' ? 'CHALLENGED' : 'VALID',
        sessionPoolIndex: 0, evidenceRef: status === 'COMPLETED' ? result.evidence?.screenshotPath ?? null : null,
        evidenceSha256: status === 'COMPLETED' ? result.evidence?.screenshotSha256 ?? null : null,
        questionnaireFingerprint: status === 'COMPLETED' ? result.questionnaireFingerprint ?? null : null,
        collectorVersion: 'cashify-matrix/1',
      };
      store.record(row);
      console.log(`[matrix] ${experiment.kinds[0]} ${experiment.experimentId}: ${status}`);
      if (status !== 'COMPLETED') {
        console.log('[matrix] stopped safely; the entire five-experiment block must be rerun after resolving the issue');
        process.exitCode = 2;
        return;
      }
    }
    const rows = store.listRun(runId);
    const verdict = blockValidity(rows[0], rows[4], rows.slice(1, 4));
    console.log(`[matrix] ${rows.length} evidence-backed quotations; block validity: ${verdict.valid ? 'PASS' : verdict.reason}`);
    if (!verdict.valid) process.exitCode = 3;
  } finally { store.close(); await closeCashifyBrowser(); }
}

if (require.main === module) main().catch((error) => {
  console.error(`[matrix] pilot stopped: ${error instanceof Error ? error.message : 'unexpected error'}`);
  process.exitCode = 1;
});
