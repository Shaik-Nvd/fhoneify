import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/fresh-glass-ab-development-2026-10-02.json';
import { calculateFreshGlassEvidenceCandidate } from '../../lib/pricing/freshGlassEvidenceCandidate';
import { createFreshGlassResearchQuoteService } from '../../lib/pricing/freshGlassResearchQuoteService';
import type { WorkbookRoute } from '../../lib/pricing/teamWorkbookCandidate';
import type { WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import { createXiaomiWorkbookResearchQuoteService } from '../../lib/pricing/xiaomiWorkbookResearchQuoteService';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { applyCompetitorUplift, type DiagnosticsType } from '../../lib/pricingCalculator';
import { customerPayout } from '../../lib/pricing/payout';

const now = new Date('2026-10-02T12:00:00Z');
const route: WorkbookRoute = { semantics: { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' },
  eSimMode: 'NOT_ASKED', boxMode: 'ASKED', chargerMode: 'NOT_ASKED', sPenMode: 'NOT_ASKED' };
const diagnostics = (condition: 'clean' | 'scratch' | 'glass' = 'clean'): DiagnosticsType => ({
  calls: true, touch: true, originalScreen: true, warranty: null, validBill: null, mobileAge: null, eSim: null,
  accessories: ['box'], box: true, defects: condition === 'clean' ? [] : ['screen_scratch'], hardware: [],
  screenCondition: condition === 'glass' ? 'Screen cracked/ glass broken' : condition === 'scratch' ? 'More than 2 scratches on screen' : null,
  screenSpots: null, screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null });
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore(), routes: WorkbookRouteEvidence[] = [];
let checks = 0;
const heldoutGlass = { FM004: 16730, FM017: 11790 }; // preserved independent conditional outcomes; never parameter inputs.
for (const spec of fixture.specs) {
  for (const condition of ['clean', 'scratch', 'glass'] as const) {
    const result = calculateFreshGlassEvidenceCandidate({ ...spec, reference: spec.validatedGetUpto, diagnostics: diagnostics(condition), route, now });
    assert(result.supported);
    const observed = condition === 'clean' ? spec.source[0].observed : condition === 'scratch' ? spec.source[1].observed : heldoutGlass[spec.deviceId as keyof typeof heldoutGlass];
    assert.equal(result.quote.cashifyConditionEquivalent, observed); assert.equal(result.quote.fhoneifyPrice, applyCompetitorUplift(spec.validatedGetUpto, observed));
    assert.equal(result.baselineKind, 'get_upto_calibrated_retention'); checks++;
  }
  const storage = findCatalogDevice(spec.brand, spec.model, spec.storage)?.storage ?? spec.storage.replace(/\s+/g, '');
  const device = findCatalogDevice(spec.brand, spec.model, storage)!; assert(device);
  const key = deviceKey(device), t = spec.calibratedAt;
  records.set(key, { ...device, deviceKey: key, source: 'cashify', currentPrice: spec.validatedGetUpto, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: t, lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { ...route.semantics, brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device),
    questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'verified-local-fixture', observedAt: t });
  routes.push({ ...device, ...route, observedAt: t, evidenceSha256: spec.source[0].screenshotSha256 });
}
const apple = fixture.specs[0];
const calculate = (d = diagnostics(), extra: object = {}) => calculateFreshGlassEvidenceCandidate({ ...apple, reference: apple.validatedGetUpto, diagnostics: d, route, now, ...extra });
for (const d of [ { ...diagnostics(), warranty: false }, { ...diagnostics(), validBill: true }, { ...diagnostics(), mobileAge: 'above11' },
  { ...diagnostics(), eSim: 'Single eSIM' }, { ...diagnostics(), box: false }, { ...diagnostics(), accessories: [] },
  { ...diagnostics(), charger: false }, { ...diagnostics(), charger: true }, { ...diagnostics(), accessories: ['box', 'charger'] },
  { ...diagnostics(), originalScreen: false }, { ...diagnostics(), touch: false }, { ...diagnostics(), calls: false },
  { ...diagnostics('glass'), hardware: ['charging'] }, { ...diagnostics('glass'), bodyScratches: 'More than 2 scratches' },
  { ...diagnostics('glass'), defects: ['screen_scratch', 'body_bent'] }, { ...diagnostics(), screenSpots: 'Large/ heavy visible spots on screen' },
  { ...diagnostics(), screenCondition: '1-2 scratches on screen' } ]) { assert(!calculate(d).supported); checks++; }
for (const extra of [ { storage: '512 GB' }, { model: 'Apple iPhone 14' }, { brand: 'Xiaomi' }, { reference: 0 }, { reference: NaN },
  { now: new Date('2026-10-01T12:00:00Z') }, { now: new Date('2026-10-20T12:00:00Z') }, { now: new Date(NaN) },
  { route: { ...route, semantics: { ...route.semantics, ageMode: 'UNKNOWN' } } }, { route: { ...route, chargerMode: 'ASKED' } } ]) { assert(!calculate(diagnostics(), extra).supported); checks++; }
const above = calculate(); assert(above.supported); assert.equal(above.quote.cashifyConditionEquivalent, 24760); assert(above.quote.cashifyConditionEquivalent > apple.validatedGetUpto && above.cleanMayExceedGetUpto); checks++;
assert(calculate(diagnostics('glass'), { storage: '256GB' }).supported); checks++;
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; } };
const service = createPricingService({ repository, questionnaireStore: profiles, now: () => now,
  signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const disabled = createFreshGlassResearchQuoteService(service);
const preview = createFreshGlassResearchQuoteService(service, { enabled: true, now: () => now, routeEvidence: routes });
async function main() {
  for (const spec of fixture.specs) for (const condition of ['clean', 'scratch', 'glass'] as const) {
    const storage = spec.brand === 'Apple' ? spec.storage.replace(/\s+/g, '') : spec.storage;
    const p = await preview.quote({ ...spec, storage, diagnostics: diagnostics(condition) }); assert(p.ok && 'researchOnly' in p && 'cleanMayExceedGetUpto' in p);
    assert.equal('quoteToken' in p, false); assert.equal(p.cleanMayExceedGetUpto, spec.brand === 'Apple');
    assert.deepEqual(p.customerPayout, customerPayout(p.fhoneifyPrice, false)); checks++;
  }
  const input = { brand: apple.brand, model: apple.model, storage: '256GB', diagnostics: diagnostics('glass') };
  assert.deepEqual(await disabled.quote(input), await service.quote(input)); checks++;
  assert.equal('verifyLeadPrice' in preview, false); checks++;
  const k = deviceKey(input), saved = records.get(k)!;
  for (const changes of [ { currentPrice: saved.currentPrice! + 10 }, { source: 'legacy_migration' },
    { lastVerifiedAt: '2026-08-01T00:00:00Z' }, { lastVerifiedAt: '2026-10-03T00:00:00Z' } ]) {
    records.set(k, { ...saved, ...changes }); assert(!(await preview.quote(input)).ok); checks++;
  }
  records.set(k, saved);
  for (const changes of [ { observedAt: '2026-08-01T00:00:00Z' }, { observedAt: '2026-10-03T00:00:00Z' }, { evidenceSha256: 'invalid' },
    { storage: '512 GB' }, { eSimMode: 'UNKNOWN' as never }, { semantics: { ...route.semantics, billMode: 'ASKED' as const } } ]) {
    const p = await createFreshGlassResearchQuoteService(service, { enabled: true, now: () => now, routeEvidence: routes.map(r => ({ ...r, ...changes })) }).quote(input); assert(!p.ok); checks++;
  }
  profiles.profiles.delete(questionnaireModelKey(saved)); assert(!(await preview.quote(input)).ok); checks++;
  const xi = { brand: 'Xiaomi', model: 'Xiaomi Mi A2', storage: '4 GB/64 GB', diagnostics: diagnostics() };
  assert.deepEqual(await preview.quote(xi), await createXiaomiWorkbookResearchQuoteService(service, { enabled: true }).quote(xi)); checks++;
  const oldXi = { ...xi, model: 'Xiaomi 17', storage: '12 GB/512 GB' }; assert.deepEqual(await disabled.quote(oldXi), await service.quote(oldXi)); checks++;
  const other = { brand: 'OnePlus', model: 'OnePlus 12', storage: '12 GB/256 GB', diagnostics: { ...diagnostics(), warranty: false, validBill: true } };
  assert.deepEqual(await preview.quote(other), await service.quote(other)); checks++;
  console.log(`PASS fresh glass candidate ${checks} assertions; A/B only coefficients, preserved conditional C reproductions, guarded disabled interface`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
