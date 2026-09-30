import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { compilePlannedAnswers, verifyPlannedTrace } from '../pricing-research/plannedExperiment';
import { LocalMatrixStore, type MatrixObservation } from '../pricing-research/matrixStore';
import { assertFreshSessionMetadata, loadMatrixPlan, selectP08Pilot } from '../pricing-research/run-matrix-pilot';
import { FACTORS, getLevel } from '../research-design/factors';
import type { PlannedDevice, PlannedExperiment } from '../research-design/design';
import type { QuestionAnswerRecord } from '../pricing-research/collector';

const plan = loadMatrixPlan(path.resolve(__dirname, '../research-design/output/experiment-plan.json'));
const pilot = selectP08Pilot(plan, '0i55edv:blk2');
const [open, screen, body, pair, close] = pilot.experiments;
const sessionNow = 1790800000000;
assert.doesNotThrow(() => assertFreshSessionMetadata(`session-${sessionNow}.json`, sessionNow, sessionNow));
assert.throws(() => assertFreshSessionMetadata(`session-${sessionNow - 86400000}.json`, sessionNow, sessionNow), /newly authenticated/);

function trace(device: PlannedDevice, experiment: PlannedExperiment): QuestionAnswerRecord[] {
  const answers = compilePlannedAnswers(device, experiment);
  const q: QuestionAnswerRecord[] = [];
  for (const f of FACTORS.filter((f) => f.page === 'P1')) {
    if (experiment.answers[f.id] === null) continue;
    q.push({ questionText: f.questionText, selectedAnswer: getLevel(f.id, experiment.answers[f.id]!).optionText,
      sourcePage: 'P1' });
  }
  const defectLabels: Record<string, string> = {
    broken_screen: 'Broken/scratch on device screen', screen_spot: 'Dead Spot/Visible line and Discoloration on screen',
    body_scratch: 'Scratch/Dent on device body', panel_missing: 'Device panel missing/broken',
  };
  for (const [id, label] of Object.entries(defectLabels)) {
    q.push({ questionText: label, selectedAnswer: answers.defects?.includes(id as any) ? 'Selected' : 'Not selected',
      sourcePage: 'P2' });
  }
  for (const f of FACTORS.filter((f) => f.opensVia)) {
    if (experiment.answers[f.id] === null || !answers.defects?.some((id) => defectLabels[id] === f.opensVia)) continue;
    q.push({ questionText: `Displayed ${f.id} question`, selectedAnswer: getLevel(f.id, experiment.answers[f.id]!).optionText,
      sourcePage: f.page });
  }
  for (const f of FACTORS.filter((f) => f.page === 'P3' || f.page === 'P4')) {
    if (experiment.answers[f.id] === null) continue;
    q.push({ questionText: f.questionText, selectedAnswer:
      experiment.answers[f.id] === (f.page === 'P3' ? 'faulty' : 'present') ? 'Selected' : 'Not selected',
      sourcePage: f.page });
  }
  if (experiment.answers.mobileAge !== null) {
    q.push({ questionText: 'What is your mobile age?', selectedAnswer: getLevel('mobileAge', experiment.answers.mobileAge!).optionText,
      sourcePage: 'P5' });
  }
  return q;
}

assert.equal(pilot.experiments.length, 5);
assert.deepEqual(pilot.experiments.map((e) => e.kinds[0]), ['BASELINE_OPEN', 'OFAT', 'OFAT', 'PAIR', 'BASELINE_CLOSE']);
assert.equal(pair.referenceExperimentIds.length, 2);
for (const e of pilot.experiments) {
  const result = verifyPlannedTrace(pilot.device, e, trace(pilot.device, e));
  assert.equal(result.status, 'COMPLETED', `${e.experimentId}: ${result.reason}`);
  assert.equal(result.questions.filter((q) => !q.matchedPlan).length, 0);
}
assert.deepEqual(compilePlannedAnswers(pilot.device, pair).defects, ['broken_screen', 'body_scratch']);
assert.equal(close.baselineExperimentId, open.experimentId);
assert.equal(pilot.device.questionStates.hw_battery_service.status, 'UNKNOWN');
const absentBatteryCard = trace(pilot.device, open).filter((q) => q.questionText !== 'Battery in Service (Health < 80%)');
assert.equal(verifyPlannedTrace(pilot.device, open, absentBatteryCard).status, 'COMPLETED');
const changedBatteryCard = trace(pilot.device, open);
changedBatteryCard.find((q) => q.questionText === 'Battery in Service (Health < 80%)')!.questionText = 'Battery Faulty';
const neutralBattery = verifyPlannedTrace(pilot.device, open, changedBatteryCard);
assert.equal(neutralBattery.status, 'COMPLETED');
assert.deepEqual(neutralBattery.questions.find((q) => q.questionText === 'Battery Faulty'), {
  factorId: null, sourcePage: 'P3', questionText: 'Battery Faulty', status: 'UNKNOWN',
  optionText: 'Battery Faulty', selectionState: 'UNSELECTED', matchedPlan: true,
});
assert.equal(neutralBattery.questions.find((q) => q.factorId === 'hw_battery_service')?.status, 'NOT_ASKED');
const selectedUnknown = changedBatteryCard.map((q) => q.questionText === 'Battery Faulty'
  ? { ...q, selectedAnswer: 'Selected' } : q);
assert.equal(verifyPlannedTrace(pilot.device, open, selectedUnknown).status, 'INVALID_ANSWER_MISMATCH');
const plannedBatteryFault = plan.experiments.find((e) => e.deviceKey === pilot.device.deviceKey &&
  e.changes.some((c) => c.factorId === 'hw_battery_service' && c.to === 'faulty'))!;
assert.ok(plannedBatteryFault);
const substitutedFault = trace(pilot.device, plannedBatteryFault).map((q) =>
  q.questionText === 'Battery in Service (Health < 80%)' ? { ...q, questionText: 'Battery Faulty', selectedAnswer: 'Selected' } : q);
assert.equal(verifyPlannedTrace(pilot.device, plannedBatteryFault, substitutedFault).status, 'INVALID_ANSWER_MISMATCH');
const unavailableFault = substitutedFault.map((q) => q.questionText === 'Battery Faulty'
  ? { ...q, selectedAnswer: 'Not selected' } : q);
assert.equal(verifyPlannedTrace(pilot.device, plannedBatteryFault, unavailableFault).status, 'NOT_ASKED');

const wrong = trace(pilot.device, pair);
wrong.find((q) => q.questionText === 'Scratch/Dent on device body')!.selectedAnswer = 'Not selected';
assert.equal(verifyPlannedTrace(pilot.device, pair, wrong).status, 'INVALID_ANSWER_MISMATCH');
const missingScreen = trace(pilot.device, screen).filter((q) => q.selectedAnswer !== 'More than 2 scratches on screen');
assert.equal(verifyPlannedTrace(pilot.device, screen, missingScreen).status, 'INVALID_ANSWER_MISMATCH');
const missingBody = trace(pilot.device, body).filter((q) => q.selectedAnswer !== 'More than 2 scratches');
assert.equal(verifyPlannedTrace(pilot.device, body, missingBody).status, 'INVALID_ANSWER_MISMATCH');
const missingCalls = trace(pilot.device, open).filter((q) => q.questionText !== 'Are you able to make and receive calls?');
assert.equal(verifyPlannedTrace(pilot.device, open, missingCalls).status, 'INVALID_ANSWER_MISMATCH');
const extra = [...trace(pilot.device, open), { questionText: 'Unexpected question', selectedAnswer: 'Yes', sourcePage: 'P1' }];
assert.equal(verifyPlannedTrace(pilot.device, open, extra).status, 'INVALID_ANSWER_MISMATCH');
for (const factorId of ['warranty', 'validBill', 'mobileAge']) {
  const experiment = plan.experiments.find((e) => e.deviceKey === pilot.device.deviceKey &&
    e.changes.some((c) => c.factorId === factorId))!;
  assert.ok(experiment, `missing ${factorId} experiment`);
  const exact = verifyPlannedTrace(pilot.device, experiment, trace(pilot.device, experiment));
  assert.equal(exact.status, 'COMPLETED');
  assert.equal(exact.questions.find((q) => q.factorId === factorId)?.questionText, FACTORS.find((f) => f.id === factorId)?.questionText);
  const missing = trace(pilot.device, experiment).filter((q) => q.questionText !== FACTORS.find((f) => f.id === factorId)?.questionText);
  const absent = verifyPlannedTrace(pilot.device, experiment, missing);
  assert.equal(absent.status, 'NOT_ASKED');
  assert.equal(absent.questions.find((q) => q.factorId === factorId)?.optionText, null);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cashify-matrix-test-'));
try {
  const image = path.join(temp, 'final.png');
  fs.writeFileSync(image, 'synthetic local test screenshot');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(image)).digest('hex');
  const store = new LocalMatrixStore(path.join(temp, 'matrix.sqlite'));
  const row: MatrixObservation = {
    runId: 'run-1', planVersion: plan.planVersion, experimentId: open.experimentId, blockId: open.blockId,
    baselineExperimentId: null, referenceExperimentIds: [], deviceKey: pilot.device.deviceKey,
    brand: pilot.device.brand, model: pilot.device.model, ram: pilot.device.ram, storage: pilot.device.storage,
    candidateFamily: pilot.device.strata.fhoneifyFamily, getUptoAtCollection: 7100, getUptoOffline: pilot.device.getUpto,
    answers: open.answers, questions: neutralBattery.questions,
    changedFactors: [], checkboxesTicked: [], agePageRendered: true, finalPrice: 7000,
    status: 'COMPLETED', statusReason: null, collectedAt: '2026-09-30T12:00:00Z',
    sessionValidity: 'VALID', sessionPoolIndex: 0, evidenceRef: image, evidenceSha256: sha,
    questionnaireFingerprint: 'test-fingerprint', collectorVersion: 'cashify-matrix/1',
  };
  store.record(row);
  assert.equal(store.get(plan.planVersion, open.experimentId)?.questions.find((q) => q.questionText === 'Battery Faulty')?.selectionState,
    'UNSELECTED');
  assert.throws(() => store.record({ ...row, runId: 'run-bad', questions: row.questions.map((q) =>
    q.questionText === 'Battery Faulty' ? { ...q, selectionState: 'SELECTED' } : q) }), /lacks verified quotation evidence/);
  assert.throws(() => store.record({ ...row, runId: 'run-bad', questions: row.questions.map((q) =>
    q.factorId === 'calls' ? { ...q, optionText: 'No' } : q) }), /lacks verified quotation evidence/);
  const failed: MatrixObservation = { ...row, runId: 'run-2', status: 'AUTH_REQUIRED', finalPrice: null,
    evidenceRef: null, evidenceSha256: null, statusReason: 'authentication requested' };
  store.record(failed);
  assert.equal(store.get(plan.planVersion, open.experimentId)?.status, 'COMPLETED');
  assert.equal(store.attemptCount(plan.planVersion, open.experimentId), 2);
  assert.equal(store.listRun('run-1').length, 1);
  assert.equal(store.listRun('run-2').length, 1);
  assert.throws(() => store.record({ ...row, runId: 'run-3', evidenceSha256: 'bad' }), /hash mismatch/);
  assert.throws(() => store.record({ ...row, runId: 'run-3', questions: row.questions.filter((q) => q.factorId !== 'calls') }),
    /lacks verified quotation evidence/);
  assert.equal(store.attemptCount(plan.planVersion, open.experimentId), 2);
  store.close();
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log('matrix integration tests passed');
