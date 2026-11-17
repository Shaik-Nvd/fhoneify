/**
 * End-to-end quote flow for an iPhone priced by the evidence-calibrated model, over real HTTP and the real controllers,
 * with an injected in-memory reference price and a lead spy. No database, browser, scraper or external request is used.
 *
 *   input -> POST /api/quote/price -> signed quote -> POST /api/quote/leads -> stored lead -> reload (quote session)
 *
 * Run: npx tsx scripts/test/pricing.apple-evidence-flow.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import scopeJson from '../../lib/pricing/appleCashifyModel/scope.json';
import { applyCompetitorUplift, type DiagnosticsType } from '../../lib/pricingCalculator';
import { createPricingService, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { customerPayout } from '../../lib/pricing/payout';
import { applyReferenceBonusCeiling, headlineFromBase, maxPayoutForCashifyPayout, cashifyPayout } from '../../lib/pricing/payoutCeiling';
import { appleEvidenceQuote, storageGbOf } from '../../lib/pricing/appleCashifyModel';
import { loadQuoteSession, saveQuoteSession, sameAcceptedQuote, type SignedQuote, type KeyValueStorage } from '../../lib/pricing/quoteSession';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
process.env.DATABASE_URL = sentinel;
process.env.DIRECT_URL = sentinel;
process.env.JWT_SECRET = 'local-http-fixture-jwt-secret-not-for-production';
process.env.QUOTE_SIGNING_SECRET = 'local-http-fixture-signing-secret-not-for-production';
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.ENABLE_LIVE_MARKET_PRICE_SCRAPE = 'false';
process.env.QUOTE_PRICE_RATE_LIMIT = '1000';
process.env.QUOTE_LEAD_RATE_LIMIT = '1000';

const secret = process.env.QUOTE_SIGNING_SECRET;
const at = new Date('2026-10-25T12:00:00Z');
const observedAt = '2026-10-25T11:00:00Z';
const scope = (scopeJson as unknown as { models: Record<string, { enabled: boolean; storagesGb: number[] }> }).models;
const enabled = Object.entries(scope).filter(([, e]) => e.enabled);

// reference prices come from the committed evidence (latest observed day for that exact variant)
const measurements = fs.readFileSync(path.resolve(__dirname, '../../data/pricing-evidence/measurements.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const latestReference = (model: string, gb: number) => {
  const rows = measurements.filter((m: any) => m.model_key === model && m.storage_gb === gb && m.observed_date).sort((a: any, b: any) => a.observed_date.localeCompare(b.observed_date));
  return rows.length ? (rows[rows.length - 1].variant_get_upto as number) : null;
};
const catalogDeviceFor = (model: string, gb: number) => {
  const { SEED_DEVICES } = require('../../lib/seed_devices');
  const hit = (SEED_DEVICES as any[]).find(d => d.brand === 'Apple' && d.model === `Apple ${model}` && storageGbOf(d.storage) === gb);
  return hit ? findCatalogDevice(hit.brand, hit.model, hit.storage) : null;
};

const records = new Map<string, ReferencePriceRecord>();
const fixtures: { model: string; gb: number; device: NonNullable<ReturnType<typeof catalogDeviceFor>>; reference: number }[] = [];
for (const [model, e] of enabled) {
  const gb = e.storagesGb[0];
  const device = catalogDeviceFor(model, gb);
  const reference = latestReference(model, gb);
  if (!device || !reference) continue;
  const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: reference, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: observedAt,
    lastAttemptedAt: observedAt, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: observedAt, updatedAt: observedAt } as unknown as ReferencePriceRecord);
  fixtures.push({ model, gb, device, reference });
}
// one iPhone outside the evidence scope must keep today's engine
const outside = findCatalogDevice('Apple', 'Apple iPhone 13', '128GB');
if (outside) {
  const k = deviceKey(outside);
  records.set(k, { ...outside, deviceKey: k, source: 'cashify', currentPrice: 23710, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: observedAt,
    lastAttemptedAt: observedAt, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: observedAt, updatedAt: observedAt } as unknown as ReferencePriceRecord);
}
const repository: PricingServiceDeps['repository'] = {
  async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; },
};
const service = createPricingService({ repository, signingSecret: secret, now: () => at, tokenTtlSeconds: 900, strictReferenceMode: true,
  referenceLookupTimeoutMs: 100, snapshot: {}, pricingMode: 'legacy', logger: { info() {}, warn() {}, error() {} } });
const leads: Array<{ quotedPrice: number; answers: Record<string, any>; [k: string]: unknown }> = [];

const perfect: DiagnosticsType = {
  calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: 'No scratches', bodyDents: 'No dents', bodyPanel: null, bodyBent: null, hardware: [], accessories: ['box', 'charger'],
  warranty: true, validBill: true, eSim: null, mobileAge: 'below3',
};

async function startFixture(): Promise<Server> {
  const [{ default: express }, { default: prisma }, { pricingService }, { default: router }] = await Promise.all([
    import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'), import('../../server/modules/quote/routes'),
  ]);
  assert.equal(process.env.DATABASE_URL, sentinel, 'dotenv must never override the no-database sentinel');
  prisma.$connect = async () => { throw new Error('Fixture prohibits database connections'); };
  Object.defineProperty(prisma.lead, 'count', { value: async () => 0, configurable: true }); // coupon history: none, no database
  Object.defineProperty(prisma.lead, 'create', { value: async (args: unknown) => {
    const data = (args as { data: typeof leads[number] }).data;
    assert(Number.isInteger(data.quotedPrice) && data.quotedPrice > 0, 'only verified positive prices may be stored');
    leads.push(data);
    return { ...data, id: `fixture-lead-${leads.length}`, createdAt: at } as never;
  } });
  pricingService.quote = (input) => service.quote(input);
  pricingService.getUpto = (input) => service.getUpto(input);
  pricingService.verifyLeadPrice = (input) => service.verifyLeadPrice(input);
  const app = express();
  app.use(express.json());
  app.use('/api/quote', router);
  return await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.once('error', reject); });
}

async function run() {
  console.log('\nSuite J - evidence-calibrated iPhone quote flow over HTTP (no database)\n');
  if (!fixtures.length) { console.log('  SKIP  no iPhone model is enabled in scope.json'); return; }
  const server = await startFixture();
  const addr = server.address(); assert(addr && typeof addr !== 'string');
  const url = `http://127.0.0.1:${addr.port}`;
  let passed = 0; const failures: string[] = [];
  const check = async (name: string, fn: () => Promise<void> | void) => {
    try { await fn(); passed++; console.log(`  PASS  ${name}`); } catch (e) { failures.push(name); console.log(`  FAIL  ${name}: ${String(e).slice(0, 400)}`); }
  };
  const post = async (p: string, body: object) => {
    const r = await fetch(`${url}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() as any };
  };
  const f = fixtures[0];
  const req = (diagnostics: unknown, fx = f) => ({ brand: fx.device.brand, model: fx.device.model, storage: fx.device.storage, diagnostics });
  const wifi: DiagnosticsType = { ...perfect, hardware: ['wifi'] };
  const leadBody = (q: any, diagnostics: unknown, over: object = {}, fx = f) => ({
    brand: fx.device.brand, model: fx.device.model, storage: fx.device.storage, phone: '9876500000', name: 'Fixture', quotedPrice: q.fhoneifyPrice,
    quoteToken: q.quoteToken, couponApplied: true, answers: diagnostics, pickupDate: '2026-10-26', pickupTime: '10:00', address: 'x', pincode: '560001', city: 'x', ...over,
  });
  console.log(`  (fixture model: ${f.model} ${f.gb} GB, reference ₹${f.reference}; ${fixtures.length} enabled models exercised)`);

  await check('the server prices an in-scope iPhone with the evidence model and the answer changes the price', async () => {
    const a = await post('/api/quote/price', req(perfect)); const b = await post('/api/quote/price', req(wifi));
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.ok(b.body.data.fhoneifyPrice < a.body.data.fhoneifyPrice, 'Wi-Fi fault lowers the price');
    assert.ok(a.body.data.quoteToken && typeof a.body.data.couponHeadroom === 'number');
  });
  await check('identical inputs -> identical quote, and it is exactly the evidence model + existing uplift + payout ceiling', async () => {
    const a = await post('/api/quote/price', req(wifi)); const b = await post('/api/quote/price', req(wifi));
    assert.equal(a.body.data.fhoneifyPrice, b.body.data.fhoneifyPrice);
    assert.equal(a.body.data.pricingVersion, b.body.data.pricingVersion);
    const ev = appleEvidenceQuote(f.device.model, f.device.storage, f.reference, wifi);
    assert.ok(ev, 'in scope');
    const expected = applyReferenceBonusCeiling({ quote: applyCompetitorUplift(f.reference, ev!.outcome.price), cashifyHeadlineEquivalent: headlineFromBase(ev!.outcome.price), reference:f.reference,equivalentBasis:'base' }).quote;
    assert.equal(a.body.data.fhoneifyPrice, expected, 'uplift applied once, then the ceiling');
  });
  await check('payout (with and without the coupon) never exceeds Cashify-equivalent payout + min(8%, ₹2,000) for any in-scope answer set', async () => {
    const sets: DiagnosticsType[] = [perfect, wifi, { ...perfect, touch: false }, { ...perfect, screenCondition: 'Screen cracked/ glass broken', defects: ['screen_scratch'] },
      { ...perfect, screenSpots: '3 or more minor spots on screen', defects: ['screen_spot'] }, { ...perfect, hardware: ['face', 'back_camera'], accessories: [] },
      { ...perfect, warranty: false, mobileAge: 'above11' }, { ...perfect, mobileAge: '3to6', hardware: ['battery_service'] }];
    for (const fx of fixtures) for (const [setIndex, d] of sets.entries()) {
      const r = await post('/api/quote/price', req(d, fx));
      if (r.status !== 200) { assert.equal(r.status, 422, 'only an inspection request may decline'); continue; }
      const q = r.body.data;
      const ev = appleEvidenceQuote(fx.device.model, fx.device.storage, fx.reference, d);
      const headline = headlineFromBase(ev!.outcome.price);
      const ceiling = customerPayout(applyCompetitorUplift(fx.reference, ev!.outcome.price), false).payout;
      assert.ok(customerPayout(q.fhoneifyPrice, false).payout <= ceiling, `${fx.model} standard (answer set ${setIndex}: price ${q.fhoneifyPrice}, evidence ${ev!.outcome.price}, ceiling ${ceiling})`);
      assert.ok(customerPayout(q.fhoneifyPrice, true, q.couponHeadroom).payout <= ceiling, `${fx.model} coupon`);
    }
  });
  await check('a condition Cashify declines (calls fail + other faults) is an inspection request: 422, no price, no token, no lead', async () => {
    const r = await post('/api/quote/price', req({ ...perfect, calls: false, hardware: ['wifi'] }));
    assert.equal(r.status, 422); assert.equal(r.body.code, 'MANUAL_INSPECTION_REQUIRED');
    assert.ok(!r.body.data && !r.body.quoteToken);
    const before = leads.length;
    const lead = await post('/api/quote/leads', leadBody({ fhoneifyPrice: 1000, quoteToken: undefined }, { ...perfect, calls: false, hardware: ['wifi'] }));
    assert.notEqual(lead.status, 200); assert.equal(leads.length, before);
  });
  await check('lead creation stores the exact signed price, the clamped coupon payout and the audit', async () => {
    const q = (await post('/api/quote/price', req(wifi))).body.data;
    const before = leads.length;
    const res = await post('/api/quote/leads', leadBody(q, wifi));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const lead = leads[before];
    assert.equal(lead.quotedPrice, q.fhoneifyPrice, 'stored = displayed');
    assert.equal(lead.answers.pricing.priceSource, 'quote_token'); assert.equal(lead.answers.pricing.clientPriceMismatch, false);
    assert.equal(lead.answers.pricing.customerPayout.payout, customerPayout(q.fhoneifyPrice, true, q.couponHeadroom).payout);
    assert.ok(lead.answers.pricing.payoutCeiling.maxCustomerPayout >= lead.answers.pricing.customerPayout.payout);
    assert.equal(lead.answers.pricing.pricingVersion, q.pricingVersion);
  });
  await check('one payout everywhere: displayed = signed token = saved lead = restored session, for every enabled model, with and without the coupon', async () => {
    const { verifyQuoteToken } = await import('../../lib/pricing/quoteToken');
    for (const fx of fixtures) for (const d of [perfect, wifi]) {
      const r = await post('/api/quote/price', req(d, fx));
      if (r.status !== 200) continue;
      const q = r.body.data;
      const token = verifyQuoteToken(q.quoteToken, secret, Math.floor(at.getTime() / 1000));
      assert.ok(token.ok, 'token verifies');
      assert.equal((token as any).payload.p, q.fhoneifyPrice, `${fx.model}: signed price = displayed price`);
      const displayedPlain = customerPayout(q.fhoneifyPrice, false).payout;
      const displayedCoupon = customerPayout(q.fhoneifyPrice, true, q.couponHeadroom).payout;
      const before = leads.length;
      const res = await post('/api/quote/leads', leadBody(q, d, { couponApplied: false }, fx));
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(leads[before].answers.pricing.customerPayout.payout, displayedPlain, `${fx.model}: saved payout (no coupon)`);
      const res2 = await post('/api/quote/leads', leadBody(q, d, { couponApplied: true }, fx));
      assert.equal(res2.status, 200);
      assert.equal(leads[before + 1].answers.pricing.customerPayout.payout, displayedCoupon, `${fx.model}: saved payout (coupon)`);
      assert.equal(leads[before].quotedPrice, q.fhoneifyPrice); assert.equal(leads[before + 1].quotedPrice, q.fhoneifyPrice);
      const signed: SignedQuote = { device: { brand: fx.device.brand, model: fx.device.model, storage: fx.device.storage }, price: q.fhoneifyPrice, getUpto: q.startingPrice,
        token: q.quoteToken, expiresAt: q.expiresAt, diagnostics: d, pricingVersion: q.pricingVersion, couponHeadroom: q.couponHeadroom };
      const store = new Map<string, string>();
      const storage: KeyValueStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); } };
      saveQuoteSession(storage, { ...signed.device, starting: null, final: signed, answers: d, couponApplied: true });
      const restored = loadQuoteSession(storage, signed.device, at)!.final!;
      assert.equal(customerPayout(restored.price, true, restored.couponHeadroom).payout, displayedCoupon, `${fx.model}: restored payout`);
    }
  });
  await check('production release mode (hybrid) returns the same evidence quote as the plain service for every enabled model', async () => {
    const hybrid = createPricingService({ repository, signingSecret: secret, now: () => at, tokenTtlSeconds: 900, strictReferenceMode: true,
      referenceLookupTimeoutMs: 100, snapshot: {}, pricingMode: 'hybrid', releaseRouteEvidence: [], logger: { info() {}, warn() {}, error() {} } });
    let compared = 0;
    for (const fx of fixtures) for (const d of [perfect, wifi, { ...perfect, warranty: false, mobileAge: 'above11' }]) {
      const plain = await service.quote({ brand: fx.device.brand, model: fx.device.model, storage: fx.device.storage, diagnostics: d });
      const prod = await hybrid.quote({ brand: fx.device.brand, model: fx.device.model, storage: fx.device.storage, diagnostics: d });
      assert.equal(prod.ok, plain.ok, `${fx.model}`);
      if (plain.ok && prod.ok) { assert.equal(prod.fhoneifyPrice, plain.fhoneifyPrice, `${fx.model} hybrid = plain`); compared++; }
    }
    assert.ok(compared >= fixtures.length, `compared ${compared}`);
  });
  await check('the token binds the exact answers and device: changed answers or another model are re-priced, never honoured', async () => {
    const q = (await post('/api/quote/price', req(wifi))).body.data;
    const before = leads.length;
    const changed = await post('/api/quote/leads', leadBody(q, perfect)); // same token, better answers
    assert.equal(changed.status, 409); assert.equal(changed.body.code, 'QUOTE_CHANGED'); assert.equal(leads.length, before);
    if (fixtures[1]) {
      const other = await post('/api/quote/leads', leadBody(q, wifi, {}, fixtures[1]));
      assert.equal(other.status, 409); assert.equal(leads.length, before);
    }
  });
  await check('reload: the signed quote and its coupon headroom are restored exactly, then accepted by the server', async () => {
    const q = (await post('/api/quote/price', req(wifi))).body.data;
    const signed: SignedQuote = { device: { brand: f.device.brand, model: f.device.model, storage: f.device.storage }, price: q.fhoneifyPrice, getUpto: q.startingPrice,
      token: q.quoteToken, expiresAt: q.expiresAt, diagnostics: wifi, pricingVersion: q.pricingVersion, couponHeadroom: q.couponHeadroom };
    const store = new Map<string, string>();
    const storage: KeyValueStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); } };
    saveQuoteSession(storage, { ...signed.device, starting: null, final: signed, answers: wifi, couponApplied: true });
    const restored = loadQuoteSession(storage, signed.device, at);
    assert.ok(restored?.final); assert.equal(restored!.final!.price, q.fhoneifyPrice); assert.equal(restored!.final!.couponHeadroom, q.couponHeadroom);
    const fresh = (await post('/api/quote/price', req(restored!.final!.diagnostics))).body.data;
    assert.ok(sameAcceptedQuote(restored!.final!, { ...restored!.final!, price: fresh.fhoneifyPrice, getUpto: fresh.startingPrice, pricingVersion: fresh.pricingVersion }, at), 'revalidation accepts the restored quote');
    const before = leads.length;
    const lead = await post('/api/quote/leads', leadBody({ fhoneifyPrice: restored!.final!.price, quoteToken: restored!.final!.token }, restored!.final!.diagnostics));
    assert.equal(lead.status, 200); assert.equal(leads[before].quotedPrice, q.fhoneifyPrice);
  });
  await check('an iPhone outside the evidence scope is priced exactly as before (existing engine + the same ceiling)', async () => {
    if (!outside) return;
    const r = await post('/api/quote/price', { brand: outside.brand, model: outside.model, storage: outside.storage, diagnostics: { ...perfect, hardware: ['face'] } });
    assert.equal(r.status, 200);
    const { priceDevice } = await import('../../lib/pricing/engine');
    const legacy = priceDevice(outside.brand, outside.model, 23710, { ...perfect, hardware: ['face'] }, undefined, outside.storage);
    const expected = applyReferenceBonusCeiling({ quote: legacy.fhoneifyPrice, cashifyHeadlineEquivalent: headlineFromBase(legacy.cashifyConditionEquivalent),reference:23710,equivalentBasis:'base' }).quote;
    assert.equal(r.body.data.fhoneifyPrice, expected);
  });

  server.close();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
}
run().catch(e => { console.error(e); process.exitCode = 1; });
