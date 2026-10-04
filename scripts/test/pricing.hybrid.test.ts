/** Same deployed calculators, one in-memory reference/profile lookup per quote.
 * Regression for the inspection-only outage and price-lock transitions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPricingService, HYBRID_PRICING_VERSION, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';
import { customerPayout } from '../../lib/pricing/payout';

const at = new Date('2026-10-04T09:00:00Z'), timestamp = '2026-10-03T11:00:00Z';
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore();
let referenceReads = 0;
function add(brand: string, model: string, storage: string, price: number, asked = false) {
  const device = findCatalogDevice(brand, model, storage); assert(device, model);
  const key = deviceKey(device);
  records.set(key, { ...device, deviceKey: key, source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: timestamp,
    lastAttemptedAt: timestamp, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: timestamp, updatedAt: timestamp });
  profiles.profiles.set(questionnaireModelKey(device), { brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device),
    warrantyMode: asked ? 'ASKED' : 'NOT_ASKED', billMode: asked ? 'ASKED' : 'NOT_ASKED', ageMode: 'NOT_ASKED',
    questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'fixture', observedAt: timestamp });
  return device;
}
const nord = add('OnePlus', 'OnePlus Nord', '8 GB/128 GB', 8340);
const eightPro = add('OnePlus', 'OnePlus 8 Pro', '8 GB/128 GB', 11520);
const iphone17Pro = add('Apple', 'Apple iPhone 17 Pro', '1TB', 85000, true);
const a72 = add('Samsung', 'Samsung Galaxy A72', '8 GB/128 GB', 6330);
const ultra = add('Xiaomi', 'Xiaomi 14 Ultra', '16 GB/512 GB', 37980);
const note = add('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', 29250, true);
const routes = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-02.json');
const repository: PricingServiceDeps['repository'] = { async get(k) { referenceReads++; return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert() { throw new Error('Database writes forbidden'); }, async appendHistory() { throw new Error('Database writes forbidden'); }, async getHistory() { return []; } };
const make = (pricingMode: PricingServiceDeps['pricingMode'], overrides: Partial<PricingServiceDeps> = {}) => createPricingService({ repository, questionnaireStore: profiles,
  signingSecret: 'hybrid-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900, strictReferenceMode: true,
  referenceLookupTimeoutMs: 100, snapshot: {}, now: () => at, pricingMode, releaseRouteEvidence: routes,
  logger: { info() {}, warn() {}, error() {} }, ...overrides });
const clean = { calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger'], warranty: null, validBill: null, mobileAge: null, eSim: null };
const asked = { ...clean, warranty: false, validBill: true };
const display = { ...clean, defects: ['screen_spot'], screenLines: 'Visible line(s) on display' };
const input = (device: typeof nord, diagnostics: object = clean) => ({ brand: device.brand, model: device.model, storage: device.storage, diagnostics });
const hybrid = make('hybrid'), legacy = make('legacy'), strict = make('release-candidate');
let checks = 0;
async function check(name: string, fn: () => Promise<void> | void) { await fn(); checks++; console.log(`PASS ${name}`); }
async function sameAsLegacy(device: typeof nord, diagnostics: object, service = hybrid) {
  const expected = await legacy.quote(input(device, diagnostics)), actual = await service.quote(input(device, diagnostics));
  assert(expected.ok && actual.ok, device.model);
  assert.equal(actual.fhoneifyPrice, expected.fhoneifyPrice); assert.equal(actual.internal.cashifyConditionEquivalent, expected.internal.cashifyConditionEquivalent);
  assert.equal(actual.internal.accessoryBasis, expected.internal.accessoryBasis);
  for (const field of ['warrantyMode', 'billMode', 'ageMode', 'boxMode', 'chargerMode', 'sPenMode', 'eSimMode'] as const)
    assert.equal((actual.questionnaire as any)[field], (expected.questionnaire as any)[field], field);
  assert.equal(actual.pricingVersion, `${HYBRID_PRICING_VERSION}+legacy-fallback`);
  assert.equal(actual.internal.releaseCandidate?.kind, 'LEGACY');
}
async function main() {
  await check('verified clean/display/accessory prices overlay legacy with one uplift and unchanged fee', async () => {
    for (const [device, diagnostics] of [[nord, clean], [nord, display], [eightPro, clean]] as const) {
      const expected = await strict.quote(input(device, diagnostics)); const result = await hybrid.quote(input(device, diagnostics)); assert(expected.ok && result.ok);
      assert.equal(result.fhoneifyPrice, expected.fhoneifyPrice); assert.equal(result.pricingVersion, `${HYBRID_PRICING_VERSION}+verified`);
    }
    const n = await hybrid.quote(input(nord)); assert(n.ok); assert.equal(n.fhoneifyPrice, 8986); assert.equal(customerPayout(n.fhoneifyPrice, false).payout, 8887);
    const d = await hybrid.quote(input(nord, display)); assert(d.ok); assert.equal(d.fhoneifyPrice, 3931);
  });
  await check('uncovered launch device retains legacy quote; no broad allowlist outage', async () => {
    await sameAsLegacy(iphone17Pro, asked); await sameAsLegacy(a72, clean);
  });
  await check('missing or expired evidence disables corrections while keeping ordinary quotes', async () => {
    for (const service of [make('hybrid', { releaseRouteEvidence: [] }), make('hybrid', { now: () => new Date('2026-10-17T09:00:00Z') })])
      for (const device of [nord, eightPro, a72]) await sameAsLegacy(device, clean, service);
  });
  await check('moved reference keeps supported clean offset; damaged route falls back without extrapolation', async () => {
    const key = deviceKey(nord), original = records.get(key)!;
    try { records.set(key, { ...original, currentPrice: 8260 });
      const n = await hybrid.quote(input(nord)); assert(n.ok); assert.equal(n.internal.cashifyConditionEquivalent, 8240);
      await sameAsLegacy(nord, display);
    } finally { records.set(key, original); }
  });
  await check('stale or failed profiles preserve the legacy regime and price', async () => {
    const key = questionnaireModelKey(nord), original = profiles.profiles.get(key)!;
    try { for (const patch of [{ observedAt: '2026-08-01T00:00:00Z' }, { status: 'FETCH_FAILED' as const }]) {
      profiles.profiles.set(key, { ...original, ...patch }); await sameAsLegacy(nord, display);
    } } finally { profiles.profiles.set(key, original); }
  });
  await check('unsupported recognized touch/body/combined/missing-accessory profiles retain legacy quotes', async () => {
    for (const d of [{ ...clean, touch: false }, { ...display, hardware: ['charging'] },
      { ...clean, defects: ['body_scratch'], bodyScratches: '1-2 scratches' }, { ...clean, accessories: [] }]) await sameAsLegacy(nord, d);
  });
  await check('recognized nonworking-call answers retain the existing dead-phone quote', async () => {
    await sameAsLegacy(nord, { ...clean, calls: false });
    await sameAsLegacy(a72, { ...clean, calls: false });
    for (const d of [{ ...clean, calls: null }, { ...clean, calls: false, hardware: ['invented'] }]) {
      const r = await hybrid.quote(input(nord, d)); assert(!r.ok); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED');
    }
  });
  await check('unknown and conflicting answers never receive a fallback token', async () => {
    for (const patch of [{ hardware: ['invented'] }, { box: false }, { charger: false }, { mobileAge: 'invented age' },
      { defects: ['screen_scratch'] }, { hardware: ['battery_service', 'battery_health'] }]) {
      const result = await hybrid.quote(input(nord, { ...clean, ...patch })); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED'); assert(!('quoteToken' in result));
    }
  });
  await check('contradictory bill answers cannot sign quotes or reuse an old legacy token', async () => {
    const contradictory = { ...asked, warranty: true, mobileAge: 'below3', accessories: ['box', 'bill'], validBill: false };
    const old = await legacy.quote(input(iphone17Pro, contradictory)); assert(old.ok, 'legacy fixture reproduces the unchecked conflict');
    const quote = await hybrid.quote(input(iphone17Pro, contradictory)); assert(!quote.ok);
    assert.equal(quote.code, 'MANUAL_INSPECTION_REQUIRED'); assert(!('quoteToken' in quote));
    const lead = await hybrid.verifyLeadPrice({ ...input(iphone17Pro, contradictory), quoteToken: old.quoteToken });
    assert(!lead.ok); assert.equal(lead.code, 'MANUAL_INSPECTION_REQUIRED');
    const noBill = await hybrid.quote(input(iphone17Pro, { ...contradictory, accessories: ['box'] })); assert(noBill.ok, 'explicit consistent bill-No remains priceable');
    const yesBill = await hybrid.quote(input(iphone17Pro, { ...contradictory, validBill: true })); assert(yesBill.ok, 'explicit consistent bill-Yes remains priceable');
  });
  await check('production-style catalog fallback remains explicit and never labelled as a verified correction', async () => {
    const missing = findCatalogDevice('Huawei', 'Huawei Mate 20 Pro', '6 GB/128 GB'); assert(missing && missing.basePrice);
    const permissive = make('hybrid', { strictReferenceMode: false });
    const q = await permissive.quote(input(missing, asked)); assert(q.ok);
    assert.equal(q.referenceStatus, 'missing'); assert.equal(q.internal.baseSource, 'catalog_base_price');
    assert.equal(q.internal.releaseCandidate?.kind, 'LEGACY'); assert.equal(q.pricingVersion, `${HYBRID_PRICING_VERSION}+legacy-fallback`);
    const strict = await make('hybrid', { strictReferenceMode: true }).quote(input(missing, asked)); assert(!strict.ok); assert.equal(strict.code, 'REFERENCE_PRICE_UNAVAILABLE');
  });
  await check('known unsafe exact variants remain quarantined without blocking clean Note', async () => {
    for (const [device, d] of [[ultra, clean], [ultra, display], [note, { ...asked, hardware: ['wifi'] }],
      [note, { ...asked, hardware: ['charging', 'speaker', 'front_camera', 'back_camera', 'wifi', 'fingerprint'] }]] as const) {
      const result = await hybrid.quote(input(device, d)); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
      const old = await legacy.quote(input(device, d)); assert(old.ok);
      const lead = await hybrid.verifyLeadPrice({ ...input(device, d), quoteToken: old.quoteToken }); assert(!lead.ok); assert.equal(lead.code, 'MANUAL_INSPECTION_REQUIRED');
    }
    await sameAsLegacy(note, asked);
  });
  await check('missing references still refuse without a price or token', async () => {
    const missing = findCatalogDevice('Xiaomi', 'Xiaomi Redmi Note 11', '6 GB/128 GB'); assert(missing);
    const result = await hybrid.quote(input(missing, asked)); assert(!result.ok); assert.equal(result.code, 'REFERENCE_PRICE_UNAVAILABLE'); assert(!('quoteToken' in result));
  });
  await check('old legacy token recomputes to corrected hybrid quote; rollback recomputes hybrid token', async () => {
    const old = await legacy.quote(input(nord)); const current = await hybrid.quote(input(nord)); assert(old.ok && current.ok);
    const upgraded = await hybrid.verifyLeadPrice({ ...input(nord), quoteToken: old.quoteToken, clientQuotedPrice: old.fhoneifyPrice });
    assert(upgraded.ok); assert.equal(upgraded.price, current.fhoneifyPrice); assert.equal(upgraded.audit.tokenRejectedReason, 'pricing_version_changed');
    const rollback = await legacy.verifyLeadPrice({ ...input(nord), quoteToken: current.quoteToken });
    assert(rollback.ok); assert.equal(rollback.price, old.fhoneifyPrice); assert.equal(rollback.audit.tokenRejectedReason, 'pricing_version_changed');
  });
  await check('correction becoming ineligible invalidates its old token before fallback lead', async () => {
    const quote = await hybrid.quote(input(nord, display)); assert(quote.ok);
    const noEvidence = make('hybrid', { releaseRouteEvidence: [] }); const current = await noEvidence.quote(input(nord, display)); assert(current.ok);
    const lead = await noEvidence.verifyLeadPrice({ ...input(nord, display), quoteToken: quote.quoteToken });
    assert(lead.ok); assert.equal(lead.price, current.fhoneifyPrice); assert.equal(lead.audit.tokenRejectedReason, 'pricing_version_changed');
  });
  await check('matching hybrid tokens lock their selected price; tampered/expired tokens recompute', async () => {
    const quote = await hybrid.quote(input(nord)); assert(quote.ok);
    const locked = await hybrid.verifyLeadPrice({ ...input(nord), quoteToken: quote.quoteToken, clientQuotedPrice: 1 });
    assert(locked.ok); assert.equal(locked.price, quote.fhoneifyPrice); assert.equal(locked.audit.priceSource, 'quote_token'); assert(locked.audit.clientPriceMismatch);
    for (const [service, token] of [[hybrid, `${quote.quoteToken}x`], [make('hybrid', { now: () => new Date(at.getTime() + 901000) }), quote.quoteToken]] as const) {
      const lead = await service.verifyLeadPrice({ ...input(nord), quoteToken: token }); assert(lead.ok); assert.equal(lead.audit.priceSource, 'recomputed');
    }
  });
  await check('one reference read per hybrid quote, including correction misses', async () => {
    for (const device of [nord, a72]) { const before = referenceReads; await hybrid.quote(input(device)); assert.equal(referenceReads - before, 1); }
  });
  await check('catalog-wide ordinary pricing survives empty evidence across clean, body and nonworking answers', async () => {
    // Synthetic references test availability/parity only, never Cashify accuracy.
    const validCatalog = SEED_DEVICES.filter(d => typeof d.brand === 'string' && typeof d.model === 'string' && typeof d.storage === 'string');
    const catalogIndex = new Map(validCatalog.map(d => [deviceKey(d), d]));
    const catalogRepository: PricingServiceDeps['repository'] = { ...repository, async get(key) {
      const d = catalogIndex.get(key); assert(d);
      return { ...d, deviceKey: key, currentPrice: 20000, source: 'cashify', matchConfidence: 'exact', status: 'fresh',
        lastVerifiedAt: timestamp, lastAttemptedAt: timestamp, lastFailureAt: null, lastFailureError: null,
        consecutiveFailures: 0, createdAt: timestamp, updatedAt: timestamp };
    } };
    const options = { repository: catalogRepository, questionnaireStore: undefined, releaseRouteEvidence: [] };
    const ordinary = make('legacy', options), combined = make('hybrid', options);
    let priced = 0, quarantined = 0;
    for (const device of validCatalog) {
      for (const diagnostics of [asked, { ...asked, defects: ['body_scratch'], bodyScratches: 'More than 2 scratches' }, { ...asked, calls: false }]) {
        const expected = await ordinary.quote(input(device, diagnostics)); assert(expected.ok);
        const actual = await combined.quote(input(device, diagnostics));
        if (device.brand === 'Xiaomi' && device.model === 'Xiaomi 14 Ultra' && device.storage === '16 GB/512 GB') {
          assert(!actual.ok); assert.equal(actual.code, 'MANUAL_INSPECTION_REQUIRED'); quarantined++;
        } else { assert(actual.ok, `${device.model} ${device.storage}`); assert.equal(actual.fhoneifyPrice, expected.fhoneifyPrice); priced++; }
      }
    }
    console.log(`Catalog parity: ${priced} unchanged quotes, ${quarantined} explicit unsafe-profile refusals (synthetic references).`);
  });
  await check('explicit hybrid config and emergency off switch resolve predictably', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fhoneify-hybrid-'));
    try { fs.mkdirSync(path.join(root, 'config')); fs.writeFileSync(path.join(root, 'config/pricing-release.json'), JSON.stringify({ releaseCandidate: false, mode: 'hybrid', routeEvidenceFile: 'routes.json' }));
      assert.equal(resolvePricingReleaseConfig({}, root).mode, 'hybrid');
      assert.equal(resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'off' }, root).mode, 'legacy');
      assert.equal(resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'hybrid' }, root).mode, 'hybrid');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  console.log(`Hybrid pricing: ${checks} groups passed; zero database writes or collection attempts.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
