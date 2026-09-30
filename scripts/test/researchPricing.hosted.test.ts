import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadMatrixPlan } from '../pricing-research/run-matrix-pilot';
import { blockExperiments, buildCampaignQueue, priorityGroup, queueSha256, STAGE1_BLOCKS, type CampaignQueue } from '../pricing-research/hosted/campaign';
import { abandonReservation, chargedAttempts, createLedger, finalizeReservation, recordStageDecision, reserveBlocks,
  type ArtifactVerification, type Ledger, type RunManifest } from '../pricing-research/hosted/ledger';
import { hostedBlockGate, openBundle, readZip, sealAttempt, sha256 } from '../pricing-research/hosted/evidence';
import { loadPublicKey, loadVerifiedQueue, materializeHostedSession, scrub } from '../pricing-research/hosted/run-hosted';
import type { MatrixObservation } from '../pricing-research/matrixStore';

const root = path.resolve(__dirname, '../..');
const plan = loadMatrixPlan(path.join(root, 'scripts/research-design/output/experiment-plan.json'));
const queue: CampaignQueue = loadVerifiedQueue(plan); // committed queue == deterministic rebuild
const meta = JSON.parse(fs.readFileSync(path.join(root, 'lib/cashify_prices.meta.json'), 'utf8'));

// --- queue: a filter/order of Claude's plan, never a regeneration -----------------------------
assert.equal(queueSha256(buildCampaignQueue(plan, { referenceMeta: meta })), queueSha256(queue));
assert.deepEqual(queue.entries.slice(0, 4).map((e) => e.blockId), STAGE1_BLOCKS);
assert.equal(queue.entries.slice(0, 4).reduce((n, e) => n + e.attempts, 0), 100);
assert.equal(new Set(queue.entries.slice(0, 4).map((e) => e.group)).size, 4);
assert.equal(new Set(queue.entries.map((e) => e.blockId)).size, queue.entries.length);
for (const entry of queue.entries) {
  const device = plan.devices.find((d) => d.deviceKey === entry.deviceKey)!;
  const block = plan.blocks.find((b) => b.blockId === entry.blockId)!;
  assert.notEqual(device.role, 'VALIDATION');
  assert.notEqual(block.role, 'VALIDATION');
  assert.ok(priorityGroup(device));
  assert.deepEqual(entry.experimentIds, blockExperiments(plan, block).map((e) => e.experimentId)); // IDs and order preserved
  assert.ok(blockExperiments(plan, block).every((e) => !e.blind));
}
const validationKeys = new Set(plan.devices.filter((d) => d.role === 'VALIDATION').map((d) => d.deviceKey));
assert.ok(queue.entries.every((e) => !validationKeys.has(e.deviceKey)), 'held-out validation devices stay untouched');
assert.equal(priorityGroup({ brand: 'Xiaomi', model: 'Xiaomi Redmi Note 9 Pro' }), 'redmi');
assert.equal(priorityGroup({ brand: 'Xiaomi', model: 'Xiaomi Mi A2' }), 'xiaomi_mi');
assert.equal(priorityGroup({ brand: 'Xiaomi', model: 'Xiaomi 15 Ultra' }), 'xiaomi_mi');
assert.equal(priorityGroup({ brand: 'POCO', model: 'POCO F4 5G' }), null);
assert.equal(priorityGroup({ brand: 'Vivo', model: 'Vivo V40' }), null);
const firstRedmi = queue.entries.findIndex((e) => e.group === 'redmi');
assert.ok(firstRedmi > 0 && queue.entries.slice(0, 1500).some((e) => e.group === 'redmi'));

// --- ledger: global/stage budget, write-ahead charging, no duplicates ------------------------
const now = '2026-10-01T00:00:00.000Z';
let ledger = createLedger(queue);
assert.throws(() => reserveBlocks(ledger, queue, { runKey: '1.1', stage: 2, maxAttempts: 100, now }), /not the approved stage/);
let r = reserveBlocks(ledger, queue, { runKey: '1.1', stage: 1, maxAttempts: 500, now });
assert.deepEqual(r.entries.map((e) => e.blockId), STAGE1_BLOCKS);
assert.equal(chargedAttempts(r.ledger), 100);
assert.throws(() => reserveBlocks(r.ledger, queue, { runKey: '2.1', stage: 1, maxAttempts: 10, now }), /not reconciled/);
assert.throws(() => reserveBlocks(ledger, queue, { runKey: 'x', stage: 1, maxAttempts: 10, now }), /runKey/);
assert.throws(() => reserveBlocks(ledger, queue, { runKey: '3.1', stage: 1, maxAttempts: 10, now }), /no whole block fits/);
assert.throws(() => reserveBlocks({ ...ledger, queueSha256: 'x' }, queue, { runKey: '3.1', stage: 1, maxAttempts: 100, now }), /does not belong/);

function manifestFor(entries: typeof r.entries, runKey: string, attemptsPerBlock: number[], complete = true): RunManifest {
  const attempts: RunManifest['attempts'] = [];
  entries.forEach((e, bi) => e.experimentIds.slice(0, attemptsPerBlock[bi] ?? 0).forEach((experimentId, i) => attempts.push({
    experimentId, blockId: e.blockId, deviceKey: e.deviceKey, startedAt: now,
    outcome: { status: 'COMPLETED', reason: null, collectedAt: now, cipherFile: `${bi}-${i}.fhc`, cipherSha256: sha256(Buffer.from(`${bi}-${i}`)), evidenceSha256: 'a'.repeat(64) } })));
  return { version: 1, campaignId: queue.campaignId, runKey, startedAt: now, finishedAt: now, complete, stopReason: null, attempts,
    blocks: entries.filter((_, bi) => attemptsPerBlock[bi] === entries[bi].attempts).map((e) => ({ blockId: e.blockId, hostedGate: { valid: true, reason: null } })),
    deviceStops: [] };
}
const artifact = { id: 7, name: 'cashify-hosted-1-1', url: 'https://github.com/Shaik-Nvd/fhoneify/actions/runs/1/artifacts/7',
  expiresAt: '2026-12-30T00:00:00.000Z', sizeBytes: 10 };
function verificationFor(m: RunManifest, drop: string[] = [], expiresAt = artifact.expiresAt): ArtifactVerification {
  const recovered: Record<string, string> = {};
  for (const a of m.attempts) if (a.outcome && !drop.includes(a.outcome.cipherFile)) recovered[a.outcome.cipherFile] = a.outcome.cipherSha256;
  return { artifact: { ...artifact, expiresAt }, recovered, manifest: m };
}
// Block 1 complete, block 2 stopped after 3, blocks 3-4 never started (released).
let m = manifestFor(r.entries, '1.1', [25, 3, 0, 0]);
m.attempts[26].outcome = null; // interrupted mid-quote: still charged
m.deviceStops.push({ deviceKey: r.entries[1].deviceKey, reason: 'UNSUPPORTED at x' });
let f = finalizeReservation(r.ledger, queue, '1.1', verificationFor(m, ['0-5.fhc']), now);
assert.equal(f.reservations[0].state, 'FINALIZED');
assert.equal(f.reservations[0].chargedAttempts, 28);
assert.equal(chargedAttempts(f), 28);
assert.equal(f.experiments[r.entries[0].experimentIds[5]].status, 'EVIDENCE_UNVERIFIED');
assert.equal(f.experiments[r.entries[1].experimentIds[1]].status, 'INTERRUPTED');
assert.equal(f.blocks[r.entries[0].blockId].state, 'COLLECTED');
assert.deepEqual(f.blocks[r.entries[0].blockId].hostedGate, { valid: false, reason: 'evidence not retained for every experiment' });
assert.equal(f.blocks[r.entries[1].blockId].state, 'STOPPED');
assert.equal(f.blocks[r.entries[2].blockId], undefined);
assert.throws(() => finalizeReservation(f, queue, '1.1', verificationFor(m), now), /no open reservation/);
// The stopped device is never reserved again; released blocks are.
const r2 = reserveBlocks(f, queue, { runKey: '2.1', stage: 1, maxAttempts: 100, now });
assert.ok(r2.entries.every((e) => e.deviceKey !== r.entries[1].deviceKey && e.blockId !== r.entries[0].blockId));
assert.equal(r2.entries[0].blockId, r.entries[2].blockId);
assert.ok(chargedAttempts(r2.ledger) <= 100);
// Short artifact retention is not durable evidence.
f = finalizeReservation(r.ledger, queue, '1.1', verificationFor(manifestFor(r.entries, '1.1', [25, 25, 25, 25]), [], '2026-11-01T00:00:00.000Z'), now);
assert.ok(Object.values(f.experiments).every((e) => e.status === 'EVIDENCE_UNVERIFIED'));
// Unrecoverable manifest: the whole reservation stays charged, nothing is re-queued.
f = finalizeReservation(r.ledger, queue, '1.1', { artifact: null, recovered: {}, manifest: null }, now);
assert.equal(f.reservations[0].state, 'UNCERTAIN');
assert.equal(chargedAttempts(f), 100);
assert.ok(STAGE1_BLOCKS.every((id) => f.blocks[id].state === 'UNCERTAIN'));
assert.throws(() => reserveBlocks(f, queue, { runKey: '2.1', stage: 1, maxAttempts: 100, now }), /no whole block fits/);
// Tampered manifests (out-of-order or outside the reservation) are UNCERTAIN.
const bad = manifestFor(r.entries, '1.1', [25, 0, 0, 0]);
bad.attempts.reverse();
assert.equal(finalizeReservation(r.ledger, queue, '1.1', verificationFor(bad), now).reservations[0].state, 'UNCERTAIN');
assert.equal(abandonReservation(r.ledger, '1.1', 'runner lost', now).reservations[0].chargedAttempts, 100);

// Stage decisions: only PASS advances; FAIL stops collection for that stage.
f = finalizeReservation(r.ledger, queue, '1.1', verificationFor(manifestFor(r.entries, '1.1', [25, 25, 25, 25])), now);
const failed = recordStageDecision(f, { stage: 1, decision: 'FAIL', decidedAt: now, reportSha256: 'x', summary: 'x' });
assert.equal(failed.approvedStage, 1);
assert.throws(() => reserveBlocks(failed, queue, { runKey: '5.1', stage: 1, maxAttempts: 100, now }), /failed its quality gate/);
const passed = recordStageDecision(f, { stage: 1, decision: 'PASS', decidedAt: now, reportSha256: 'x', summary: 'x' });
assert.equal(passed.approvedStage, 2);
assert.throws(() => recordStageDecision(r.ledger, { stage: 1, decision: 'PASS', decidedAt: now, reportSha256: 'x', summary: 'x' }), /reconcile/);

// Simulated full campaign: the global cap is never exceeded, whatever each job asks for.
let sim: Ledger = passed;
for (let i = 0; i < 200; i++) {
  let res;
  try { res = reserveBlocks(sim, queue, { runKey: `${100 + i}.1`, stage: sim.approvedStage, maxAttempts: 300, now }); } catch (error) {
    if (sim.approvedStage < 3 && /no whole block fits/.test(String(error))) {
      sim = recordStageDecision(sim, { stage: sim.approvedStage, decision: 'PASS', decidedAt: now, reportSha256: 'x', summary: 'x' });
      continue;
    }
    break;
  }
  sim = finalizeReservation(res.ledger, queue, `${100 + i}.1`, verificationFor(manifestFor(res.entries, `${100 + i}.1`, res.entries.map((e) => e.attempts))), now);
  assert.ok(chargedAttempts(sim) <= [0, 100, 500, 1500][sim.approvedStage]);
}
assert.ok(chargedAttempts(sim) <= 1500 && chargedAttempts(sim) > 1400, `campaign used ${chargedAttempts(sim)}`);
const collected = Object.keys(sim.experiments);
assert.equal(new Set(collected).size, collected.length);
assert.ok(new Set(Object.values(sim.blocks).map((b) => queue.entries.find((e) => e.deviceKey === b.deviceKey)!.group)).size === 5);

// --- evidence: public-key envelope round trip, plaintext removal, tamper detection -------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-test-'));
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 4096,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const shot = path.join(tmp, 'final.png');
fs.writeFileSync(shot, Buffer.from('fake-png-bytes'));
const block = plan.blocks.find((b) => b.blockId === STAGE1_BLOCKS[0])!;
const device = plan.devices.find((d) => d.deviceKey === block.deviceKey)!;
const exps = blockExperiments(plan, block);
const baseRow = (e: typeof exps[number], price: number | null, status: MatrixObservation['status'] = 'COMPLETED'): MatrixObservation => ({
  runId: 'gh-1.1-x', planVersion: plan.planVersion, experimentId: e.experimentId, blockId: e.blockId, baselineExperimentId: e.baselineExperimentId,
  referenceExperimentIds: e.referenceExperimentIds, deviceKey: device.deviceKey, brand: device.brand, model: device.model, ram: device.ram,
  storage: device.storage, candidateFamily: device.strata.fhoneifyFamily, getUptoAtCollection: 28030, getUptoOffline: device.getUpto,
  answers: e.answers, questions: [], changedFactors: e.changes.map((c) => c.factorId), checkboxesTicked: [], agePageRendered: true,
  finalPrice: status === 'COMPLETED' ? price : null, status, statusReason: status === 'COMPLETED' ? null : 'x', collectedAt: now,
  sessionValidity: 'VALID', sessionPoolIndex: 0, evidenceRef: null, evidenceSha256: null,
  questionnaireFingerprint: e.kinds.includes('BASELINE_OPEN') || e.kinds.includes('BASELINE_CLOSE') ? 'fp-clean' : `fp-${e.order}`, collectorVersion: 'cashify-matrix/1' });
const row = { ...baseRow(exps[0], 30000), evidenceRef: shot, evidenceSha256: sha256(fs.readFileSync(shot)) };
const sealed = sealAttempt(row, keys.publicKey, path.join(tmp, 'upload'));
assert.equal(fs.existsSync(shot), false, 'plaintext screenshot removed after sealing');
const cipher = fs.readFileSync(path.join(tmp, 'upload', sealed.cipherFile));
assert.equal(sha256(cipher), sealed.cipherSha256);
assert.equal(cipher.includes(Buffer.from('30000')), false);
assert.equal(cipher.includes(Buffer.from(device.model)), false);
const opened = openBundle(cipher, keys.privateKey);
assert.equal(opened.bundle.observation.finalPrice, 30000);
assert.equal(opened.screenshot!.toString(), 'fake-png-bytes');
const tampered = Buffer.from(cipher); tampered[tampered.length - 1] ^= 1;
assert.throws(() => openBundle(tampered, keys.privateKey));
assert.throws(() => sealAttempt(row, keys.privateKey, path.join(tmp, 'x')), /public SPKI/);
process.env.GITHUB_ACTIONS = 'true';
assert.throws(() => openBundle(cipher, keys.privateKey), /laptop-only/);
delete process.env.GITHUB_ACTIONS;
assert.match(publicKeyFingerprintOk(), /^[a-f0-9]{64}$/);
function publicKeyFingerprintOk() { loadPublicKey(); return JSON.parse(fs.readFileSync(path.join(root, 'scripts/pricing-research/hosted/research-public-key.json'), 'utf8')).fingerprintSha256; }
assert.equal(/PRIVATE/.test(fs.readFileSync(path.join(root, 'scripts/pricing-research/hosted/research-public.pem'), 'utf8')), false);

// --- zip reader (stored + deflate) ------------------------------------------------------------
function zipOf(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  Object.entries(files).forEach(([name, data], i) => {
    const method = i % 2 ? 8 : 0; const body = method ? zlib.deflateRawSync(data) : data; const n = Buffer.from(name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, body); central.push(ch, n); offset += 30 + n.length + body.length;
  });
  const cd = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
const unzipped = readZip(zipOf({ 'manifest.json': Buffer.from('{"a":1}'), [sealed.cipherFile]: cipher }));
assert.equal(unzipped.get('manifest.json')!.toString(), '{"a":1}');
assert.equal(sha256(unzipped.get(sealed.cipherFile)!), sealed.cipherSha256);
assert.throws(() => readZip(zipOf({ '../evil.fhc': Buffer.from('x') })), /unsafe/);

// --- hosted block gate: Claude's blockValidity plus runtime NOT_ASKED only ---------------------
const priced = (close = 30000) => exps.map((e, i) => baseRow(e, i === 0 ? 30000 : i === exps.length - 1 ? close : 30000 - 100 * i));
assert.equal(hostedBlockGate(device, exps, priced()).valid, true);
const drift = hostedBlockGate(device, exps, priced(30020));
assert.equal(drift.valid, false); assert.equal(drift.bracketWithinTolerance, false); assert.doesNotMatch(drift.reason!, /\d{3,}/);
const runtimeIdx = exps.findIndex((e) => e.changes.length && e.changes.every((c) => e.requiresRuntimeConfirmation.includes(c.factorId)));
const plainIdx = exps.findIndex((e, i) => i > 0 && e.changes.length && !e.requiresRuntimeConfirmation.length);
const withRuntime = priced(); withRuntime[runtimeIdx] = baseRow(exps[runtimeIdx], null, 'NOT_ASKED');
assert.equal(hostedBlockGate(device, exps, withRuntime).valid, true);
const withPlain = priced(); withPlain[plainIdx] = baseRow(exps[plainIdx], null, 'NOT_ASKED');
assert.equal(hostedBlockGate(device, exps, withPlain).valid, false);
assert.equal(hostedBlockGate(device, exps, priced().slice(0, -1)).valid, false);
const mixed = priced(); mixed[3] = { ...mixed[3], runId: 'other' };
assert.equal(hostedBlockGate(device, exps, mixed).valid, false);

// --- session secret: dedicated, recent, never the old secret ---------------------------------
const sessionDir = path.join(tmp, 'sessions');
const storageState = { cookies: [{ name: '_cs__user_auth__v1', value: 'v', domain: '.cashify.in', path: '/', expires: Date.now() / 1000 + 86400 }], origins: [] };
const wrap = (createdAt: string) => Buffer.from(JSON.stringify({ version: 1, createdAt, storageState })).toString('base64');
assert.throws(() => materializeHostedSession({ CASHIFY_SESSION_STATE: wrap(new Date().toISOString()) }, Date.now(), sessionDir), /not configured/);
assert.throws(() => materializeHostedSession({ CASHIFY_RESEARCH_SESSION: wrap(new Date(Date.now() - 8 * 86400000).toISOString()) }, Date.now(), sessionDir), /older than 7 days/);
assert.throws(() => materializeHostedSession({ CASHIFY_RESEARCH_SESSION: 'not-base64-json' }, Date.now(), sessionDir), /contents not logged/);
const name = materializeHostedSession({ CASHIFY_RESEARCH_SESSION: wrap(new Date().toISOString()) }, Date.now(), sessionDir);
assert.ok(fs.existsSync(path.join(sessionDir, name)));
assert.throws(() => materializeHostedSession({ CASHIFY_RESEARCH_SESSION: wrap(new Date().toISOString()) }, Date.now(), sessionDir), /unexpected session file/);

// --- public logs never carry prices ----------------------------------------------------------
assert.equal(scrub('final quotation rejected at ₹12,340 (Get Upto 28030)'), 'final quotation rejected at ₹# (Get Upto #)');

// --- workflow guard rails ----------------------------------------------------------------------
const wf = fs.readFileSync(path.join(root, '.github/workflows/cashify-research-campaign.yml'), 'utf8');
assert.doesNotMatch(wf, /secrets\.(DATABASE_URL|DIRECT_URL|CASHIFY_SESSION_STATE)/);
assert.doesNotMatch(wf, /schedule:/);
assert.match(wf, /refs\/heads\/codex\/cashify-matrix-integration/);
assert.match(wf, /retention-days: 90/);
assert.match(wf, /hosted-out\/upload\/\*\.fhc\n\s+hosted-out\/upload\/manifest\.json/);
const uploadStep = wf.slice(wf.indexOf('Upload encrypted evidence'), wf.indexOf('Read the artifact back'));
assert.doesNotMatch(uploadStep, /cashify-sessions|plaintext|sqlite|reservation|verification/);
assert.doesNotMatch(wf, /run:.*\$\{\{\s*inputs\./);
assert.match(wf, /research\/cashify-hosted-ledger/);
assert.doesNotMatch(wf, /git push[^\n]*\bmain\b/);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('hosted campaign tests passed');
