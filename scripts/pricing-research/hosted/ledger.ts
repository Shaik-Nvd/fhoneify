/**
 * Non-sensitive durable progress ledger for the hosted campaign. It lives on
 * the research-only branch `research/cashify-hosted-ledger` (never main) and
 * holds no prices, answers, page text, cookies or keys: only identities,
 * statuses, hashes and artifact references. Pure functions; callers do I/O.
 *
 * Budget rule: attempts are charged BEFORE collection (a block's full size is
 * reserved and committed first). A clean, verified run releases only attempts
 * its write-ahead manifest proves never started. An unreconciled or
 * unverifiable run stays charged in full and its blocks are never re-queued
 * automatically.
 */
import type { CampaignQueue, QueueEntry } from './campaign';
import { queueSha256 } from './campaign';

export type Stage = 1 | 2 | 3;
export type LedgerExperimentStatus = 'COMPLETED' | 'UNSUPPORTED' | 'NOT_ASKED' | 'INVALID_ANSWER_MISMATCH' |
  'AUTH_REQUIRED' | 'FAILED' | 'EVIDENCE_UNVERIFIED' | 'INTERRUPTED';

export interface ArtifactRef { id: number; name: string; url: string; expiresAt: string; sizeBytes: number }

export interface LedgerReservation {
  runKey: string;
  stage: Stage;
  reservedAt: string;
  blockIds: string[];
  reservedAttempts: number;
  state: 'RESERVED' | 'FINALIZED' | 'UNCERTAIN';
  chargedAttempts: number | null;
  artifact: ArtifactRef | null;
  stopReason: string | null;
  finalizedAt: string | null;
}

export interface LedgerBlock {
  runKey: string;
  deviceKey: string;
  state: 'RESERVED' | 'COLLECTED' | 'STOPPED' | 'UNCERTAIN';
  hostedGate: { valid: boolean; reason: string | null } | null;
}

export interface LedgerExperiment {
  blockId: string;
  runKey: string;
  status: LedgerExperimentStatus;
  reason: string | null;
  collectedAt: string | null;
  cipherFile: string | null;
  cipherSha256: string | null;
  evidenceSha256: string | null;
}

export interface StageDecision { stage: Stage; decision: 'PASS' | 'FAIL'; decidedAt: string; reportSha256: string; summary: string }

export interface Ledger {
  version: 1;
  campaignId: string;
  queueSha256: string;
  globalCap: number;
  stageCaps: Record<Stage, number>;
  approvedStage: Stage;
  stageDecisions: StageDecision[];
  reservations: LedgerReservation[];
  blocks: Record<string, LedgerBlock>;
  experiments: Record<string, LedgerExperiment>;
  deviceStops: Record<string, string>;
}

/** Write-ahead run manifest produced on the runner; uploaded next to the ciphertexts. */
export interface RunManifest {
  version: 1;
  campaignId: string;
  runKey: string;
  startedAt: string;
  finishedAt: string | null;
  complete: boolean;
  stopReason: string | null;
  attempts: Array<{
    experimentId: string;
    blockId: string;
    deviceKey: string;
    startedAt: string;
    outcome: null | {
      status: Exclude<LedgerExperimentStatus, 'EVIDENCE_UNVERIFIED' | 'INTERRUPTED'>;
      reason: string | null;
      collectedAt: string;
      cipherFile: string;
      cipherSha256: string;
      evidenceSha256: string | null;
    };
  }>;
  blocks: Array<{ blockId: string; hostedGate: { valid: boolean; reason: string | null } }>;
  deviceStops: Array<{ deviceKey: string; reason: string }>;
}

/** Result of downloading the uploaded artifact back from GitHub and re-hashing it. */
export interface ArtifactVerification {
  artifact: ArtifactRef | null;
  /** cipherFile -> sha256 of the bytes actually recovered from the artifact. */
  recovered: Record<string, string>;
  /** Manifest parsed from the RECOVERED artifact, not the runner's local copy. */
  manifest: RunManifest | null;
}

export function createLedger(queue: CampaignQueue): Ledger {
  return { version: 1, campaignId: queue.campaignId, queueSha256: queueSha256(queue), globalCap: queue.globalCap,
    stageCaps: { ...queue.stageCaps }, approvedStage: 1, stageDecisions: [], reservations: [], blocks: {},
    experiments: {}, deviceStops: {} };
}

export function chargedAttempts(ledger: Ledger): number {
  return ledger.reservations.reduce((n, r) => n + (r.state === 'FINALIZED' ? r.chargedAttempts ?? r.reservedAttempts : r.reservedAttempts), 0);
}

export function assertLedgerMatchesQueue(ledger: Ledger, queue: CampaignQueue): void {
  if (ledger.version !== 1 || ledger.campaignId !== queue.campaignId || ledger.queueSha256 !== queueSha256(queue) ||
    ledger.globalCap !== queue.globalCap || JSON.stringify(ledger.stageCaps) !== JSON.stringify(queue.stageCaps)) {
    throw new Error('ledger does not belong to this campaign queue; refusing to spend budget');
  }
  if (chargedAttempts(ledger) > ledger.globalCap) throw new Error('ledger already exceeds the global attempt cap');
}

export function reserveBlocks(ledger: Ledger, queue: CampaignQueue, params: {
  runKey: string; stage: Stage; maxAttempts: number; now: string;
}): { ledger: Ledger; entries: QueueEntry[] } {
  assertLedgerMatchesQueue(ledger, queue);
  if (!/^\d+\.\d+$/.test(params.runKey)) throw new Error('runKey must be <github run id>.<run attempt>');
  if (params.stage !== ledger.approvedStage) {
    throw new Error(`stage ${params.stage} is not the approved stage (${ledger.approvedStage}); stages advance only after a recorded PASS`);
  }
  const last = ledger.stageDecisions[ledger.stageDecisions.length - 1];
  if (last?.decision === 'FAIL' && last.stage === params.stage) throw new Error(`stage ${params.stage} failed its quality gate; collection is stopped`);
  if (ledger.reservations.some((r) => r.state === 'RESERVED')) {
    throw new Error('an earlier reservation is not reconciled; finalize or abandon it before collecting more');
  }
  if (ledger.reservations.some((r) => r.runKey === params.runKey)) throw new Error('this run already reserved attempts');
  if (!Number.isSafeInteger(params.maxAttempts) || params.maxAttempts < 1) throw new Error('maxAttempts must be a positive integer');
  const cap = Math.min(ledger.stageCaps[params.stage], ledger.globalCap);
  let budget = Math.min(cap - chargedAttempts(ledger), params.maxAttempts);
  const picked: QueueEntry[] = [];
  for (const entry of queue.entries) {
    if (ledger.blocks[entry.blockId] || ledger.deviceStops[entry.deviceKey]) continue;
    if (entry.attempts > budget) break; // preserve queue order; never skip ahead to smaller blocks
    picked.push(entry);
    budget -= entry.attempts;
  }
  if (!picked.length) throw new Error(`no whole block fits the remaining stage-${params.stage} budget`);
  const next: Ledger = structuredClone(ledger);
  next.reservations.push({ runKey: params.runKey, stage: params.stage, reservedAt: params.now,
    blockIds: picked.map((e) => e.blockId), reservedAttempts: picked.reduce((n, e) => n + e.attempts, 0),
    state: 'RESERVED', chargedAttempts: null, artifact: null, stopReason: null, finalizedAt: null });
  for (const e of picked) next.blocks[e.blockId] = { runKey: params.runKey, deviceKey: e.deviceKey, state: 'RESERVED', hostedGate: null };
  if (chargedAttempts(next) > cap) throw new Error('reservation would exceed the stage cap');
  return { ledger: next, entries: picked };
}

const EXPIRY_MARGIN_MS = 89 * 86400000;

function manifestProblems(manifest: RunManifest, reservation: LedgerReservation, queue: CampaignQueue): string | null {
  if (manifest.version !== 1 || manifest.runKey !== reservation.runKey || manifest.campaignId !== queue.campaignId) return 'manifest identity mismatch';
  const reserved = reservation.blockIds.flatMap((id) => queue.entries.find((e) => e.blockId === id)!.experimentIds
    .map((experimentId) => ({ experimentId, blockId: id })));
  if (manifest.attempts.length > reserved.length) return 'manifest has more attempts than were reserved';
  const ids = manifest.attempts.map((a) => a.experimentId);
  if (new Set(ids).size !== ids.length) return 'manifest repeats an experiment';
  for (const a of manifest.attempts) {
    if (!reserved.some((r) => r.experimentId === a.experimentId && r.blockId === a.blockId)) return 'manifest attempt outside the reservation';
  }
  // Within each block, attempts must be a prefix of the block's planned order.
  for (const blockId of reservation.blockIds) {
    const planned = queue.entries.find((e) => e.blockId === blockId)!.experimentIds;
    const done = manifest.attempts.filter((a) => a.blockId === blockId).map((a) => a.experimentId);
    if (JSON.stringify(done) !== JSON.stringify(planned.slice(0, done.length))) return 'manifest attempts are out of planned block order';
  }
  return null;
}

/**
 * Finalizes one reservation from the artifact that was downloaded back from
 * GitHub. Nothing is COMPLETED unless its ciphertext was recovered with the
 * recorded hash from an artifact retained for at least 89 days.
 */
export function finalizeReservation(ledger: Ledger, queue: CampaignQueue, runKey: string,
  verification: ArtifactVerification, now: string): Ledger {
  assertLedgerMatchesQueue(ledger, queue);
  const next: Ledger = structuredClone(ledger);
  const reservation = next.reservations.find((r) => r.runKey === runKey);
  if (!reservation || reservation.state !== 'RESERVED') throw new Error('no open reservation for this run');
  const manifest = verification.manifest;
  const problem = !manifest ? 'run manifest was not recovered from a retained artifact' :
    !verification.artifact ? 'artifact metadata unavailable' : manifestProblems(manifest, reservation, queue);
  reservation.finalizedAt = now;
  reservation.artifact = verification.artifact;
  if (problem || !manifest) {
    // Conservative: we cannot prove how many quotations happened.
    reservation.state = 'UNCERTAIN';
    reservation.chargedAttempts = reservation.reservedAttempts;
    reservation.stopReason = problem;
    for (const id of reservation.blockIds) next.blocks[id] = { ...next.blocks[id], state: 'UNCERTAIN', hostedGate: null };
    return next;
  }
  const expiresAt = Date.parse(verification.artifact!.expiresAt);
  for (const a of manifest.attempts) {
    const o = a.outcome;
    const recovered = !!o && verification.recovered[o.cipherFile] === o.cipherSha256 &&
      Number.isFinite(expiresAt) && expiresAt >= Date.parse(o.collectedAt) + EXPIRY_MARGIN_MS;
    next.experiments[a.experimentId] = {
      blockId: a.blockId, runKey,
      status: !o ? 'INTERRUPTED' : !recovered ? 'EVIDENCE_UNVERIFIED' : o.status,
      reason: !o ? 'attempt started but no outcome was recorded' : !recovered ? 'encrypted evidence not recovered with matching hash and 90-day retention' : o.reason,
      collectedAt: o?.collectedAt ?? null, cipherFile: o?.cipherFile ?? null,
      cipherSha256: o?.cipherSha256 ?? null, evidenceSha256: o?.evidenceSha256 ?? null,
    };
  }
  for (const blockId of reservation.blockIds) {
    const entry = queue.entries.find((e) => e.blockId === blockId)!;
    const attempted = manifest.attempts.filter((a) => a.blockId === blockId);
    if (!attempted.length) { delete next.blocks[blockId]; continue; } // provably never started: released
    const gate = manifest.blocks.find((b) => b.blockId === blockId)?.hostedGate ?? null;
    const allRetained = attempted.every((a) => next.experiments[a.experimentId].status !== 'EVIDENCE_UNVERIFIED' &&
      next.experiments[a.experimentId].status !== 'INTERRUPTED');
    next.blocks[blockId] = { runKey, deviceKey: entry.deviceKey,
      state: attempted.length === entry.experimentIds.length ? 'COLLECTED' : 'STOPPED',
      hostedGate: gate && !allRetained ? { valid: false, reason: 'evidence not retained for every experiment' } : gate };
  }
  for (const stop of manifest.deviceStops) next.deviceStops[stop.deviceKey] = stop.reason;
  reservation.state = 'FINALIZED';
  reservation.chargedAttempts = manifest.attempts.length;
  reservation.stopReason = manifest.stopReason;
  return next;
}

/** Laptop-only: a run died without finalizing. Its whole reservation stays charged. */
export function abandonReservation(ledger: Ledger, runKey: string, reason: string, now: string): Ledger {
  const next: Ledger = structuredClone(ledger);
  const r = next.reservations.find((x) => x.runKey === runKey);
  if (!r || r.state !== 'RESERVED') throw new Error('no open reservation for this run');
  Object.assign(r, { state: 'UNCERTAIN', chargedAttempts: r.reservedAttempts, stopReason: reason, finalizedAt: now });
  for (const id of r.blockIds) next.blocks[id] = { ...next.blocks[id], state: 'UNCERTAIN', hostedGate: null };
  return next;
}

/** Laptop-only: record a quality-gate decision. Only PASS advances; there is no override. */
export function recordStageDecision(ledger: Ledger, decision: StageDecision): Ledger {
  if (decision.stage !== ledger.approvedStage) throw new Error('decision must be for the currently approved stage');
  if (ledger.reservations.some((r) => r.state === 'RESERVED')) throw new Error('reconcile open reservations before deciding a stage');
  const next: Ledger = structuredClone(ledger);
  next.stageDecisions.push(decision);
  if (decision.decision === 'PASS' && decision.stage < 3) next.approvedStage = (decision.stage + 1) as Stage;
  return next;
}
