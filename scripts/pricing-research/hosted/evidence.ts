/**
 * Per-attempt evidence bundles. On the runner every attempt (price, verbatim
 * questionnaire trace, cropped final-card screenshot) is sealed with the
 * owner's PUBLIC key before anything is uploaded; plaintext screenshots are
 * deleted. Opening a bundle needs the private key, which exists only on the
 * owner's laptop (artifact-crypto refuses private-key work inside Actions).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { MatrixObservation } from '../matrixStore';
import { assertPlannedExperiment } from '../plannedExperiment';
import type { PlannedDevice, PlannedExperiment } from '../../research-design/design';
import { blockValidity } from '../../research-design/analysis';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const envelope = require('../artifact-crypto.cjs') as {
  publicKey(pem: string): crypto.KeyObject;
  encrypt(bytes: Buffer, pem: string): Buffer;
  decrypt(bytes: Buffer, privatePem: string | Buffer): Buffer;
  digest(bytes: Buffer): string;
};
export const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

export function publicKeyFingerprint(pem: string): string {
  return sha256(envelope.publicKey(pem).export({ type: 'spki', format: 'der' }) as Buffer);
}

export interface EvidenceBundle {
  version: 1;
  observation: MatrixObservation;
  screenshotName: string | null;
  screenshotBase64: string | null;
}

export function safeFileId(experimentId: string): string {
  return `${experimentId.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 120)}-${sha256(Buffer.from(experimentId)).slice(0, 10)}`;
}

/** Encrypts one attempt; removes the plaintext screenshot. Returns the file name and ciphertext hash. */
export function sealAttempt(row: MatrixObservation, publicPem: string, outDir: string): { cipherFile: string; cipherSha256: string } {
  envelope.publicKey(publicPem); // reject private/weak keys before touching evidence
  let screenshot: Buffer | null = null;
  if (row.evidenceRef) {
    screenshot = fs.readFileSync(row.evidenceRef);
    if (sha256(screenshot) !== row.evidenceSha256) throw new Error('screenshot hash changed before sealing');
  }
  const bundle: EvidenceBundle = { version: 1,
    observation: { ...row, evidenceRef: row.evidenceRef ? path.basename(row.evidenceRef) : null },
    screenshotName: row.evidenceRef ? path.basename(row.evidenceRef) : null,
    screenshotBase64: screenshot ? screenshot.toString('base64') : null };
  const sealed = envelope.encrypt(Buffer.from(JSON.stringify(bundle)), publicPem);
  const cipherFile = `${safeFileId(row.experimentId)}.fhc`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, cipherFile), sealed, { flag: 'wx' });
  if (row.evidenceRef) fs.rmSync(row.evidenceRef, { force: true });
  return { cipherFile, cipherSha256: sha256(sealed) };
}

/** Laptop-only. Verifies the screenshot against the recorded hash after decryption. */
export function openBundle(sealed: Buffer, privatePem: string | Buffer): { bundle: EvidenceBundle; screenshot: Buffer | null } {
  const bundle = JSON.parse(envelope.decrypt(sealed, privatePem).toString('utf8')) as EvidenceBundle;
  if (bundle.version !== 1 || !bundle.observation?.experimentId) throw new Error('unrecognized evidence bundle');
  const screenshot = bundle.screenshotBase64 ? Buffer.from(bundle.screenshotBase64, 'base64') : null;
  if (bundle.observation.status === 'COMPLETED' && (!screenshot || sha256(screenshot) !== bundle.observation.evidenceSha256)) {
    throw new Error('decrypted screenshot does not match the recorded evidence hash');
  }
  return { bundle, screenshot };
}

/**
 * Hosted block gate (documented in docs/CASHIFY_HOSTED_CAMPAIGN.md). Claude's
 * blockValidity is applied unchanged to the baselines and every priced
 * member; the only non-priced member tolerated is a NOT_ASKED experiment whose
 * changed factors were all planned as runtime-confirmed (the question or
 * option genuinely does not exist for this model). Reasons never carry prices.
 */
export function hostedBlockGate(device: PlannedDevice, experiments: PlannedExperiment[], rows: MatrixObservation[]):
  { valid: boolean; reason: string | null; bracketWithinTolerance: boolean | null } {
  const byId = new Map(rows.map((r) => [r.experimentId, r]));
  if (rows.length !== experiments.length || experiments.some((e) => !byId.has(e.experimentId)) ||
    new Set(rows.map((r) => r.runId)).size !== 1) {
    return { valid: false, reason: 'block incomplete or mixes runs', bracketWithinTolerance: null };
  }
  const open = byId.get(experiments[0].experimentId)!;
  const close = byId.get(experiments[experiments.length - 1].experimentId)!;
  const bracketWithinTolerance = open.finalPrice != null && close.finalPrice != null
    ? Math.abs(open.finalPrice - close.finalPrice) <= 10 : null;
  const members: MatrixObservation[] = [];
  for (const e of experiments.slice(1, -1)) {
    assertPlannedExperiment(device, e);
    const row = byId.get(e.experimentId)!;
    if (row.status === 'COMPLETED') { members.push(row); continue; }
    const runtimeOnly = row.status === 'NOT_ASKED' && e.changes.length > 0 &&
      e.changes.every((c) => e.requiresRuntimeConfirmation.includes(c.factorId));
    if (!runtimeOnly) return { valid: false, reason: `member ${row.status}`, bracketWithinTolerance };
  }
  const verdict = blockValidity(open, close, members);
  if (verdict.valid) return { valid: true, reason: null, bracketWithinTolerance };
  const reason = verdict.reason.startsWith('baseline drifted') ? 'baseline drift above tolerance' :
    verdict.reason.startsWith('Get Upto changed') ? 'live Get Upto changed inside block' : verdict.reason;
  return { valid: false, reason: reason.replace(/\d{3,}/g, '#'), bracketWithinTolerance };
}

/** Minimal reader for GitHub artifact zips (stored/deflate entries); avoids extra dependencies. */
export function readZip(zip: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('artifact is not a zip archive');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const method = zip.readUInt16LE(p + 10);
    const compressed = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extra = zip.readUInt16LE(p + 30);
    const comment = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLength).toString('utf8');
    p += 46 + nameLength + extra + comment;
    if (name.endsWith('/')) continue;
    if (compressed === 0xffffffff || local === 0xffffffff) throw new Error('zip64 artifacts are not supported');
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(dataStart, dataStart + compressed);
    if (method !== 0 && method !== 8) throw new Error('unsupported zip compression');
    if (name.includes('..') || path.isAbsolute(name)) throw new Error('unsafe path in artifact');
    files.set(name, method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data));
  }
  return files;
}
