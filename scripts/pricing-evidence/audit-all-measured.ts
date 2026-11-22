/**
 * READ-ONLY cross-brand audit. Replays every primary Cashify measurement (all runner corpora under
 * data/pricing-evidence/<brand>-2026-11-*) through the production pricing service configuration
 * (hybrid mode, release route evidence, production questionnaire profiles read from the database).
 *
 *   node --import tsx scripts/pricing-evidence/audit-all-measured.ts <env file> <out dir>
 *
 * Two passes per row:
 *   test       – the reference Cashify showed on the test day (isolates code and questionnaire effects);
 *   production – today's stored ReferencePrice (what a customer is quoted now), compared with the
 *                measured price scaled by today's reference / test-day reference.
 * Database access is limited to reads (repository.get, questionnaire profile get). Outputs are private.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

const [envFile, outDir] = process.argv.slice(2);
if (!envFile || !outDir) throw new Error('Usage: audit-all-measured.ts <env file> <out dir>');
config({ path: envFile, quiet: true } as any);

(async () => {
  const { createPricingService } = await import('../../lib/pricing/pricingService');
  const { loadReleaseRouteEvidence } = await import('../../lib/pricing/releaseRouteEvidence');
  const { resolvePricingReleaseConfig } = await import('../../lib/pricing/releaseConfig');
  const { getQuestionnaireProfileStore, getReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
  const { SEED_DEVICES } = await import('../../lib/seed_devices');
  const { modelKey, storageKey } = await import('../../lib/pricing/cashifyRunnerModel/model');
  const { runnerStorageIdentity } = await import('../../lib/pricing/cashifyRunnerModel/identity');
  const { deviceKey } = await import('../../lib/referencePricing/types');

  const release = resolvePricingReleaseConfig();
  const routes = release.mode === 'legacy' ? [] : loadReleaseRouteEvidence(release.routeEvidenceFile ?? undefined);
  const prodRepo = getReferencePriceRepository();
  const prodProfiles = getQuestionnaireProfileStore();
  const profileCache = new Map<string, any>();
  const refCache = new Map<string, any>();
  const questionnaireStore = { async get(key: string) { if (!profileCache.has(key)) profileCache.set(key, await prodProfiles.get(key)); return profileCache.get(key); } } as any;
  let mode: 'test' | 'production' = 'test'; let testReference = 0;
  const at = new Date();
  const repository = { async get(key: string) {
    if (mode === 'test') return { deviceKey: key, currentPrice: testReference, source: 'cashify', status: 'fresh', lastVerifiedAt: at.toISOString() };
    if (!refCache.has(key)) refCache.set(key, await prodRepo.get(key));
    return refCache.get(key);
  } } as any;
  const service = createPricingService({ repository, questionnaireStore, pricingMode: release.mode, releaseRouteEvidence: routes,
    signingSecret: 'audit-only-local-signing-secret-32-chars', tokenTtlSeconds: 900, strictReferenceMode: false, referenceLookupTimeoutMs: 20000,
    logger: { info() {}, warn() {}, error() {} } } as any);

  const corpora = fs.readdirSync('data/pricing-evidence').filter(d => /-2026-11-\d\d$/.test(d) && fs.existsSync(`data/pricing-evidence/${d}/measurements.jsonl`));
  // One corpus per brand family: later reruns (nokia-11-17, oneplus-11-16, google-11-16) only add their own models.
  const catalog = new Map<string, any>();
  for (const d of SEED_DEVICES as any[]) if (d.brand) catalog.set(d.brand.toLowerCase() + '|' + modelKey(d.model) + '|' + runnerStorageIdentity(d.storage, d.ram), d);
  const rows: any[] = []; const seen = new Set<string>();
  for (const corpus of corpora.sort().reverse()) {
    for (const line of fs.readFileSync(`data/pricing-evidence/${corpus}/measurements.jsonl`, 'utf8').trim().split('\n')) {
      const r = JSON.parse(line);
      if (!(r.status === 'quoted' || r.status === 'no_offer')) continue;
      if (r.primary === false) continue;
      const k = r.model + '|' + r.storage + '|' + JSON.stringify(r.diagnostics);
      if (seen.has(k)) continue; seen.add(k);
      rows.push({ ...r, corpus });
    }
  }
  console.log('rows', rows.length, 'corpora', corpora.join(','));
  const out: any[] = [];
  let i = 0;
  for (const r of rows) {
    const brand = r.brand === 'Oppo' ? 'Oppo' : r.brand;
    const device = catalog.get(brand.toLowerCase() + '|' + modelKey(r.model) + '|' + storageKey(r.storage)) ?? catalog.get((brand === 'Oppo' ? 'oppo' : brand.toLowerCase()) + '|' + modelKey(r.model) + '|' + storageKey(r.storage));
    const rec: any = { corpus: r.corpus, brand: r.brand, model: r.model, storage: r.storage, caseId: r.caseId, label: r.label, status: r.status,
      testReference: r.reference, cashify: r.base, diagnostics: r.diagnostics };
    if (!device) { rec.error = 'NOT_IN_CATALOG'; out.push(rec); continue; }
    rec.catalogStorage = device.storage;
    for (const m of ['test', 'production'] as const) {
      mode = m; testReference = r.reference;
      try {
        const q: any = await service.quote({ brand: device.brand, model: device.model, storage: device.storage, diagnostics: r.diagnostics });
        rec[m] = q.ok ? { price: q.internal.cashifyConditionEquivalent, payout: q.fhoneifyPrice, runner: !!q.internal.runnerModel } : { code: q.code };
      } catch (e: any) { rec[m] = { code: 'THROW', message: e.message }; }
    }
    const prod = refCache.get(deviceKey({ brand: device.brand, model: device.model, storage: device.storage }));
    rec.productionReference = prod?.currentPrice ?? null; rec.productionStatus = prod?.status ?? null;
    out.push(rec);
    if (++i % 2000 === 0) console.log(i, '/', rows.length);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'audit-rows.jsonl'), out.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log('done', out.length);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
