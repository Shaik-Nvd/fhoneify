import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/xiaomi-note-additive-2026-10-01.json';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { createXiaomiResearchQuoteService, type XiaomiResearchRouteEvidence } from '../../lib/pricing/xiaomiResearchQuoteService';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { customerPayout } from '../../lib/pricing/payout';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';

const at = new Date('2026-10-01T18:00:00Z');
const sem = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as const;
const records = new Map<string, ReferencePriceRecord>();
const repository: PricingServiceDeps['repository'] = {
  async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; },
};
const profiles = new InMemoryQuestionnaireProfileStore();
const routes: XiaomiResearchRouteEvidence[] = [];
for (const [model, storage, reference] of [
  ['Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', 29250],
  ['Xiaomi 17', '12 GB/512 GB', 57750], ['Xiaomi Redmi Turbo 5', '12 GB/256 GB', 26750],
] as const) {
  const device = findCatalogDevice('Xiaomi', model, storage)!; assert(device);
  const t = '2026-10-01T17:30:00Z', k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: reference, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: t, lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { ...sem, brand: device.brand, model, modelKey: questionnaireModelKey(device),
    questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'local-fixture', observedAt: t });
  routes.push({ model, storage, semantics: sem, eSimMode: 'NOT_ASKED', observedAt: '2026-10-01T17:39:32.261Z', evidenceSha256: fixture.observationsSha256 });
}
const service = createPricingService({ repository, questionnaireStore: profiles, now: () => at,
  signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const disabled = createXiaomiResearchQuoteService(service);
const preview = createXiaomiResearchQuoteService(service, { enabled: true, now: () => at, routeEvidence: routes });
let checks = 0;
async function main() {
  const severe = fixture.cases.find(r => r.id === 'N-SIX')!;
  const request = (r: typeof severe) => ({ brand: 'Xiaomi', model: r.model, storage: r.storage, diagnostics: r.diagnostics });
  assert.deepEqual(await disabled.quote(request(severe)), await service.quote(request(severe))); checks++;
  const original = await disabled.quote(request(severe)); assert(original.ok && 'quoteToken' in original);
  assert.equal(original.internal.cashifyConditionEquivalent, 16630); checks++;
  assert(!('verifyLeadPrice' in preview)); checks++;
  for (const r of fixture.cases.filter(r => r.model === severe.model)) {
    const p = await preview.quote(request(r)); assert(p.ok && 'researchOnly' in p);
    assert.equal(p.cashifyConditionEquivalent, r.cashify);
    assert.equal(p.fhoneifyPrice, applyCompetitorUplift(r.reference, r.cashify));
    assert.deepEqual(p.customerPayout, customerPayout(p.fhoneifyPrice, false));
    assert.equal(p.startingPrice, (await service.getUpto(request(r)) as {startingPrice: number}).startingPrice);
    assert.equal('quoteToken' in p, false); assert.equal(p.baselineKind, 'get_upto_calibrated_retention'); checks++;
  }
  for (const [model, storage, expected] of [['Xiaomi 17', '12 GB/512 GB', 32220], ['Xiaomi Redmi Turbo 5', '12 GB/256 GB', 14640]] as const) {
    const p = await preview.quote({ brand: 'Xiaomi', model, storage, diagnostics: { ...severe.diagnostics, hardware: ['charging'], originalScreen: false } });
    assert(p.ok && 'researchOnly' in p); assert.equal(p.cashifyConditionEquivalent, expected); checks++;
  }
  for (const d of [{ ...severe.diagnostics, hardware: ['wifi', 'fingerprint'] }, { ...severe.diagnostics, originalScreen: false },
    { ...severe.diagnostics, hardware: ['battery_service'] }, { ...severe.diagnostics, warranty: true }]) {
    const p = await preview.quote({ ...request(severe), diagnostics: d }); assert(!p.ok && p.code === 'RESEARCH_CANDIDATE_UNSUPPORTED'); checks++;
  }
  const noRoutes = await createXiaomiResearchQuoteService(service, { enabled: true, now: () => at }).quote(request(severe));
  assert(!noRoutes.ok && noRoutes.code === 'RESEARCH_CANDIDATE_UNSUPPORTED'); checks++;
  for (const changes of [{ observedAt: '2026-08-01T00:00:00Z' }, { evidenceSha256: 'invalid' }, { storage: '8 GB/256 GB' },
    { semantics: { ...sem, ageMode: 'UNKNOWN' as const } }, { eSimMode: 'UNKNOWN' as const }]) {
    const p = await createXiaomiResearchQuoteService(service, { enabled: true, now: () => at,
      routeEvidence: routes.map(r => ({ ...r, ...changes })) }).quote(request(severe));
    assert(!p.ok && p.code === 'RESEARCH_CANDIDATE_UNSUPPORTED'); checks++;
  }
  const key = deviceKey({ brand: 'Xiaomi', model: severe.model, storage: severe.storage }), saved = records.get(key)!;
  for (const changes of [{ currentPrice: 28500 }, { lastVerifiedAt: '2026-08-01T00:00:00Z' }, { source: 'legacy_migration' }]) {
    records.set(key, { ...saved, ...changes }); const p = await preview.quote(request(severe));
    assert(!p.ok && p.code === 'RESEARCH_CANDIDATE_UNSUPPORTED'); checks++;
  }
  records.set(key, saved);
  profiles.profiles.delete(questionnaireModelKey(saved));
  const fallback = await preview.quote(request(severe)); assert(!fallback.ok && fallback.code === 'RESEARCH_CANDIDATE_UNSUPPORTED'); checks++;
  const samsung = { brand: 'Samsung', model: 'Samsung Galaxy S24 5G', storage: '8 GB/256 GB', diagnostics: severe.diagnostics };
  const samsungActive = await service.quote(samsung); assert(samsungActive.ok);
  assert.deepEqual(await preview.quote(samsung), samsungActive); checks++;
  const unavailable = await preview.quote({ ...request(severe), storage: 'NONEXISTENT' });
  assert(!unavailable.ok && unavailable.code === 'DEVICE_NOT_FOUND'); checks++;
  console.log(`PASS local research quote-service integration: ${checks} assertions; defaults and cross-brand path unchanged; previews have no token`);
}
main().catch(err => { console.error(err); process.exitCode = 1; });
