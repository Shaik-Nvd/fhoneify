import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPricingService } from '../../lib/pricing/pricingService';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { modelKey, storageKey, evaluateRunner, type RunnerCalibration } from '../../lib/pricing/cashifyRunnerModel/model';
import { fitCalibration } from './fit-cashify-runner-calibration';
import type { RunnerMeasurement } from './import-cashify-runner-data';

export function statistics(rows: { error: number; model: string; storage: string; caseId: string }[]) {
  const values = rows.map(r => Math.abs(r.error)).sort((a, b) => a - b);
  const n = rows.length;
  const percentile = (q: number) => values[Math.min(n - 1, Math.floor((n - 1) * q))] ?? null;
  return { count: n, mae: n ? values.reduce((a, b) => a + b, 0) / n : null, median: percentile(.5), p90: percentile(.9), p95: percentile(.95),
    signedBias: n ? rows.reduce((a, b) => a + b.error, 0) / n : null,
    within20: n ? values.filter(v => v <= 20).length / n : null,
    overquotes: rows.filter(r => r.error > 0).length, underquotes: rows.filter(r => r.error < 0).length,
    above20: values.filter(v => v > 20).length, above100: values.filter(v => v > 100).length,
    above300: values.filter(v => v > 300).length, above1000: values.filter(v => v > 1000).length,
    worstOverquote: [...rows].sort((a, b) => b.error - a.error)[0] ?? null,
    worstUnderquote: [...rows].sort((a, b) => a.error - b.error)[0] ?? null };
}

export async function validateRunner(brand: 'Nothing' | 'OnePlus', input: string, out: string) {
  const bytes = fs.readFileSync(input);
  const all: RunnerMeasurement[] = bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
  const rows = all.filter(m => m.status === 'quoted');
  const calibrationPath = `lib/pricing/cashifyRunnerModel/calibration.${brand.toLowerCase()}.json`;
  const calibration: RunnerCalibration = JSON.parse(fs.readFileSync(calibrationPath, 'utf8'));
  const now = new Date('2026-11-11T08:00:00Z');
  let active: RunnerMeasurement;
  const service = createPricingService({ repository: { async get(key) { return { deviceKey: key, brand: active.brand, model: active.model,
    storage: active.storage, currentPrice: active.reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: now.toISOString() } as any; },
    async listAll() { return []; }, async upsert() { throw new Error('read-only'); }, async appendHistory() { throw new Error('read-only'); }, async getHistory() { return []; } },
    signingSecret: 'runner-validation-local-only-secret-32', tokenTtlSeconds: 900, now: () => now, pricingMode: 'hybrid', snapshot: {}, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
    logger: { info() {}, warn() {}, error() {} } });
  const replay: any[] = [];
  const refused: any[] = [];
  let referenceStressChecks = 0;
  for (const m of rows) {
    active = m;
    const q = await service.quote({ brand, model: m.model, storage: m.storage, diagnostics: m.diagnostics });
    if (!q.ok) { refused.push({ model: m.model, storage: m.storage, caseId: m.caseId, code: q.code }); continue; }
    const eq = q.internal.cashifyConditionEquivalent;
    const rate = m.reference <= 20000 ? .08 : m.reference <= 50000 ? .06 : .04;
    if (q.fhoneifyPrice !== Math.round(eq + Math.min(m.reference * rate, 1000))) throw new Error('Service bonus mismatch');
    if (q.internal.payoutCeiling.equivalentBasis !== 'base' || !q.internal.runnerModel) throw new Error('Service silently bypassed runner');
    replay.push({ model: m.model, storage: m.storage, caseId: m.caseId, error: eq - m.base!, source: m.source,
      reference: m.reference, observed: m.base, predicted: eq, support: q.internal.runnerModel.support });
    for (const scale of [.5, .75, .9, 1.1, 1.25, 1.5]) {
      active = { ...m, reference: Math.round(m.reference * scale) };
      const moved = await service.quote({ brand, model: m.model, storage: m.storage, diagnostics: m.diagnostics });
      if (!moved.ok) throw new Error(`Reference stress refused: ${m.model} ${m.caseId} ${scale}`);
      const expected = evaluateRunner(calibration.profiles[modelKey(m.model)], active.reference, m.diagnostics, m.storage);
      if (moved.internal.cashifyConditionEquivalent !== expected.price || !Number.isInteger(moved.fhoneifyPrice)) throw new Error('Reference stress mismatch');
      referenceStressChecks++;
    }
  }
  const heldout: any[] = [];
  for (const [key, profile] of Object.entries(calibration.profiles)) {
    const ms = rows.filter(m => modelKey(m.model) === key);
    const storages = [...new Set(ms.map(m => m.storage))];
    if (storages.length < 2) continue;
    for (const storage of storages) {
      const training = ms.filter(m => m.storage !== storage);
      const fit = fitCalibration(training, brand, calibration).profiles[key];
      for (const m of ms.filter(m => m.storage === storage)) {
        const result = evaluateRunner(fit, m.reference, m.diagnostics, m.storage);
        heldout.push({ model: m.model, storage: m.storage, caseId: m.caseId, error: result.price - m.base!, source: m.source });
      }
    }
    void profile;
  }
  const lomo: any[] = [], lomoUnavailable: string[] = [];
  const cohort = (p: typeof calibration.profiles[string]) => `${p.hasAge}|${Math.round((p.rules['hardware:wifi']?.value ?? 0) * 100) / 100}`;
  for (const [key, profile] of Object.entries(calibration.profiles)) {
    const donor = Object.entries(calibration.profiles).find(([other, p]) => other !== key && cohort(p) === cohort(profile));
    if (!donor) { lomoUnavailable.push(profile.model); continue; }
    for (const m of rows.filter(m => modelKey(m.model) === key)) {
      const result = evaluateRunner(donor[1], m.reference, m.diagnostics, m.storage);
      lomo.push({ model: m.model, storage: m.storage, caseId: m.caseId, donor: donor[1].model, error: result.price - m.base!, source: m.source });
    }
  }
  const catalog: any[] = [], inferredPredictions: any[] = [];
  for (const device of SEED_DEVICES.filter(d => d.brand === brand)) {
    const key = modelKey(device.model);
    const profile = calibration.profiles[key];
    const ms = rows.filter(m => modelKey(m.model) === key && storageKey(m.storage) === storageKey(device.storage));
    if (!profile) { catalog.push({ model: device.model, storage: device.storage, priced: false, reason: 'no supplied model evidence; existing fallback retained' }); continue; }
    const inheritedModel = Object.values(profile.rules).find(r => r.inferredFrom)?.inferredFrom;
    const donorRows = inheritedModel ? rows.filter(m => modelKey(m.model) === modelKey(inheritedModel)) : [];
    const templates = new Map((donorRows.length ? donorRows : rows.filter(m => modelKey(m.model) === key)).map(m => [m.caseId, m]));
    const pending = all.filter(m => modelKey(m.model) === key && storageKey(m.storage) === storageKey(device.storage) && m.status === 'pending');
    const plannedIds = ms.length ? pending.map(m => m.caseId) : [...templates.keys()];
    for (const caseId of plannedIds) {
      const template = templates.get(caseId);
      if (!template) throw new Error(`No explicit inference template for ${device.model} ${caseId}`);
      // This is an engineering test at a synthetic reference, never a quote
      // observation or an independent accuracy comparison.
      active = { ...template, brand, model: device.model, storage: device.storage, reference: 25000 };
      const q = await service.quote({ brand, model: device.model, storage: device.storage, diagnostics: template.diagnostics });
      if (!q.ok || !q.internal.runnerModel) throw new Error('Inferred catalog route silently fell back');
      // An uncollected all-healthy control shares the measured baseline answer
      // shape. Its record is still unobserved even if its parameters are measured.
      if (q.internal.runnerModel.support !== 'inferred' && !caseId.startsWith('physical-control')) throw new Error(`Unobserved catalog case incorrectly promoted to measured: ${caseId}`);
      inferredPredictions.push({ model: device.model, storage: device.storage, caseId, syntheticReference: 25000,
        predictedBase: q.internal.cashifyConditionEquivalent, sourceModel: template.model, parameterSupport: q.internal.runnerModel.support, status: 'inferred-not-observed' });
    }
    if (!ms.length) { catalog.push({ model: device.model, storage: device.storage, priced: true, measured: false,
      casesThroughService: plannedIds.length, reason: 'unseen storage, inferred model rules at synthetic reference; no condition observations' }); continue; }
    catalog.push({ model: device.model, storage: device.storage, casesThroughService: ms.length, referenceStatus: device.referencePriceStatus ?? 'existing', priced: !refused.some(r => r.model === device.model && r.storage === device.storage) });
  }
  const summary = { brand, sourceSha256: createHash('sha256').update(bytes).digest('hex'), calibrationSha256: createHash('sha256').update(fs.readFileSync(calibrationPath)).digest('hex'),
    pricedInput: rows.length, pending: all.length - rows.length, replay: statistics(replay), refused,
    perModel: Object.fromEntries(Object.values(calibration.profiles).map(p => [p.model, statistics(replay.filter(m => m.model === p.model))])),
    leaveOneStorageOut: statistics(heldout), storageMisses: heldout.filter(r => Math.abs(r.error) > 20),
    leaveOneModelOut: statistics(lomo), lomoUnavailable, referenceStressChecks, catalog, inferredPredictions,
    gates: { replay: refused.length === 0 && (statistics(replay).within20 ?? 0) >= .99 && (statistics(replay).mae ?? Infinity) <= 10 && statistics(replay).above300 === 0,
      leaveOneStorageOut: (statistics(heldout).within20 ?? 0) >= (brand === 'Nothing' ? .97 : .95) },
    validationBasis: 'In-sample service replay is regression. Storage coefficients refitted on training-only rows with rule forms frozen from full-corpus structural discovery; not independent rule discovery. LOMO reuses another measured model within an empirically identified profile; report only.' };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  for (const [file, values] of [['replay', replay], ['heldout', heldout], ['lomo', lomo]] as const) fs.writeFileSync(path.join(out, `${file}.jsonl`), values.map(r => JSON.stringify(r)).join('\n') + '\n');
  return summary;
}
if (require.main === module) {
  const brand = process.argv[2] as 'Nothing' | 'OnePlus';
  if (!['Nothing', 'OnePlus'].includes(brand)) throw new Error('Usage: validate-cashify-runner.ts Nothing|OnePlus');
  const dir = `data/pricing-evidence/${brand === 'Nothing' ? 'nothing-2026-11-08' : 'oneplus-2026-11-09'}`;
  validateRunner(brand, `${dir}/measurements.jsonl`, `${dir}/validation`).then(s => {
    console.log(JSON.stringify({ brand, replay: s.replay, heldout: s.leaveOneStorageOut, gates: s.gates, refused: s.refused.length }));
    if (!Object.values(s.gates).every(Boolean)) process.exitCode = 1;
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
