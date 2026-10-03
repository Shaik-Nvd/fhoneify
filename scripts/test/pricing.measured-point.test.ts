/**
 * Measured-point candidates (one-point calibrations from traced 2026-10-02
 * blocks). Binding only at the calibrated Get Upto, with the exact route
 * answers, for the measured single conditions; everything else inspects.
 * Production's current route file does not list them, so they stay inactive
 * until the expansion route file is configured. In-memory only.
 */
import assert from 'node:assert/strict';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import measured from '../pricing/fixtures/measured-point-candidates-2026-10-03.json';

const at = new Date('2026-10-04T06:00:00Z'), t = '2026-10-04T05:00:00Z';
const records = new Map<string, ReferencePriceRecord>(), profiles = new InMemoryQuestionnaireProfileStore();
function add(brand: string, model: string, storage: string, price: number, w: 'ASKED' | 'NOT_ASKED') {
  const device = findCatalogDevice(brand, model, storage)!; assert(device, model); const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: t,
    lastAttemptedAt: t, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: t, updatedAt: t });
  profiles.profiles.set(questionnaireModelKey(device), { warrantyMode: w, billMode: w, ageMode: 'NOT_ASKED', brand: device.brand, model: device.model,
    modelKey: questionnaireModelKey(device), questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'cashify-questionnaire/1', observedAt: '2026-09-24T19:00:00Z' });
  return device;
}
const op13 = add('OnePlus', 'OnePlus 13', '16 GB/512 GB', 43950, 'ASKED');
const x15u = add('Xiaomi', 'Xiaomi 15 Ultra', '16 GB/512 GB', 59830, 'ASKED');
const ip16 = add('Apple', 'Apple iPhone 16', '256GB', 54720, 'ASKED');
const ip14pm = add('Apple', 'Apple iPhone 14 Pro Max', '256GB', 46010, 'NOT_ASKED');
const note10lite = add('Samsung', 'Samsung Galaxy Note 10 Lite', '6 GB/128 GB', 5600, 'NOT_ASKED');
const note15pp = add('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', 29250, 'ASKED');
const nord = add('OnePlus', 'OnePlus Nord', '8 GB/128 GB', 8340, 'NOT_ASKED');
const expansion = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json');
const current = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-02.json');
const repository: PricingServiceDeps['repository'] = { async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert() { throw new Error('read only'); }, async appendHistory() {}, async getHistory() { return []; } };
const make = (routes = expansion, now = at, pricingMode: 'legacy' | 'release-candidate' = 'release-candidate') => createPricingService({ repository, questionnaireStore: profiles, now: () => now,
  pricingMode, releaseRouteEvidence: routes, signingSecret: 'local-fixture-signing-secret-at-least-thirty-two-characters', tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, logger: { info() {}, warn() {}, error() {} } });
const clean = { calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger'], warranty: null, validBill: null, eSim: null, mobileAge: null };
const asked = { ...clean, warranty: false, validBill: true };
const glass = { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken' };
let checks = 0;
const check = async (name: string, fn: () => Promise<void> | void) => { await fn(); checks++; console.log(`PASS ${name}`); };

async function main() {
  const rc = make();
  const q = (s: ReturnType<typeof make>, dev: typeof op13, d: object) => s.quote({ brand: dev.brand, model: dev.model, storage: dev.storage, diagnostics: d });
  const est = async (s: ReturnType<typeof make>, dev: typeof op13, d: object) => { const r = await q(s, dev, d); assert(r.ok, `${dev.model} ${JSON.stringify(d).slice(0, 60)}: ${!r.ok && r.code}`); return r.internal.cashifyConditionEquivalent; };
  const inspects = async (s: ReturnType<typeof make>, dev: typeof op13, d: object, why: string) => { const r = await q(s, dev, d); assert(!r.ok, why); assert.equal(r.code, 'MANUAL_INSPECTION_REQUIRED', why); assert.equal('quoteToken' in r, false); };

  await check('every spec reproduces its calibration clean control and measured conditions (fit, not validation)', async () => {
    assert.equal(measured.specs.length, 23);
    assert.equal(await est(rc, op13, asked), 33480); assert.equal(await est(rc, op13, { ...asked, ...glass }), 22170);
    assert.equal(await est(rc, x15u, { ...asked, hardware: ['charging'] }), 43790); assert.equal(await est(rc, ip16, { ...asked, accessories: ['box'] }), 44400);
  });
  await check('production route file (2026-10-02) leaves every new spec at inspection', async () => {
    const live = make(current);
    for (const [dev, d] of [[op13, asked], [x15u, asked], [ip16, { ...asked, accessories: ['box'] }], [ip14pm, { ...clean, accessories: ['box'], eSim: 'Single eSIM' }]] as const) await inspects(live, dev, d, dev.model);
    assert.equal(await est(live, nord, clean), 8320, 'existing scope unchanged');
  });
  await check('one-point calibration: any reference move inspects, clean included', async () => {
    const k = deviceKey(op13), orig = records.get(k)!;
    try { records.set(k, { ...orig, currentPrice: 44000 }); await inspects(rc, op13, asked, 'moved clean'); await inspects(rc, op13, { ...asked, ...glass }, 'moved glass'); }
    finally { records.set(k, orig); }
  });
  await check('only the verified regime binds: warranty Yes, missing/extra accessories, unmeasured or severe conditions inspect', async () => {
    await inspects(rc, op13, { ...asked, warranty: true }, 'warranty Yes unmeasured');
    await inspects(rc, op13, { ...asked, validBill: false }, 'no bill unmeasured');
    await inspects(rc, op13, { ...asked, accessories: ['box'] }, 'missing charger');
    await inspects(rc, ip16, { ...asked, accessories: ['box', 'charger'] }, 'charger not asked on this route');
    await inspects(rc, op13, { ...asked, hardware: ['charging'] }, 'charging not measured on OnePlus 13');
    await inspects(rc, op13, { ...asked, touch: false }, 'touch'); await inspects(rc, op13, { ...asked, originalScreen: false }, 'non-original screen');
    await inspects(rc, op13, { ...asked, ...glass, hardware: ['charging'] }, 'combination');
    await inspects(rc, op13, { ...asked, defects: ['screen_scratch'], screenCondition: '1-2 scratches on screen' }, '1-2 scratches is not >2');
  });
  await check('eSIM route binds only the measured Single eSIM answer; S Pen route requires the S Pen', async () => {
    assert.equal(await est(rc, ip14pm, { ...clean, accessories: ['box'], eSim: 'Single eSIM' }), 45990);
    await inspects(rc, ip14pm, { ...clean, accessories: ['box'], eSim: 'Dual eSIM' }, 'Dual eSIM unmeasured');
    await inspects(rc, ip14pm, { ...clean, accessories: ['box'] }, 'eSIM answer required');
    assert.equal(await est(rc, note10lite, { ...clean, accessories: ['box', 'charger', 'spen'] }), 5580);
    await inspects(rc, note10lite, clean, 'S Pen missing');
  });
  await check('Note 15 Pro+ keeps the hardware guard; its measured glass binds', async () => {
    await inspects(rc, note15pp, { ...asked, hardware: ['charging'] }, 'hardware guard');
    assert.equal(await est(rc, note15pp, { ...asked, ...glass }), 19450);
  });
  await check('evidence expiry: from 16 Oct 2026 these routes inspect', async () => {
    const late = make(expansion, new Date('2026-10-16T19:30:00Z')); // last expansion route observed 2026-10-02T19:29Z
    await inspects(late, op13, asked, 'expired'); await inspects(late, x15u, asked, 'expired');
  });
  await check('quote -> token -> lead: token locks the measured price; a clean token cannot carry damaged answers', async () => {
    const quote = await q(rc, op13, asked); assert(quote.ok);
    const lead = await rc.verifyLeadPrice({ brand: op13.brand, model: op13.model, storage: op13.storage, diagnostics: asked, quoteToken: quote.quoteToken, clientQuotedPrice: quote.fhoneifyPrice });
    assert(lead.ok); assert.equal(lead.price, quote.fhoneifyPrice); assert.equal(lead.audit.priceSource, 'quote_token');
    const swapped = await rc.verifyLeadPrice({ brand: op13.brand, model: op13.model, storage: op13.storage, diagnostics: { ...asked, touch: false }, quoteToken: quote.quoteToken, clientQuotedPrice: quote.fhoneifyPrice });
    assert(!swapped.ok); assert.equal(swapped.code, 'MANUAL_INSPECTION_REQUIRED');
    const glassLead = await rc.verifyLeadPrice({ brand: op13.brand, model: op13.model, storage: op13.storage, diagnostics: { ...asked, ...glass }, quoteToken: quote.quoteToken, clientQuotedPrice: quote.fhoneifyPrice });
    assert(glassLead.ok); assert.equal(glassLead.audit.tokenRejectedReason, 'diagnostics_mismatch'); assert.equal(glassLead.price, (await q(rc, op13, { ...asked, ...glass }) as any).fhoneifyPrice);
  });
  await check('legacy (rollback) mode is not affected by the new specs', async () => {
    const legacy = make(expansion, at, 'legacy');
    const r = await q(legacy, op13, asked); assert(r.ok); assert.equal(r.internal.releaseCandidate, undefined);
  });
  console.log(`PASS measured-point candidates ${checks} checks`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
