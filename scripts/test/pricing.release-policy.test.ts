/**
 * Launch policy (owner, 2026-10-03): in release mode only the verified
 * candidate / accessory-route scope issues binding prices; every other variant
 * and condition is inspected without a token. Legacy mode is unchanged, and
 * the release switch resolves env > committed config > legacy, failing safe.
 * In-memory repositories only; no database or network.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { PRICING_ENGINE_VERSION } from '../../lib/pricing/engine';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { resolvePricingReleaseConfig, PRICING_RELEASE_CONFIG_FILE } from '../../lib/pricing/releaseConfig';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { isReleaseEvidenceCurrent } from '../../lib/pricing/releaseEvidenceAge';
import { isQuestionnaireProfileCurrent } from '../../lib/referencePricing/questionnaire/policy';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';

const at = new Date('2026-10-03T12:00:00Z'), t = '2026-10-03T11:00:00Z';
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore();
function add(brand: string, model: string, storage: string, price: number, mode: 'ASKED' | 'NOT_ASKED') {
  const device = findCatalogDevice(brand, model, storage)!; assert(device, model); const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: t,
    lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { warrantyMode: mode, billMode: mode, ageMode: 'NOT_ASKED', brand: device.brand, model: device.model,
    modelKey: questionnaireModelKey(device), questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'fixture', observedAt: t });
  return device;
}
const nord = add('OnePlus', 'OnePlus Nord', '8 GB/128 GB', 8340, 'NOT_ASKED');
const eightPro = add('OnePlus', 'OnePlus 8 Pro', '8 GB/128 GB', 11520, 'NOT_ASKED');
const a72 = add('Samsung', 'Samsung Galaxy A72', '8 GB/128 GB', 6330, 'NOT_ASKED');           // NOT_ASKED, outside the 18
const xiaomi17 = add('Xiaomi', 'Xiaomi 17', '12 GB/512 GB', 57070, 'ASKED');                 // former legacy fallback (+₹1,600 measured)
const iphone17 = add('Apple', 'Apple iPhone 17', '256GB', 65000, 'ASKED');
const iphone12Pro = add('Apple', 'Apple iPhone 12 Pro', '256GB', 24460, 'NOT_ASKED');
const ultra = add('Xiaomi', 'Xiaomi 14 Ultra', '16 GB/512 GB', 37980, 'NOT_ASKED');
const note15 = add('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', 29250, 'ASKED');
const routes = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-02.json');
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert() { throw new Error('read only'); }, async appendHistory() {}, async getHistory() { return []; } };
const make = (pricingMode: 'legacy' | 'release-candidate', releaseRouteEvidence = routes) => createPricingService({ repository, questionnaireStore: profiles,
  now: () => at, pricingMode, releaseRouteEvidence, signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const clean = { calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger'], warranty: null, validBill: null, eSim: null, mobileAge: null };
const asked = { ...clean, warranty: false, validBill: true };
let checks = 0;
const check = async (name: string, fn: () => Promise<void> | void) => { await fn(); checks++; console.log(`PASS ${name}`); };

async function main() {
  const rc = make('release-candidate'), legacy = make('legacy');
  const q = (s: ReturnType<typeof make>, dev: typeof nord, d: object) => s.quote({ brand: dev.brand, model: dev.model, storage: dev.storage, diagnostics: d });

  await check('verified scope still binds: Nord candidate and 8 Pro accessory route', async () => {
    const n = await q(rc, nord, clean); assert(n.ok); assert.equal(n.fhoneifyPrice, 8986); assert.equal(n.pricingVersion, RELEASE_CANDIDATE_PRICING_VERSION);
    const p = await q(rc, eightPro, clean); assert(p.ok); assert.equal(p.internal.cashifyConditionEquivalent, 11500);
  });
  await check('former legacy fallback variants inspect in release mode, with no token', async () => {
    for (const [dev, d] of [[a72, clean], [xiaomi17, asked], [xiaomi17, { ...asked, defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' }]] as const) {
      const r = await q(rc, dev, d); assert(!r.ok, dev.model); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED');
      assert.equal('quoteToken' in r, false); assert(r.context && r.context.startingPrice > 0, 'nonbinding Get Upto context for review');
    }
  });
  await check('blocked profiles inspect: iPhone 17 (provisional deductions unused), 12 Pro, 14 Ultra, Note 15 Pro+ hardware', async () => {
    const scratch = { defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' };
    for (const [dev, d] of [[iphone17, asked], [iphone17, { ...asked, ...scratch }], [iphone12Pro, { ...clean, accessories: ['box'] }],
      [iphone12Pro, { ...clean, accessories: ['box'], ...scratch }], [ultra, clean], [note15, { ...asked, hardware: ['wifi'] }], [note15, asked]] as const) {
      const r = await q(rc, dev, d); assert(!r.ok, `${dev.model} ${JSON.stringify(d).slice(0, 40)}`); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal('quoteToken' in r, false);
    }
  });
  await check('legacy (rollback) mode still prices those variants', async () => {
    const r = await q(legacy, xiaomi17, asked); assert(r.ok); assert.equal(r.pricingVersion, PRICING_ENGINE_VERSION);
    const s = await q(legacy, a72, clean); assert(s.ok);
  });
  await check('an old legacy token cannot create a release-mode lead for an out-of-scope variant', async () => {
    const old = await q(legacy, xiaomi17, asked); assert(old.ok);
    const lead = await rc.verifyLeadPrice({ brand: xiaomi17.brand, model: xiaomi17.model, storage: xiaomi17.storage, diagnostics: asked, quoteToken: old.quoteToken, clientQuotedPrice: old.fhoneifyPrice });
    assert(!lead.ok); assert.equal(lead.code, 'MANUAL_INSPECTION_REQUIRED');
  });
  await check('an old release token for an in-scope route is recomputed after a policy version change', async () => {
    const legacyNord = await q(legacy, nord, clean); assert(legacyNord.ok);
    const lead = await rc.verifyLeadPrice({ brand: nord.brand, model: nord.model, storage: nord.storage, diagnostics: clean, quoteToken: legacyNord.quoteToken, clientQuotedPrice: legacyNord.fhoneifyPrice });
    assert(lead.ok); assert.equal(lead.price, 8986); assert.equal(lead.audit.priceSource, 'recomputed'); assert.equal(lead.audit.tokenRejectedReason, 'pricing_version_changed');
  });
  await check('missing route evidence (expired or unreadable file) inspects everything, never legacy', async () => {
    const none = make('release-candidate', []);
    for (const dev of [nord, eightPro, a72]) { const r = await q(none, dev, clean); assert(!r.ok); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED'); }
  });
  await check('evidence past its 14-day window inspects (16 Oct expiry) with a usable context', async () => {
    const later = createPricingService({ repository, questionnaireStore: profiles, now: () => new Date('2026-10-16T18:00:00Z'), pricingMode: 'release-candidate',
      releaseRouteEvidence: routes, signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
      strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
    for (const dev of [nord, eightPro]) {
      const r = await later.quote({ ...dev, diagnostics: clean }); assert(!r.ok, dev.model); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED'); assert(r.context?.startingPrice);
    }
  });
  await check('accessory route refuses answers its NOT_ASKED route cannot have (same strictness as candidates)', async () => {
    for (const extra of [{ warranty: false }, { validBill: true }, { mobileAge: 'above11' }, { eSim: 'Dual eSIM' }, { accessories: ['box', 'charger', 'spen'] },
      { accessories: ['box', 'charger', 'bill'] }, { box: true, accessories: ['charger'] }]) {
      const r = await q(rc, eightPro, { ...clean, ...extra }); assert(!r.ok, JSON.stringify(extra)); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED');
    }
  });
  await check('evidence clock is a fixed 14 days and the profile window follows the weekly crawl (38 days)', () => {
    const now = new Date('2026-10-16T11:18:00Z');
    assert.equal(isReleaseEvidenceCurrent('2026-10-02T11:18:55.550Z', now), true);
    assert.equal(isReleaseEvidenceCurrent('2026-10-02T11:18:55.550Z', new Date('2026-10-16T11:19:00Z')), false);
    assert.equal(isReleaseEvidenceCurrent('2026-10-17T00:00:00Z', now), false, 'future-dated');
    assert.equal(isReleaseEvidenceCurrent('not a date', now), false);
    assert.equal(isQuestionnaireProfileCurrent('2026-09-24T19:50:00Z', new Date('2026-10-28T03:30:00Z')), true, 'until the crawl re-learns it');
    assert.equal(isQuestionnaireProfileCurrent('2026-09-24T19:50:00Z', new Date('2026-11-02T00:00:00Z')), false);
  });
  await check('release switch: env on/off wins, committed file next, failures are legacy', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pricing-release-'));
    fs.mkdirSync(path.join(dir, 'config'));
    const write = (v: unknown) => fs.writeFileSync(path.join(dir, PRICING_RELEASE_CONFIG_FILE), typeof v === 'string' ? v : JSON.stringify(v));
    assert.deepEqual(resolvePricingReleaseConfig({}, dir).mode, 'legacy');                                      // missing file
    write('{not json'); assert.equal(resolvePricingReleaseConfig({}, dir).mode, 'legacy');                       // invalid file
    write({ releaseCandidate: true, routeEvidenceFile: 'r.json' });
    const fileOn = resolvePricingReleaseConfig({}, dir);
    assert.equal(fileOn.mode, 'release-candidate'); assert.equal(fileOn.source, 'file'); assert.equal(fileOn.routeEvidenceFile, path.resolve(dir, 'r.json'));
    assert.equal(resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'off' }, dir).mode, 'legacy');         // host rollback beats the file
    write({ releaseCandidate: false, routeEvidenceFile: 'r.json' });
    const envOn = resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'on', PRICING_RELEASE_ROUTE_EVIDENCE_FILE: 'other.json' }, dir);
    assert.equal(envOn.mode, 'release-candidate'); assert.equal(envOn.source, 'env'); assert.equal(envOn.routeEvidenceFile, path.resolve(dir, 'other.json'));
    assert.equal(resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'maybe' }, dir).mode, 'legacy');      // unknown env value -> file (off)
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await check('the committed config parses and names an existing route evidence file', () => {
    const c = JSON.parse(fs.readFileSync(PRICING_RELEASE_CONFIG_FILE, 'utf8'));
    assert.equal(typeof c.releaseCandidate, 'boolean'); assert(fs.existsSync(c.routeEvidenceFile)); assert.equal(loadReleaseRouteEvidence(c.routeEvidenceFile).length, 44);
  });
  console.log(`PASS release launch policy ${checks} checks`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
