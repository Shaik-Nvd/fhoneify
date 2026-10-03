import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/team-workbook-development-2026-10-02.json';
import cases from '../pricing/fixtures/team-workbook-development-cases-2026-10-02.json';
import ownerCorrection from '../pricing/fixtures/owner-correction-2026-10-02.json';
import { createTeamWorkbookResearchQuoteService, type WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { customerPayout } from '../../lib/pricing/payout';

const at = new Date('2026-10-02T12:00:00Z'), t = '2026-10-02T11:00:00Z';
const sem = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'ASKED' } as const;
const records = new Map<string, ReferencePriceRecord>();
const profiles = new InMemoryQuestionnaireProfileStore();
const routes: WorkbookRouteEvidence[] = [];
for (const s of fixture.specs) {
  const device = findCatalogDevice(s.brand, s.model, s.storage) ?? findCatalogDevice(s.brand, s.model, s.storage.replace(/\s+/g, ''));
  assert(device, s.deviceId); const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: s.validatedGetUpto, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: t, lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { ...sem, brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device),
    questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'local-fixture', observedAt: t });
  routes.push({ ...device, semantics: sem, boxMode: 'ASKED', chargerMode: 'ASKED', sPenMode: 'NOT_ASKED', eSimMode: 'NOT_ASKED',
    observedAt: t, evidenceSha256: s.sourceSha256 });
}
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; },
  async listAll() { return [...records.values()]; }, async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; } };
const service = createPricingService({ repository, questionnaireStore: profiles, now: () => at,
  signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const disabled = createTeamWorkbookResearchQuoteService(service);
const strict = createTeamWorkbookResearchQuoteService(service, { enabled: true, now: () => at, routeEvidence: routes });
const preview = createTeamWorkbookResearchQuoteService(service, { enabled: true, now: () => at, routeEvidence: routes, allowUnverifiedDevelopmentCalibration: true });
let checks = 0;
const request = (r: typeof cases[number]) => ({ brand: r.brand, model: r.model,
  storage: findCatalogDevice(r.brand, r.model, r.storage)?.storage ?? r.storage.replace(/\s+/g, ''), diagnostics: r.diagnostics });
const uncertain = new Set(ownerCorrection.devices.filter(d => d.verdict === 'UNCERTAIN').map(d => d.deviceId));
let quarantined = 0;
async function main() {
  for (const r of cases) {
    const p = await preview.quote(request(r));
    if (r.caseId.startsWith('FM003')) {
      assert(!p.ok && 'reasonCode' in p && p.reasonCode === 'REFERENCE_BASELINE_INCONSISTENT'); checks++; continue;
    }
    if (uncertain.has(r.caseId.slice(0, 5))) {
      assert(!p.ok && 'reasonCode' in p && p.reasonCode === 'OWNER_CORRECTION_UNMATCHED_WARRANTY', r.caseId); checks++; quarantined++; continue;
    }
    assert(p.ok && 'provisional' in p && p.provisional && p.researchOnly, r.caseId);
    assert.equal(p.cashifyConditionEquivalent, r.observed); assert.equal('quoteToken' in p, false);
    assert.equal(p.calibrationObservedAt, null); assert.equal(p.evidenceQuality, 'TESTER_REPORTED_UNVERIFIED');
    assert.deepEqual(p.customerPayout, customerPayout(p.fhoneifyPrice, false)); checks++;
  }
  assert.equal(quarantined, 27); checks++; // FM006/008/011/012/015/018/019/020/022, A/B/C each
  const row = cases[0], input = request(row);
  const strictResult = await strict.quote(input); assert(!strictResult.ok && 'reasonCode' in strictResult && strictResult.reasonCode === 'CALIBRATION_UNVERIFIED'); checks++;
  assert.deepEqual(await disabled.quote(input), await service.quote(input)); checks++;
  assert.equal('verifyLeadPrice' in preview, false); checks++;
  const noRoute = await createTeamWorkbookResearchQuoteService(service, { enabled: true }).quote(input);
  assert(!noRoute.ok && 'reasonCode' in noRoute && noRoute.reasonCode === 'QUESTIONNAIRE_NOT_VERIFIED'); checks++;
  for (const changes of [ { observedAt: '2026-08-01T00:00:00Z' }, { observedAt: '2026-10-03T00:00:00Z' },
    { evidenceSha256: 'invalid' }, { storage: '256 GB' }, { chargerMode: 'NOT_ASKED' as const },
    { semantics: { ...sem, ageMode: 'UNKNOWN' as const } }, { eSimMode: 'UNKNOWN' as never } ]) {
    const r = routes.map(v => ({ ...v, ...changes }));
    const p = await createTeamWorkbookResearchQuoteService(service, { enabled: true, now: () => at, routeEvidence: r,
      allowUnverifiedDevelopmentCalibration: true }).quote(input);
    assert(!p.ok && 'reasonCode' in p); checks++;
  }
  const k = deviceKey({ brand: row.brand, model: row.model, storage: input.storage }), saved = records.get(k)!;
  for (const changes of [ { currentPrice: saved.currentPrice! + 10 }, { source: 'legacy_migration' },
    { lastVerifiedAt: '2026-08-01T00:00:00Z' }, { lastVerifiedAt: '2026-10-03T00:00:00Z' } ]) {
    records.set(k, { ...saved, ...changes }); const p = await preview.quote(input);
    assert(!p.ok && 'reasonCode' in p); checks++;
  }
  records.set(k, saved); profiles.profiles.delete(questionnaireModelKey(saved));
  const fallback = await preview.quote(input); assert(!fallback.ok && 'reasonCode' in fallback && fallback.reasonCode === 'QUESTIONNAIRE_NOT_VERIFIED'); checks++;
  const oneplus = { brand: 'OnePlus', model: 'OnePlus 12', storage: '12 GB/256 GB', diagnostics: row.diagnostics };
  assert.deepEqual(await preview.quote(oneplus), await service.quote(oneplus)); checks++;
  const xi = { brand: 'Xiaomi', model: 'Xiaomi 17', storage: '12 GB/512 GB', diagnostics: row.diagnostics };
  assert.deepEqual(await disabled.quote(xi), await service.quote(xi)); checks++;
  const unavailable = await preview.quote({ ...input, storage: 'NONEXISTENT' }); assert(!unavailable.ok && unavailable.code === 'DEVICE_NOT_FOUND'); checks++;
  console.log(`PASS workbook service ${checks} assertions; strict readiness refuses undated calibration; explicit provisional preview has no tokens`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
