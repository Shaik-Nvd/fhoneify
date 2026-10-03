import assert from 'node:assert/strict';
import fixture from '../pricing/fixtures/xiaomi-workbook-verified-development-2026-10-02.json';
import { calculateXiaomiWorkbookEvidenceCandidate, verifiedNotAskedCleanBaseline } from '../../lib/pricing/xiaomiWorkbookEvidenceCandidate';
import { createXiaomiWorkbookResearchQuoteService } from '../../lib/pricing/xiaomiWorkbookResearchQuoteService';
import type { WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import type { WorkbookRoute } from '../../lib/pricing/teamWorkbookCandidate';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { customerPayout } from '../../lib/pricing/payout';
import { applyCompetitorUplift, type DiagnosticsType } from '../../lib/pricingCalculator';

const at = new Date('2026-10-02T12:00:00Z');
const routes: WorkbookRouteEvidence[] = [];
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore();
const routeFor = (s: typeof fixture.specs[number]): WorkbookRoute => ({ semantics: {
  warrantyMode: s.modes.warranty === 'ASKED' ? 'ASKED' : 'NOT_ASKED',
  billMode: s.modes.validBill === 'ASKED' ? 'ASKED' : 'NOT_ASKED', ageMode: 'NOT_ASKED' },
  boxMode: 'ASKED', chargerMode: 'ASKED', sPenMode: 'NOT_ASKED', eSimMode: 'NOT_ASKED' });
function diagnostics(s: typeof fixture.specs[number], components: readonly string[]): DiagnosticsType {
  const d: DiagnosticsType = { calls: true, touch: true, originalScreen: true, warranty: s.modes.warranty === 'ASKED' ? false : null,
    validBill: s.modes.validBill === 'ASKED' ? true : null, mobileAge: null, eSim: null,
    box: true, charger: true, accessories: ['box', 'charger'], hardware: [], defects: [],
    screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
    bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null };
  for (const c of components) {
    if (c === 'screen_heavy' || c === 'glass_cracked') { d.defects.push('screen_scratch'); d.screenCondition = c === 'screen_heavy' ? 'More than 2 scratches on screen' : 'Screen cracked/ glass broken'; }
    if (c === 'body_heavy' || c === 'body_dents') { d.defects.push('body_scratch'); d.bodyScratches = c === 'body_heavy' ? 'More than 2 scratches' : 'No scratches'; d.bodyDents = c === 'body_dents' ? 'Major dent(s) or more than 2' : 'No dents'; }
    if (c === 'display_lines' || c === 'display_spots') { d.defects.push('screen_spot'); if (c === 'display_lines') d.screenLines = 'Visible line(s) on display'; else d.screenSpots = 'Large/ heavy visible spots on screen'; }
  }
  return d;
}
let checks = 0;
for (const s of fixture.specs) {
  const device = findCatalogDevice('Xiaomi', s.model, s.storage)!; assert(device);
  const sem = routeFor(s).semantics, k = deviceKey(device), t = s.calibratedAt;
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: s.validatedGetUpto, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: t, lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { ...sem, brand: 'Xiaomi', model: s.model, modelKey: questionnaireModelKey(device),
    status: 'OK', statusDetail: null, questionLabels: [], sourceUrl: null, variantsChecked: 1, parserVersion: 'verified-local-fixture', observedAt: t });
  routes.push({ brand: 'Xiaomi', model: s.model, storage: s.storage, ...routeFor(s), observedAt: t, evidenceSha256: s.source[0].screenshotSha256 });
  for (let i = 0; i < s.supportedProfiles.length; i++) {
    const src = s.source[i], d = diagnostics(s, s.supportedProfiles[i]);
    const p = calculateXiaomiWorkbookEvidenceCandidate({ model: s.model, storage: s.storage, reference: s.validatedGetUpto, diagnostics: d, route: routeFor(s), now: at });
    assert(p.supported); assert.equal(p.quote.cashifyConditionEquivalent, src.observed); assert.equal(p.quote.fhoneifyPrice, applyCompetitorUplift(src.reference, src.observed)); checks++;
    const control = calculateXiaomiWorkbookEvidenceCandidate({ model: s.model, storage: s.storage, reference: s.validatedGetUpto, diagnostics: d, route: routeFor(s), now: at,
      baseline: { kind: 'measured_clean_control', cleanSellingPrice: s.source[0].observed } });
    assert(control.supported); assert.equal(control.quote.cashifyConditionEquivalent, src.observed); assert.equal(control.baselineKind, 'measured_clean_control'); checks++;
  }
}
const s = fixture.specs[0], clean = diagnostics(s, []), r = routeFor(s);
const calculate = (d = clean, changes: object = {}) => calculateXiaomiWorkbookEvidenceCandidate({ model: s.model, storage: s.storage, reference: s.validatedGetUpto, diagnostics: d, route: r, now: at, ...changes });
for (const d of [ { ...clean, warranty: false }, { ...clean, validBill: true }, { ...clean, mobileAge: 'above11' }, { ...clean, eSim: 'Single eSIM' },
  { ...clean, charger: false }, { ...clean, box: false }, { ...clean, accessories: ['box'] }, { ...clean, calls: false },
  { ...clean, originalScreen: false }, { ...clean, hardware: ['charging'] }, { ...clean, defects: ['body_scratch'] },
  { ...clean, bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2' }, { ...clean, bodyBent: 'Bent/ curved panel' } ]) {
  assert(!calculate(d).supported); checks++;
}
for (const changes of [ { model: 'Xiaomi 17' }, { storage: '8 GB/128 GB' }, { reference: 0 }, { reference: NaN },
  { now: new Date('2026-10-02T10:00:00Z') }, { now: new Date('2026-10-20T12:00:00Z') },
  { route: { ...r, semantics: { ...r.semantics, ageMode: 'UNKNOWN' } } } ]) { assert(!calculate(clean, changes).supported); checks++; }
assert.equal(verifiedNotAskedCleanBaseline(2520, r), 2500); checks++;
assert.equal(verifiedNotAskedCleanBaseline(2520, routeFor(fixture.specs[1])), null); checks++;
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(v) { records.set(v.deviceKey, v); }, async appendHistory() {}, async getHistory() { return []; } };
const service = createPricingService({ repository, questionnaireStore: profiles, now: () => at,
  signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const disabled = createXiaomiWorkbookResearchQuoteService(service);
const preview = createXiaomiWorkbookResearchQuoteService(service, { enabled: true, now: () => at, routeEvidence: routes });
async function main() {
  for (const spec of fixture.specs) for (let i = 0; i < spec.supportedProfiles.length; i++) {
    const input = { brand: 'Xiaomi', model: spec.model, storage: spec.storage, diagnostics: diagnostics(spec, spec.supportedProfiles[i]) };
    const p = await preview.quote(input); assert(p.ok && 'researchOnly' in p);
    assert.equal(p.cashifyConditionEquivalent, spec.source[i].observed); assert.equal('quoteToken' in p, false);
    assert.deepEqual(p.customerPayout, customerPayout(p.fhoneifyPrice, false)); checks++;
  }
  const input = { brand: 'Xiaomi', model: s.model, storage: s.storage, diagnostics: clean };
  assert.deepEqual(await disabled.quote(input), await service.quote(input)); checks++;
  assert.equal('verifyLeadPrice' in preview, false); checks++;
  for (const changes of [ { observedAt: '2026-08-01T00:00:00Z' }, { observedAt: '2026-10-03T00:00:00Z' },
    { evidenceSha256: 'missing' }, { storage: '8 GB/128 GB' }, { chargerMode: 'NOT_ASKED' as const }, { eSimMode: 'UNKNOWN' as never } ]) {
    const p = await createXiaomiWorkbookResearchQuoteService(service, { enabled: true, now: () => at,
      routeEvidence: routes.map(v => ({ ...v, ...changes })) }).quote(input); assert(!p.ok); checks++;
  }
  const k = deviceKey({ ...input }), saved = records.get(k)!;
  for (const changes of [ { currentPrice: saved.currentPrice! + 10 }, { source: 'legacy_migration' },
    { lastVerifiedAt: '2026-08-01T00:00:00Z' }, { lastVerifiedAt: '2026-10-03T00:00:00Z' } ]) {
    records.set(k, { ...saved, ...changes }); assert(!(await preview.quote(input)).ok); checks++;
  }
  records.set(k, saved); profiles.profiles.delete(questionnaireModelKey(saved)); assert(!(await preview.quote(input)).ok); checks++;
  const samsung = { brand: 'Samsung', model: 'Samsung Galaxy S24 5G', storage: '8 GB/256 GB', diagnostics: { ...clean, warranty: false, validBill: true } };
  assert.deepEqual(await disabled.quote(samsung), await service.quote(samsung)); checks++;
  console.log(`PASS fresh Xiaomi workbook ${checks} assertions; fresh verified calibration, strict regime, exact profiles and disabled service preview`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
