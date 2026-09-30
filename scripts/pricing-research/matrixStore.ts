/** Local-only, append-only research evidence store. Never opens DATABASE_URL. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ActualQuestion, MatrixStatus } from './plannedExperiment';
import { DEFECT_CHECKBOX, FACTORS, getLevel } from '../research-design/factors';
import { hasVerifiedDefectSelection } from './defectQuestion';

export interface MatrixObservation {
  runId: string;
  planVersion: string;
  experimentId: string;
  blockId: string;
  baselineExperimentId: string | null;
  referenceExperimentIds: string[];
  deviceKey: string;
  brand: string;
  model: string;
  ram: string | null;
  storage: string;
  candidateFamily: string;
  getUptoAtCollection: number | null;
  getUptoOffline: number | null;
  answers: Record<string, string | null>;
  questions: ActualQuestion[];
  changedFactors: string[];
  checkboxesTicked: string[];
  agePageRendered: boolean | null;
  finalPrice: number | null;
  status: MatrixStatus;
  statusReason: string | null;
  collectedAt: string;
  sessionValidity: 'VALID' | 'EXPIRED' | 'CHALLENGED';
  sessionPoolIndex: number | null;
  evidenceRef: string | null;
  evidenceSha256: string | null;
  questionnaireFingerprint: string | null;
  collectorVersion: string;
}

function validateObservation(row: MatrixObservation): void {
  if (!row.runId || !row.planVersion || !row.experimentId || !row.blockId || !row.deviceKey ||
    !Number.isFinite(Date.parse(row.collectedAt)) || !row.collectorVersion) {
    throw new Error('matrix observation identity or timestamp is incomplete');
  }
  if (row.status === 'COMPLETED') {
    const factorIds = FACTORS.map((f) => f.id);
    const actualIds = row.questions.filter((q) => q.factorId !== null).map((q) => q.factorId);
    const normalized = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
    const triggerLabels = Object.values(DEFECT_CHECKBOX);
    const triggerQuestions = row.questions.filter((q) => q.factorId === null && q.status === 'ASKED');
    const triggerStateValid = triggerQuestions.length === triggerLabels.length &&
      triggerLabels.every((label) => triggerQuestions.some((q) =>
        q.sourcePage === 'P2' && q.questionText === label && q.optionText === label &&
        q.selectionState === (row.checkboxesTicked.includes(label) ? 'SELECTED' : 'UNSELECTED')));
    const factorsValid = FACTORS.every((f) => {
      const q = row.questions.find((item) => item.factorId === f.id);
      const levelId = row.answers[f.id];
      if (!q) return false;
      if (q.status === 'NOT_ASKED') {
        return !row.changedFactors.includes(f.id) &&
          (levelId === null || (f.opensVia ? !row.checkboxesTicked.includes(f.opensVia) : f.gate !== 'ALWAYS'));
      }
      if (levelId === null || q.status !== 'ASKED' || q.sourcePage !== f.page) return false;
      const expectedText = getLevel(f.id, levelId).optionText;
      if (f.opensVia && !hasVerifiedDefectSelection(q.optionStates, expectedText)) return false;
      if (f.page === 'P3' || f.page === 'P4') {
        const expectedState = levelId === (f.page === 'P3' ? 'faulty' : 'present') ? 'SELECTED' : 'UNSELECTED';
        return normalized(q.questionText) === normalized(f.questionText) &&
          q.optionText === q.questionText && q.selectionState === expectedState;
      }
      return normalized(q.optionText ?? '') === normalized(expectedText) && q.selectionState === 'SELECTED';
    });
    const invalidQuestion = row.questions.some((q) => {
      if (!q.matchedPlan) return true;
      if (q.status === 'NOT_ASKED') return q.factorId === null || q.questionText !== '' ||
        q.optionText !== null || q.selectionState !== null;
      if (!q.questionText || !q.optionText || !q.sourcePage || q.selectionState === null) return true;
      if (q.status === 'UNKNOWN') return q.factorId !== null || q.sourcePage !== 'P3' ||
        q.selectionState !== 'UNSELECTED' || q.optionText !== q.questionText;
      return false;
    });
    if (!Number.isSafeInteger(row.finalPrice) || row.finalPrice! <= 0 ||
      !Number.isSafeInteger(row.getUptoAtCollection) || row.getUptoAtCollection! <= 0 ||
      !row.questionnaireFingerprint || !row.evidenceRef || !row.evidenceSha256 ||
      invalidQuestion || !triggerStateValid || !factorsValid ||
      JSON.stringify(Object.keys(row.answers).sort()) !== JSON.stringify([...factorIds].sort()) ||
      JSON.stringify(actualIds.sort()) !== JSON.stringify([...factorIds].sort())) {
      throw new Error('completed matrix observation lacks verified quotation evidence');
    }
    if (!fs.existsSync(row.evidenceRef) ||
      crypto.createHash('sha256').update(fs.readFileSync(row.evidenceRef)).digest('hex') !== row.evidenceSha256) {
      throw new Error('matrix screenshot missing or hash mismatch');
    }
  } else if (row.finalPrice !== null) {
    throw new Error('non-completed observation must not carry a final price');
  }
}

export class LocalMatrixStore {
  private db: any;

  constructor(file: string) {
    const absolute = path.resolve(file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const { DatabaseSync } = require('node:sqlite');
    this.db = new DatabaseSync(absolute);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS matrix_experiments (
        plan_version TEXT NOT NULL,
        experiment_id TEXT NOT NULL,
        block_id TEXT NOT NULL,
        device_key TEXT NOT NULL,
        status TEXT NOT NULL,
        observation_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (plan_version, experiment_id)
      );
      CREATE TABLE IF NOT EXISTS matrix_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        plan_version TEXT NOT NULL,
        experiment_id TEXT NOT NULL,
        status TEXT NOT NULL,
        observation_json TEXT NOT NULL,
        recorded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS matrix_block_idx ON matrix_experiments(plan_version, block_id);
      CREATE INDEX IF NOT EXISTS matrix_attempt_idx ON matrix_attempts(plan_version, experiment_id, id);
      CREATE INDEX IF NOT EXISTS matrix_run_idx ON matrix_attempts(run_id, id);
    `);
  }

  get(planVersion: string, experimentId: string): MatrixObservation | null {
    const row = this.db.prepare('SELECT observation_json FROM matrix_experiments WHERE plan_version=? AND experiment_id=?')
      .get(planVersion, experimentId) as { observation_json: string } | undefined;
    return row ? JSON.parse(row.observation_json) : null;
  }

  listBlock(planVersion: string, blockId: string): MatrixObservation[] {
    return this.db.prepare('SELECT observation_json FROM matrix_experiments WHERE plan_version=? AND block_id=?')
      .all(planVersion, blockId).map((row: { observation_json: string }) => JSON.parse(row.observation_json));
  }

  listRun(runId: string): MatrixObservation[] {
    return this.db.prepare('SELECT observation_json FROM matrix_attempts WHERE run_id=? ORDER BY id')
      .all(runId).map((row: { observation_json: string }) => JSON.parse(row.observation_json));
  }

  record(row: MatrixObservation): void {
    validateObservation(row);
    const json = JSON.stringify(row);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO matrix_attempts(run_id, plan_version, experiment_id, status, observation_json, recorded_at) VALUES(?,?,?,?,?,?)')
        .run(row.runId, row.planVersion, row.experimentId, row.status, json, row.collectedAt);
      const current = this.get(row.planVersion, row.experimentId);
      if (current?.status !== 'COMPLETED' || row.status === 'COMPLETED') {
        this.db.prepare(`INSERT INTO matrix_experiments(plan_version, experiment_id, block_id, device_key, status, observation_json, updated_at)
          VALUES(?,?,?,?,?,?,?) ON CONFLICT(plan_version, experiment_id) DO UPDATE SET
          block_id=excluded.block_id, device_key=excluded.device_key, status=excluded.status,
          observation_json=excluded.observation_json, updated_at=excluded.updated_at`)
          .run(row.planVersion, row.experimentId, row.blockId, row.deviceKey, row.status, json, row.collectedAt);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  attemptCount(planVersion: string, experimentId: string): number {
    return this.db.prepare('SELECT count(*) AS n FROM matrix_attempts WHERE plan_version=? AND experiment_id=?')
      .get(planVersion, experimentId).n;
  }

  close(): void { this.db.close(); }
}
