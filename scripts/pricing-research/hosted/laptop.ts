/**
 * Owner-laptop tooling for the hosted campaign. The private key and decrypted
 * evidence live under ~/.fhoneify-research (outside OneDrive and the repo).
 *
 *   keygen                      create the RSA-4096 keypair; pin the public key in the repo
 *   build-queue                 write campaign-queue.json from Claude's committed plan
 *   init-ledger --out f         create an empty ledger for the ledger branch
 *   push-session                visible login -> final-price gate -> CASHIFY_RESEARCH_SESSION secret (never on disk)
 *   fetch --ledger f            download every artifact, verify hashes, decrypt, ingest, keep raw zips
 *   report --ledger f --stage n stage report + quality gates (markdown, local)
 *   decide-stage --ledger f --stage n   record PASS/FAIL from the gates (no override)
 *   abandon --ledger f --run-key k --reason r
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import readline from 'node:readline/promises';
import { loadMatrixPlan } from '../run-matrix-pilot';
import { LocalMatrixStore, type MatrixObservation } from '../matrixStore';
import { validateFinalQuote } from '../quoteEvidence';
import { blockExperiments, buildCampaignQueue, type CampaignQueue } from './campaign';
import { abandonReservation, chargedAttempts, createLedger, recordStageDecision, type Ledger, type Stage } from './ledger';
import { hostedBlockGate, openBundle, publicKeyFingerprint, sha256 } from './evidence';
import { REPOSITORY, verifyArtifact } from './github';
import { KEY_RECORD_FILE, PLAN_FILE, PUBLIC_KEY_FILE, QUEUE_FILE, loadVerifiedQueue } from './run-hosted';
import { classifyInteraction, deduction, fitDeductionForm } from '../../research-design/analysis';
import type { Plan } from '../../research-design/plan';

export const HOME = path.join(os.homedir(), '.fhoneify-research');
const KEY_DIR = path.join(HOME, 'keys');
const EVIDENCE_DIR = path.join(HOME, 'evidence');
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; };
const need = (name: string) => { const v = arg(name); if (!v) throw new Error(`--${name} is required`); return v; };
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const writeJson = (file: string, value: unknown) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const assertLaptop = () => { if (process.env.GITHUB_ACTIONS === 'true') throw new Error('laptop-only command'); };
const assertOutsideSync = (dir: string) => {
  if (/onedrive|dropbox|google drive/i.test(path.resolve(dir))) throw new Error(`refusing to store keys/evidence in a synced folder: ${dir}`);
};

function cmdKeygen() {
  assertLaptop(); assertOutsideSync(KEY_DIR);
  if (fs.existsSync(path.join(KEY_DIR, 'private.pem'))) throw new Error('a private key already exists; refusing to overwrite evidence access');
  const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(KEY_DIR, 'private.pem'), keys.privateKey, { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(PUBLIC_KEY_FILE, keys.publicKey, { flag: 'wx' });
  const fingerprintSha256 = publicKeyFingerprint(keys.publicKey);
  writeJson(KEY_RECORD_FILE, { algorithm: 'RSA-OAEP-SHA256+A256GCM', modulusLength: 4096, fingerprintSha256,
    createdAt: new Date().toISOString(), note: 'Public key only. The private key never leaves the owner laptop.' });
  console.log(`Keypair created. Private key: ${path.join(KEY_DIR, 'private.pem')} (back it up offline; losing it loses all evidence).`);
  console.log(`Public key pinned in the repo, fingerprint ${fingerprintSha256}.`);
}

function planAndQueue(): { plan: Plan; queue: CampaignQueue } {
  const plan = loadMatrixPlan(PLAN_FILE);
  return { plan, queue: loadVerifiedQueue(plan) };
}

function cmdBuildQueue() {
  const plan = loadMatrixPlan(PLAN_FILE);
  const queue = buildCampaignQueue(plan, { referenceMeta: readJson(path.resolve(__dirname, '../../../lib/cashify_prices.meta.json')) });
  writeJson(QUEUE_FILE, queue);
  console.log(`Queue written: ${queue.entries.length} blocks, ${queue.entries.reduce((n, e) => n + e.attempts, 0)} planned attempts (cap ${queue.globalCap}).`);
}

function cmdInitLedger() {
  const out = need('out');
  if (fs.existsSync(out)) throw new Error('ledger already exists');
  writeJson(out, createLedger(planAndQueue().queue));
  console.log('Empty ledger created.');
}

/** Visible, owner-driven login. Only a verified final-quote session is sent, straight from memory to GitHub. */
async function cmdPushSession() {
  assertLaptop();
  const { chromium } = await import('playwright');
  const model = 'POCO C3'; const storage = '4 GB/64 GB';
  const browser = await chromium.launch({ headless: false });
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.cashify.in/', { waitUntil: 'domcontentloaded' });
    console.log('A visible browser is open. Log in to Cashify yourself (never type the OTP here).');
    console.log(`Then get a quotation for ${model} (${storage}) and stop on the Selling price screen. Do not schedule a pickup.`);
    await input.question('Press Enter when the final quotation is visible...');
    let verified = false;
    for (const candidate of context.pages()) {
      if (candidate.isClosed()) continue;
      const first = validateFinalQuote(candidate.url(), await candidate.locator('body').innerText(), { model, storage });
      await candidate.waitForTimeout(1200);
      const second = validateFinalQuote(candidate.url(), await candidate.locator('body').innerText(), { model, storage });
      if (first.ok && second.ok && first.price === second.price) verified = true;
    }
    if (!verified) { console.error('Final-price gate failed; nothing was uploaded.'); process.exitCode = 2; return; }
    const wrapper = Buffer.from(JSON.stringify({ version: 1, createdAt: new Date().toISOString(),
      storageState: await context.storageState() })).toString('base64');
    if (wrapper.length > 48 * 1024) throw new Error('session is larger than the 48 KB GitHub secret limit');
    await new Promise<void>((resolve, reject) => {
      const child = spawn('gh', ['secret', 'set', 'CASHIFY_RESEARCH_SESSION', '--repo', REPOSITORY], { stdio: ['pipe', 'ignore', 'ignore'] });
      child.on('error', reject);
      child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gh secret set exited with ${code}`)));
      child.stdin.end(wrapper);
    });
    console.log('Verified session stored as the CASHIFY_RESEARCH_SESSION secret. No session file was written.');
  } finally { input.close(); await browser.close(); }
}

function ghToken(): string {
  return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** Downloads, verifies and decrypts every finalized artifact into ~/.fhoneify-research/evidence. */
async function cmdFetch() {
  assertLaptop(); assertOutsideSync(EVIDENCE_DIR);
  const ledger = readJson<Ledger>(need('ledger'));
  const privatePem = fs.readFileSync(path.join(KEY_DIR, 'private.pem'));
  const store = new LocalMatrixStore(path.join(EVIDENCE_DIR, 'hosted.sqlite'), true);
  const token = ghToken();
  let ingested = 0;
  try {
    for (const r of ledger.reservations.filter((x) => x.artifact)) {
      const zipFile = path.join(EVIDENCE_DIR, 'artifacts', `${r.artifact!.name}.zip`);
      let files: Map<string, Buffer>;
      if (fs.existsSync(zipFile)) {
        files = (await import('./evidence')).readZip(fs.readFileSync(zipFile));
      } else {
        const v = await verifyArtifact(r.artifact!.id, token);
        fs.mkdirSync(path.dirname(zipFile), { recursive: true });
        fs.writeFileSync(zipFile, v.zip, { flag: 'wx' });
        files = (await import('./evidence')).readZip(v.zip);
      }
      for (const [experimentId, e] of Object.entries(ledger.experiments).filter(([, x]) => x.runKey === r.runKey && x.cipherFile)) {
        const sealed = files.get(e.cipherFile!);
        if (!sealed || sha256(sealed) !== e.cipherSha256) throw new Error(`ciphertext for ${experimentId} missing or altered`);
        const { bundle, screenshot } = openBundle(sealed, privatePem);
        const row = bundle.observation;
        if (row.experimentId !== experimentId || row.status !== (e.status === 'EVIDENCE_UNVERIFIED' ? row.status : e.status)) {
          throw new Error(`decrypted record ${experimentId} disagrees with the ledger`);
        }
        let evidenceRef: string | null = null;
        if (screenshot && bundle.screenshotName) {
          evidenceRef = path.join(EVIDENCE_DIR, 'screenshots', path.basename(bundle.screenshotName));
          fs.mkdirSync(path.dirname(evidenceRef), { recursive: true });
          if (!fs.existsSync(evidenceRef)) fs.writeFileSync(evidenceRef, screenshot);
        }
        const local: MatrixObservation = { ...row, evidenceRef,
          encryptedArtifact: { id: r.artifact!.id, url: r.artifact!.url, cipherSha256: e.cipherSha256!, expiresAt: r.artifact!.expiresAt } };
        if (e.status === 'EVIDENCE_UNVERIFIED') continue; // never counted as completed
        if (!store.get(local.planVersion, local.experimentId) || store.get(local.planVersion, local.experimentId)!.runId !== local.runId) {
          store.record(local); ingested++;
        }
      }
    }
  } finally { store.close(); }
  console.log(`Fetched and verified evidence; ${ingested} new records ingested into ${path.join(EVIDENCE_DIR, 'hosted.sqlite')}.`);
}

interface GateResult { id: string; pass: boolean; detail: string }

export function evaluateStage(stage: Stage, ledger: Ledger, queue: CampaignQueue, plan: Plan, rows: MatrixObservation[]) {
  const reservations = ledger.reservations.filter((r) => r.stage === stage);
  const runKeys = new Set(reservations.map((r) => r.runKey));
  const exps = Object.entries(ledger.experiments).filter(([, e]) => runKeys.has(e.runKey));
  const attempts = exps.length;
  const n = (s: string) => exps.filter(([, e]) => e.status === s).length;
  const rowById = new Map(rows.map((r) => [r.experimentId, r]));
  const blocks = [...new Set(reservations.flatMap((r) => r.blockIds))].filter((id) => ledger.blocks[id]);
  const blockResults = blocks.map((blockId) => {
    const entry = queue.entries.find((e) => e.blockId === blockId)!;
    const block = plan.blocks.find((b) => b.blockId === blockId)!;
    const device = plan.devices.find((d) => d.deviceKey === entry.deviceKey)!;
    const experiments = blockExperiments(plan, block);
    const blockRows = experiments.map((e) => rowById.get(e.experimentId)).filter(Boolean) as MatrixObservation[];
    const gate = ledger.blocks[blockId].state === 'COLLECTED' ? hostedBlockGate(device, experiments, blockRows) : null;
    return { blockId, entry, experiments, rows: blockRows, gate, state: ledger.blocks[blockId].state };
  });
  const bracketed = blockResults.filter((b) => b.gate?.bracketWithinTolerance !== null && b.gate);
  const drifted = bracketed.filter((b) => b.gate!.bracketWithinTolerance === false).length;
  const valid = blockResults.filter((b) => b.gate?.valid);
  const completedRows = exps.filter(([, e]) => e.status === 'COMPLETED').map(([id]) => rowById.get(id));
  const runtimeNotAsked = exps.filter(([id, e]) => {
    if (e.status !== 'NOT_ASKED') return false;
    const planned = plan.experiments.find((x) => x.experimentId === id)!;
    return planned.changes.every((c) => planned.requiresRuntimeConfirmation.includes(c.factorId));
  }).length;
  const wrongVariant = completedRows.filter((r) => { if (!r) return false;
    const entry = queue.entries.find((e) => e.blockId === r.blockId);
    return !entry || r.deviceKey !== entry.deviceKey || r.model !== entry.model || r.storage !== entry.storage; }).length;
  const flatBlocks = valid.filter((b) => new Set(b.rows.filter((r) => r.status === 'COMPLETED').map((r) => r.finalPrice)).size < 2).length;
  const mixed = blockResults.filter((b) => new Set(b.rows.map((r) => r.runId)).size > 1).length;
  const gates: GateResult[] = [
    { id: 'G1 no authentication challenge', pass: n('AUTH_REQUIRED') === 0, detail: `${n('AUTH_REQUIRED')} AUTH_REQUIRED` },
    { id: 'G2 evidence retained and verified', pass: n('EVIDENCE_UNVERIFIED') === 0 && n('INTERRUPTED') === 0 &&
      reservations.every((r) => r.state === 'FINALIZED') && completedRows.every((r) => !!r?.encryptedArtifact),
      detail: `${completedRows.filter(Boolean).length}/${n('COMPLETED')} completed rows decrypted with matching screenshot hash; ${n('EVIDENCE_UNVERIFIED')} unverified; ${reservations.filter((r) => r.state !== 'FINALIZED').length} unreconciled runs` },
    { id: 'G3 genuine final quotations', pass: completedRows.every(Boolean) && flatBlocks === 0,
      detail: `every completed row passed the Selling-price gate and local store validation; ${flatBlocks} valid blocks with a single repeated price` },
    { id: 'G4 exact device and variant', pass: wrongVariant === 0, detail: `${wrongVariant} rows with a different model/variant` },
    { id: 'G5 planned answers', pass: n('INVALID_ANSWER_MISMATCH') <= Math.floor(attempts * 0.05),
      detail: `${n('INVALID_ANSWER_MISMATCH')} mismatches rejected (limit 5% of ${attempts}); accepted rows have none by construction` },
    { id: 'G6 baseline drift <= Rs10', pass: stage === 1 ? drifted === 0 : drifted <= Math.floor(bracketed.length * 0.1),
      detail: `${drifted} of ${bracketed.length} bracketed blocks drifted` },
    { id: 'G7 no mixed runs or repeats', pass: mixed === 0, detail: `${mixed} blocks mixing runs` },
    { id: 'G8 completion', pass: attempts > 0 && (n('COMPLETED') + runtimeNotAsked) / attempts >= 0.8 &&
      new Set(valid.map((b) => b.entry.deviceKey)).size >= 3 && new Set(valid.map((b) => b.entry.group)).size >= 3,
      detail: `${n('COMPLETED')} completed + ${runtimeNotAsked} runtime NOT_ASKED of ${attempts}; valid blocks on ${new Set(valid.map((b) => b.entry.deviceKey)).size} devices / ${new Set(valid.map((b) => b.entry.group)).size} groups` },
  ];
  return { attempts, counts: Object.fromEntries(['COMPLETED', 'NOT_ASKED', 'UNSUPPORTED', 'INVALID_ANSWER_MISMATCH', 'AUTH_REQUIRED', 'FAILED', 'EVIDENCE_UNVERIFIED', 'INTERRUPTED'].map((s) => [s, n(s)])),
    runtimeNotAsked, blockResults, valid, gates, pass: gates.every((g) => g.pass) };
}

const median = (xs: number[]) => { const s = xs.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const rs = (x: number) => `₹${Math.round(x).toLocaleString('en-IN')}`;

export function renderReport(stage: Stage, ledger: Ledger, queue: CampaignQueue, plan: Plan, rows: MatrixObservation[]): string {
  const ev = evaluateStage(stage, ledger, queue, plan, rows);
  const out: string[] = [`# Cashify hosted campaign - stage ${stage} report`, '', `Generated ${new Date().toISOString()}. Campaign charged ${chargedAttempts(ledger)} / ${ledger.globalCap}.`, '',
    '## Quality gates', '', '| gate | result | detail |', '|---|---|---|', ...ev.gates.map((g) => `| ${g.id} | ${g.pass ? 'PASS' : '**FAIL**'} | ${g.detail} |`), '',
    `**Stage ${stage} ${ev.pass ? 'meets' : 'does NOT meet'} the advancement requirements.**`, '',
    '## Attempts', '', ...Object.entries(ev.counts).map(([s, c]) => `- ${s}: ${c}`), `- total: ${ev.attempts}`, '',
    '## Blocks', '', '| block | device | group | band | state | gate | baseline | close |', '|---|---|---|---|---|---|---:|---:|'];
  for (const b of ev.blockResults) {
    const open = b.rows[0]; const close = b.rows.find((r) => r.experimentId === b.experiments[b.experiments.length - 1].experimentId);
    out.push(`| ${b.blockId} | ${b.entry.model} ${b.entry.storage} | ${b.entry.group} | ${b.entry.priceBand} | ${b.state} | ${b.gate ? (b.gate.valid ? 'valid' : b.gate.reason) : '-'} | ${open?.finalPrice != null ? rs(open.finalPrice) : '-'} | ${close?.finalPrice != null ? rs(close.finalPrice) : '-'} |`);
  }
  out.push('', '## Within-block deductions (valid blocks only)', '', '| condition | device | baseline | price | deduction | % |', '|---|---|---:|---:|---:|---:|');
  const byLevel = new Map<string, Array<{ baseline: number; deduction: number; pct: number }>>();
  for (const b of ev.valid) {
    const base = b.rows[0].finalPrice!;
    for (const e of b.experiments.slice(1, -1)) {
      const row = b.rows.find((r) => r.experimentId === e.experimentId);
      if (!row || row.status !== 'COMPLETED' || e.changes.length === 0) continue;
      const key = e.changes.map((c) => `${c.factorId}=${c.to}`).join(' + ');
      const d = deduction(base, row.finalPrice!);
      byLevel.set(key, [...(byLevel.get(key) ?? []), { baseline: base, deduction: d.abs, pct: d.pct }]);
      out.push(`| ${key} | ${b.entry.model} ${b.entry.storage} | ${rs(base)} | ${rs(row.finalPrice!)} | ${rs(d.abs)} | ${(d.pct * 100).toFixed(1)}% |`);
    }
  }
  out.push('', '## Per-condition summary', '', '| condition | n | median ₹ | median % | form (n>=3) |', '|---|---:|---:|---:|---|');
  for (const [key, pts] of [...byLevel].sort()) {
    const fit = pts.length >= 3 ? fitDeductionForm(pts.map((p) => ({ baseline: p.baseline, deduction: p.deduction }))) : null;
    out.push(`| ${key} | ${pts.length} | ${rs(median(pts.map((p) => p.deduction)))} | ${(median(pts.map((p) => p.pct)) * 100).toFixed(1)}% | ${fit ? `${fit.form} (R² ${fit.r2.toFixed(2)})` : '-'} |`);
  }
  out.push('', '## Interactions (pairs with both singles in the same valid block)', '', '| pair | device | dA | dB | dAB | additive | multiplicative | max | class |', '|---|---|---:|---:|---:|---:|---:|---:|---|');
  for (const b of ev.valid) {
    const base = b.rows[0].finalPrice!;
    const price = (id: string) => b.rows.find((r) => r.experimentId === id && r.status === 'COMPLETED')?.finalPrice;
    for (const e of b.experiments.filter((x) => x.kinds.includes('PAIR') && x.referenceExperimentIds.length === 2)) {
      const [pa, pb, pab] = [price(e.referenceExperimentIds[0]), price(e.referenceExperimentIds[1]), price(e.experimentId)];
      if (pa == null || pb == null || pab == null) continue;
      const r = classifyInteraction(base, base - pa, base - pb, base - pab);
      out.push(`| ${e.changes.map((c) => `${c.factorId}=${c.to}`).join(' + ')} | ${b.entry.model} | ${rs(base - pa)} | ${rs(base - pb)} | ${rs(base - pab)} | ${rs(r.predictions.additive)} | ${rs(r.predictions.multiplicative)} | ${rs(r.predictions.overlapMax)} | ${r.cls} |`);
    }
  }
  out.push('', '## Unsupported / stopped', '');
  for (const [device, reason] of Object.entries(ledger.deviceStops)) out.push(`- ${device}: ${reason}`);
  for (const [id, e] of Object.entries(ledger.experiments).filter(([, x]) => x.status !== 'COMPLETED')) out.push(`- ${id}: ${e.status}${e.reason ? ` (${e.reason})` : ''}`);
  out.push('', '## Evidence artifacts', '');
  for (const r of ledger.reservations.filter((x) => x.stage === stage)) out.push(`- run ${r.runKey}: ${r.state}; ${r.artifact ? `[artifact ${r.artifact.id}](${r.artifact.url}) expires ${r.artifact.expiresAt}` : 'no artifact'}; charged ${r.chargedAttempts ?? r.reservedAttempts}`);
  out.push('', 'Deductions are measured inside one block against its own opening baseline. This is TRAINING evidence only; it is not validation accuracy.');
  return out.join('\n');
}

function localRows(): MatrixObservation[] {
  const file = path.join(EVIDENCE_DIR, 'hosted.sqlite');
  if (!fs.existsSync(file)) return [];
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  try { return db.prepare('SELECT observation_json FROM matrix_experiments').all().map((r: { observation_json: string }) => JSON.parse(r.observation_json)); }
  finally { db.close(); }
}

function cmdReport() {
  assertLaptop();
  const { plan, queue } = planAndQueue();
  const stage = Number(need('stage')) as Stage;
  const report = renderReport(stage, readJson<Ledger>(need('ledger')), queue, plan, localRows());
  const file = path.join(EVIDENCE_DIR, 'reports', `stage-${stage}-${Date.now()}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, report);
  console.log(report);
  console.log(`\nSaved locally: ${file}`);
}

function cmdDecideStage() {
  assertLaptop();
  const { plan, queue } = planAndQueue();
  const stage = Number(need('stage')) as Stage;
  const ledgerFile = need('ledger');
  const ledger = readJson<Ledger>(ledgerFile);
  const ev = evaluateStage(stage, ledger, queue, plan, localRows());
  const report = renderReport(stage, ledger, queue, plan, localRows());
  const next = recordStageDecision(ledger, { stage, decision: ev.pass ? 'PASS' : 'FAIL', decidedAt: new Date().toISOString(),
    reportSha256: sha256(Buffer.from(report)), summary: ev.gates.map((g) => `${g.id}: ${g.pass ? 'PASS' : 'FAIL'}`).join('; ') });
  writeJson(ledgerFile, next);
  console.log(`Stage ${stage}: ${ev.pass ? 'PASS' : 'FAIL'}; approved stage is now ${next.approvedStage}.`);
}

function cmdAbandon() {
  const ledgerFile = need('ledger');
  writeJson(ledgerFile, abandonReservation(readJson<Ledger>(ledgerFile), need('run-key'), need('reason'), new Date().toISOString()));
  console.log('Reservation marked UNCERTAIN; its full size stays charged and its blocks will not be re-queued.');
}

async function main() {
  const command = process.argv[2];
  const commands: Record<string, () => unknown> = { keygen: cmdKeygen, 'build-queue': cmdBuildQueue, 'init-ledger': cmdInitLedger,
    'push-session': cmdPushSession, fetch: cmdFetch, report: cmdReport, 'decide-stage': cmdDecideStage, abandon: cmdAbandon };
  if (!commands[command]) throw new Error(`usage: laptop.ts ${Object.keys(commands).join('|')}`);
  await commands[command]();
}

if (require.main === module) main().catch((error) => {
  console.error(`[laptop] ${error instanceof Error ? error.message : 'unexpected error'}`);
  process.exitCode = 1;
});
