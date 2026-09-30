/**
 * GitHub-hosted, bounded, checkpointed runner for the approved Cashify matrix
 * campaign. Subcommands (each called by one workflow step):
 *
 *   reserve   charge whole blocks against the ledger BEFORE any quotation
 *   collect   run the reserved blocks with the verified collector; seal every
 *             attempt with the owner's public key; write-ahead manifest
 *   verify    download the uploaded artifact back and re-hash it
 *   finalize  record verified outcomes in the ledger; release never-started attempts
 *   summary   non-sensitive job summary (no prices)
 *
 * Never opens DATABASE_URL, never logs prices, cookies, page text or keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import { collectMatrixExperiment, loadMatrixPlan } from '../run-matrix-pilot';
import { LocalMatrixStore, type MatrixObservation } from '../matrixStore';
import { isSessionLikelyValid } from '../collector';
import { closeCashifyBrowser } from '../../../server/modules/quote/cashifyScraper';
import type { Plan } from '../../research-design/plan';
import { blockExperiments, buildCampaignQueue, queueSha256, type CampaignQueue, type QueueEntry } from './campaign';
import { chargedAttempts, finalizeReservation, reserveBlocks, type Ledger, type RunManifest, type Stage } from './ledger';
import { hostedBlockGate, publicKeyFingerprint, sealAttempt } from './evidence';
import { verifyArtifact } from './github';

const ROOT = path.resolve(__dirname, '../../..');
export const PLAN_FILE = path.join(ROOT, 'scripts/research-design/output/experiment-plan.json');
export const QUEUE_FILE = path.join(__dirname, 'campaign-queue.json');
export const PUBLIC_KEY_FILE = path.join(__dirname, 'research-public.pem');
export const KEY_RECORD_FILE = path.join(__dirname, 'research-public-key.json');
const SESSION_FILE_NAME = 'hosted-research-session.json';
const SESSION_MAX_AGE_MS = 7 * 86400000;
/** Conservative per-attempt estimate used only to avoid starting a block that cannot finish in time. */
const EST_SECONDS_PER_ATTEMPT = 90;

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; };
const need = (name: string) => { const v = arg(name); if (!v) throw new Error(`--${name} is required`); return v; };
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
function writeJsonAtomic(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** No rupee amounts or long numbers in public logs, manifests or ledgers. */
export const scrub = (text: string | null) => text === null ? null : text.replace(/₹\s*[\d,]+/g, '₹#').replace(/\d{4,}/g, '#').slice(0, 240);

export function loadVerifiedQueue(plan: Plan): CampaignQueue {
  const committed = readJson<CampaignQueue>(QUEUE_FILE);
  const rebuilt = buildCampaignQueue(plan, { referenceMeta: readJson(path.join(ROOT, 'lib/cashify_prices.meta.json')) });
  if (queueSha256(committed) !== queueSha256(rebuilt)) throw new Error('committed campaign queue does not match the plan; refusing to run');
  return committed;
}

export function loadPublicKey(): string {
  const pem = fs.readFileSync(PUBLIC_KEY_FILE, 'utf8');
  const record = readJson<{ fingerprintSha256: string }>(KEY_RECORD_FILE);
  if (publicKeyFingerprint(pem) !== record.fingerprintSha256) throw new Error('research public key does not match its pinned fingerprint');
  return pem;
}

/** Materializes the dedicated hosted session secret. Old/shared secrets are never read. */
export function materializeHostedSession(env: NodeJS.ProcessEnv, now = Date.now(), dir = path.join(ROOT, 'cashify-sessions')): string {
  const encoded = env.CASHIFY_RESEARCH_SESSION;
  if (!encoded) throw new Error('CASHIFY_RESEARCH_SESSION secret is not configured');
  let wrapper: { version?: number; createdAt?: string; storageState?: unknown };
  try { wrapper = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); } catch {
    throw new Error('CASHIFY_RESEARCH_SESSION is not a valid session wrapper (contents not logged)');
  }
  const createdAt = Date.parse(wrapper.createdAt ?? '');
  if (wrapper.version !== 1 || !wrapper.storageState || !Number.isFinite(createdAt) || createdAt > now + 600000 ||
    now - createdAt > SESSION_MAX_AGE_MS) {
    throw new Error('hosted session is missing, malformed or older than 7 days; the owner must log in again');
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) throw new Error('unexpected session file present on runner');
  const file = path.join(dir, SESSION_FILE_NAME);
  fs.writeFileSync(file, JSON.stringify(wrapper.storageState), { mode: 0o600 });
  if (!isSessionLikelyValid(file).valid) { fs.rmSync(file, { force: true }); throw new Error('hosted session auth cookie is missing or expired'); }
  return SESSION_FILE_NAME;
}

async function cmdReserve() {
  const plan = loadMatrixPlan(PLAN_FILE);
  const queue = loadVerifiedQueue(plan);
  const ledgerFile = need('ledger');
  const ledger = readJson<Ledger>(ledgerFile);
  const stage = Number(need('stage')) as Stage;
  const { ledger: next, entries } = reserveBlocks(ledger, queue, { runKey: need('run-key'), stage,
    maxAttempts: Number(need('max-attempts')), now: new Date().toISOString() });
  writeJsonAtomic(need('out'), { runKey: need('run-key'), stage, blockIds: entries.map((e) => e.blockId) });
  if (process.argv.includes('--dry-run')) {
    console.log(`[hosted] dry run: would reserve ${entries.length} block(s), ${entries.reduce((n, e) => n + e.attempts, 0)} attempts; ledger not modified`);
  } else writeJsonAtomic(ledgerFile, next);
  for (const e of entries) console.log(`[hosted] reserved ${e.blockId} ${e.brand} ${e.model} ${e.storage} (${e.attempts} attempts)`);
  console.log(`[hosted] charged ${chargedAttempts(process.argv.includes('--dry-run') ? ledger : next)} / ${ledger.stageCaps[stage]} (stage ${stage}), global cap ${ledger.globalCap}`);
}

async function cmdCollect() {
  const plan = loadMatrixPlan(PLAN_FILE);
  const queue = loadVerifiedQueue(plan);
  const reservation = readJson<{ runKey: string; stage: Stage; blockIds: string[] }>(need('reservation'));
  const outDir = path.resolve(need('out'));
  const uploadDir = path.join(outDir, 'upload');
  const paceMs = Math.max(10, Number(arg('pace-seconds') ?? '20')) * 1000;
  const deadline = Date.now() + Number(arg('max-minutes') ?? '300') * 60000;
  const publicPem = loadPublicKey();
  const sessionFileName = materializeHostedSession(process.env);
  const entries = reservation.blockIds.map((id) => queue.entries.find((e) => e.blockId === id)) as QueueEntry[];
  if (entries.some((e) => !e)) throw new Error('reservation references a block outside the campaign queue');
  const manifestFile = path.join(uploadDir, 'manifest.json');
  const manifest: RunManifest = { version: 1, campaignId: queue.campaignId, runKey: reservation.runKey,
    startedAt: new Date().toISOString(), finishedAt: null, complete: false, stopReason: null, attempts: [], blocks: [], deviceStops: [] };
  const save = () => writeJsonAtomic(manifestFile, manifest);
  save();
  const store = new LocalMatrixStore(path.join(outDir, 'runner-validation.sqlite'));
  const stoppedDevices = new Set<string>();
  let invalidBlocks = 0;
  try {
    for (const entry of entries) {
      if (manifest.stopReason) break;
      if (stoppedDevices.has(entry.deviceKey)) continue;
      if (Date.now() + entry.attempts * EST_SECONDS_PER_ATTEMPT * 1000 > deadline) {
        manifest.stopReason = 'time budget: remaining blocks released unstarted'; break;
      }
      const block = plan.blocks.find((b) => b.blockId === entry.blockId)!;
      const device = plan.devices.find((d) => d.deviceKey === entry.deviceKey)!;
      const experiments = blockExperiments(plan, block);
      const rows: MatrixObservation[] = [];
      const runId = `gh-${reservation.runKey}-${entry.blockId}`;
      console.log(`[hosted] block ${entry.blockId}: ${entry.brand} ${entry.model} ${entry.storage}`);
      for (const experiment of experiments) {
        manifest.attempts.push({ experimentId: experiment.experimentId, blockId: entry.blockId, deviceKey: entry.deviceKey,
          startedAt: new Date().toISOString(), outcome: null });
        save(); // write-ahead: the attempt is on record before Cashify is contacted
        let row = await collectMatrixExperiment({ block, device }, experiment, { runId, planVersion: plan.planVersion,
          sessionFileName, evidenceDir: path.join(outDir, 'plaintext-evidence'), headless: true, cashifyUrl: entry.cashifyUrl });
        try { store.record(row); } catch (error) {
          if (row.evidenceRef) fs.rmSync(row.evidenceRef, { force: true });
          row = { ...row, status: 'FAILED', finalPrice: null, evidenceRef: null, evidenceSha256: null,
            statusReason: `local evidence validation rejected the quote: ${error instanceof Error ? error.message : 'unknown'}` };
          store.record(row);
        }
        rows.push(row);
        const sealed = sealAttempt(row, publicPem, uploadDir);
        manifest.attempts[manifest.attempts.length - 1].outcome = { status: row.status, reason: scrub(row.statusReason),
          collectedAt: row.collectedAt, ...sealed, evidenceSha256: row.evidenceSha256 };
        save();
        console.log(`[hosted]   ${experiment.experimentId}: ${row.status}`);
        const runtimeOnly = row.status === 'NOT_ASKED' && experiment.changes.length > 0 &&
          experiment.changes.every((c) => experiment.requiresRuntimeConfirmation.includes(c.factorId));
        if (row.status === 'AUTH_REQUIRED') { manifest.stopReason = `AUTH_REQUIRED: ${scrub(row.statusReason)}`; break; }
        if (manifest.attempts.length === 1 && row.status !== 'COMPLETED') {
          manifest.stopReason = `first quotation of the job did not pass the final-price gate (${row.status})`; break;
        }
        if (row.status !== 'COMPLETED' && !runtimeOnly) {
          stoppedDevices.add(entry.deviceKey);
          manifest.deviceStops.push({ deviceKey: entry.deviceKey, reason: `${row.status} at ${experiment.experimentId}: ${scrub(row.statusReason)}` });
          break;
        }
        await sleep(paceMs);
      }
      save();
      if (rows.length === experiments.length) {
        const gate = hostedBlockGate(device, experiments, rows);
        manifest.blocks.push({ blockId: entry.blockId, hostedGate: { valid: gate.valid, reason: gate.reason } });
        console.log(`[hosted] block ${entry.blockId} hosted gate: ${gate.valid ? 'PASS' : `FAIL (${gate.reason})`}`);
        if (!gate.valid) invalidBlocks++;
      }
      if (invalidBlocks >= 2) manifest.stopReason = 'two invalid blocks in one job: questionnaire or prices may have changed';
      if (manifest.deviceStops.length >= 3) manifest.stopReason = 'three devices stopped in one job: collector/site mismatch suspected';
      save();
      if (!manifest.stopReason) await sleep(paceMs * 3);
    }
    manifest.complete = true;
  } finally {
    manifest.finishedAt = new Date().toISOString();
    save();
    store.close();
    fs.rmSync(path.join(ROOT, 'cashify-sessions', sessionFileName), { force: true });
    fs.rmSync(path.join(outDir, 'plaintext-evidence'), { recursive: true, force: true });
    await closeCashifyBrowser().catch(() => {});
  }
  console.log(`[hosted] attempted ${manifest.attempts.length}; stop reason: ${manifest.stopReason ?? 'none'}`);
}

async function cmdVerify() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required to read the artifact back');
  const artifactId = Number(need('artifact-id'));
  const runId = Number(process.env.GITHUB_RUN_ID);
  const { zip: _zip, ...verification } = await verifyArtifact(artifactId, token, Number.isFinite(runId) ? runId : undefined);
  writeJsonAtomic(need('out'), verification);
  const local = readJson<RunManifest>(need('manifest'));
  const mismatched = local.attempts.filter((a) => a.outcome && verification.recovered[a.outcome.cipherFile] !== a.outcome.cipherSha256).length;
  console.log(`[hosted] artifact ${verification.artifact?.id} expires ${verification.artifact?.expiresAt}; ` +
    `${Object.keys(verification.recovered).length} ciphertexts recovered, ${mismatched} missing or mismatched`);
}

async function cmdFinalize() {
  const plan = loadMatrixPlan(PLAN_FILE);
  const queue = loadVerifiedQueue(plan);
  const ledgerFile = need('ledger');
  const verificationFile = arg('verification');
  const verification = verificationFile && fs.existsSync(verificationFile) ? readJson<any>(verificationFile)
    : { artifact: null, recovered: {}, manifest: null };
  const next = finalizeReservation(readJson<Ledger>(ledgerFile), queue, need('run-key'), verification, new Date().toISOString());
  writeJsonAtomic(ledgerFile, next);
  const r = next.reservations.find((x) => x.runKey === need('run-key'))!;
  console.log(`[hosted] reservation ${r.runKey}: ${r.state}, charged ${r.chargedAttempts} of ${r.reservedAttempts}; campaign total ${chargedAttempts(next)}`);
}

function cmdSummary() {
  const ledger = readJson<Ledger>(need('ledger'));
  const runKey = need('run-key');
  const r = ledger.reservations.find((x) => x.runKey === runKey);
  const rows = Object.entries(ledger.experiments).filter(([, e]) => e.runKey === runKey);
  const count = (s: string) => rows.filter(([, e]) => e.status === s).length;
  const lines = [`## Cashify hosted campaign - run ${runKey}`, '',
    `Reservation: ${r?.state ?? 'none'}; charged ${r?.chargedAttempts ?? r?.reservedAttempts ?? 0}; campaign total ${chargedAttempts(ledger)} / ${ledger.globalCap}; approved stage ${ledger.approvedStage}`,
    `Stop reason: ${r?.stopReason ?? 'none'}`, `Artifact: ${r?.artifact ? `${r.artifact.url} (expires ${r.artifact.expiresAt})` : 'none'}`, '',
    '| status | n |', '|---|---:|',
    ...['COMPLETED', 'NOT_ASKED', 'UNSUPPORTED', 'INVALID_ANSWER_MISMATCH', 'AUTH_REQUIRED', 'FAILED', 'EVIDENCE_UNVERIFIED', 'INTERRUPTED']
      .map((s) => `| ${s} | ${count(s)} |`), '', '| block | state | hosted gate |', '|---|---|---|',
    ...(r?.blockIds ?? []).map((id) => { const b = ledger.blocks[id];
      return `| ${id} | ${b?.state ?? 'released'} | ${b?.hostedGate ? (b.hostedGate.valid ? 'PASS' : `FAIL: ${b.hostedGate.reason}`) : '-'} |`; }),
    '', 'Prices and questionnaire evidence are encrypted; decrypt on the owner laptop.'];
  console.log(lines.join('\n'));
}

/** No Cashify request: proves plan/queue, pinned public key and the session secret are usable. */
function cmdPreflight() {
  const plan = loadMatrixPlan(PLAN_FILE);
  const queue = loadVerifiedQueue(plan);
  const pem = loadPublicKey();
  if (/PRIVATE KEY/.test(JSON.stringify(process.env))) throw new Error('a private key is present in the runner environment');
  const name = materializeHostedSession(process.env);
  fs.rmSync(path.join(ROOT, 'cashify-sessions', name), { force: true });
  console.log(`[hosted] preflight ok: ${queue.entries.length} queued blocks, key ${publicKeyFingerprint(pem).slice(0, 16)}, session wrapper valid and removed`);
}

async function main() {
  const command = process.argv[2];
  if (command === 'preflight') return cmdPreflight();
  if (command === 'reserve') return cmdReserve();
  if (command === 'collect') return cmdCollect();
  if (command === 'verify') return cmdVerify();
  if (command === 'finalize') return cmdFinalize();
  if (command === 'summary') return cmdSummary();
  throw new Error('usage: run-hosted.ts preflight|reserve|collect|verify|finalize|summary ...');
}

if (require.main === module) main().catch((error) => {
  console.error(`[hosted] stopped: ${scrub(error instanceof Error ? error.message : 'unexpected error')}`);
  process.exitCode = 1;
});
