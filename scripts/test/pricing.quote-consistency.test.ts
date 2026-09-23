/**
 * Suite F - one quote must stay the same number end to end:
 *   answers -> POST /api/quote/price -> page state -> reload -> lead -> stored lead.
 *
 * Also guards the single-source-of-truth rule: the quote page may not price
 * a device itself.
 *
 * Fully isolated (in-memory repository, fake storage); never touches live data.
 * Run: npm run test:pricing:consistency
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import type { DiagnosticsType } from '../../lib/pricingCalculator';
import { createPricingService } from '../../lib/pricing/pricingService';
import { PERFECT_CONDITION_DIAGNOSTICS, computeFhoneifyGetUpto, priceDevice } from '../../lib/pricing/engine';
import { explainQuote } from '../../lib/pricing/explain';
import { buildLeadAnswers, customerPayout } from '../../lib/pricing/payout';
import {
  KeyValueStorage,
  QUOTE_SESSION_KEY,
  SignedQuote,
  loadQuoteSession,
  saveQuoteSession,
} from '../../lib/pricing/quoteSession';
import type { ReferencePriceRepository } from '../../lib/referencePricing/store';
import { deviceKey, ReferencePriceRecord } from '../../lib/referencePricing/types';
import { SEED_DEVICES } from '../../lib/seed_devices';

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

class Repo implements ReferencePriceRepository {
  records = new Map<string, ReferencePriceRecord>();
  async get(key: string) { return this.records.get(key) ?? null; }
  async upsert(r: ReferencePriceRecord) { this.records.set(r.deviceKey, { ...r }); }
  async listAll() { return [...this.records.values()]; }
  async appendHistory() {}
  async getHistory() { return []; }
}

const SECRET = 'consistency-test-secret-longer-than-32-characters';
const silent = { info() {}, warn() {}, error() {} };

// The device from the audit trace: OnePlus 15R 12/512, live reference ₹35,940
// (the stale bundled snapshot says ₹36,300 - the page used to price from that).
const DEVICE = { brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/512 GB' };
const REFERENCE = 35940;

const ANSWERS: DiagnosticsType = {
  calls: true, touch: true, originalScreen: true,
  defects: ['screen_scratch', 'body_scratch'], screenCondition: 'Screen cracked/ glass broken',
  screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: 'More than 2 scratches', bodyDents: '1-2 minor dents', bodyPanel: null, bodyBent: null,
  hardware: ['back_camera'], accessories: ['box'], warranty: true, validBill: true, eSim: null, mobileAge: 'below3',
};

function setup(reference = REFERENCE) {
  const repo = new Repo();
  const at = new Date().toISOString();
  repo.records.set(deviceKey(DEVICE), {
    deviceKey: deviceKey(DEVICE), ...DEVICE, source: 'test', sourceUrl: 'https://example.test', currentPrice: reference,
    matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at, lastFailureAt: null,
    lastFailureError: null, consecutiveFailures: 0, createdAt: at, updatedAt: at,
  } as ReferencePriceRecord);
  const svc = createPricingService({
    repository: repo, signingSecret: SECRET, tokenTtlSeconds: 3600, strictReferenceMode: false,
    referenceLookupTimeoutMs: 100, logger: silent,
  });
  return { svc, repo };
}

/** What the quote page's requestSignedQuote() turns an API response into. */
async function pageRequestsQuote(svc: ReturnType<typeof setup>['svc'], diag: unknown): Promise<SignedQuote> {
  const q = await svc.quote({ ...DEVICE, diagnostics: diag });
  if (!q.ok) throw new Error(q.code);
  const { internal, ok, ...publicResponse } = q; // exactly what the controller sends
  return { device: { ...DEVICE }, price: publicResponse.fhoneifyPrice, getUpto: publicResponse.startingPrice, token: publicResponse.quoteToken, expiresAt: publicResponse.expiresAt, diagnostics: diag };
}

/** The lead endpoint: verify, then store what createLead stores. */
async function submitLead(svc: ReturnType<typeof setup>['svc'], quote: SignedQuote, coupon: boolean) {
  const verified = await svc.verifyLeadPrice({ ...DEVICE, diagnostics: quote.diagnostics, quoteToken: quote.token, clientQuotedPrice: quote.price });
  if (!verified.ok) throw new Error(verified.code);
  // Round-trip through JSON: that is what Postgres Json + Prisma give back.
  return JSON.parse(JSON.stringify({ quotedPrice: verified.price, answers: buildLeadAnswers(verified, coupon) }));
}

async function run() {
  console.log('\nSuite F - quote consistency (input -> API -> page -> reload -> lead)\n');

  await test('same quote through API, page state, reload, lead and stored lead', async () => {
    const { svc } = setup();
    const expected = priceDevice(DEVICE.brand, DEVICE.model, REFERENCE, ANSWERS).fhoneifyPrice;

    const shown = await pageRequestsQuote(svc, ANSWERS);
    assert.equal(shown.price, expected, 'API price');
    const displayed = customerPayout(shown.price, false).payout;

    const storage = new MemoryStorage();
    saveQuoteSession(storage, { ...DEVICE, starting: null, final: shown, answers: ANSWERS, couponApplied: false });
    const reloaded = loadQuoteSession(storage, DEVICE, new Date());
    assert.ok(reloaded?.final, 'quote survives reload');
    assert.equal(reloaded!.final!.price, shown.price, 'price after reload');
    assert.equal(customerPayout(reloaded!.final!.price, reloaded!.couponApplied).payout, displayed, 'displayed after reload');

    const lead = await submitLead(svc, reloaded!.final!, reloaded!.couponApplied);
    assert.equal(lead.quotedPrice, shown.price, 'stored quotedPrice');
    assert.equal(lead.answers.pricing.priceSource, 'quote_token');
    assert.equal(lead.answers.pricing.clientPriceMismatch, false);
    assert.equal(lead.answers.pricing.customerPayout.payout, displayed, 'stored customer payout == displayed');
    assert.notEqual(lead.quotedPrice, 0);
  });

  await test('the locked price holds even if the weekly refresh moves the reference before the lead', async () => {
    const { svc, repo } = setup();
    const shown = await pageRequestsQuote(svc, ANSWERS);
    repo.records.get(deviceKey(DEVICE))!.currentPrice = REFERENCE - 5000;
    const lead = await submitLead(svc, shown, false);
    assert.equal(lead.quotedPrice, shown.price);
    assert.notEqual(lead.answers.pricing.currentPrice, shown.price, 'fixture: current price really moved');
  });

  await test('coupon: displayed = quote - ₹99 + ₹299, stored identically and marked as a claim', async () => {
    const { svc } = setup();
    const shown = await pageRequestsQuote(svc, ANSWERS);
    const lead = await submitLead(svc, shown, true);
    assert.equal(lead.answers.pricing.customerPayout.payout, shown.price - 99 + 299);
    assert.equal(lead.answers.pricing.couponClaimed, true);
    assert.equal(lead.quotedPrice, shown.price, 'the engine price column is not altered by the coupon');
  });

  await test('Get Upto is the Cashify Get Upto plus uplift, before any answer', async () => {
    const { svc } = setup();
    const starting = await pageRequestsQuote(svc, PERFECT_CONDITION_DIAGNOSTICS);
    assert.equal(starting.getUpto, computeFhoneifyGetUpto(REFERENCE));
    assert.equal(starting.getUpto, 37940, 'OnePlus 15R 12/512: ₹35,940 + capped ₹2,000');
    assert.ok(starting.getUpto > REFERENCE, 'Fhoneify Get Upto starts above Cashify');
    const damaged = await pageRequestsQuote(svc, ANSWERS);
    assert.equal(damaged.getUpto, starting.getUpto, 'Get Upto does not depend on answers');
    assert.ok(damaged.price < damaged.getUpto);
  });

  await test('"Schedule Pickup" from Get Upto stores exactly the signed perfect-condition offer', async () => {
    const { svc } = setup();
    const starting = await pageRequestsQuote(svc, PERFECT_CONDITION_DIAGNOSTICS);
    const lead = await submitLead(svc, starting, false);
    assert.equal(lead.quotedPrice, starting.price);
    assert.equal(lead.answers.pricing.priceSource, 'quote_token');
    assert.equal(lead.answers.pricing.fhoneifyGetUpto, starting.getUpto);
    assert.equal(lead.answers.pricing.cashifyGetUptoReference, REFERENCE);
  });

  await test('the OLD page flow (empty answers, stale snapshot) is exactly what diverged', async () => {
    // Before: skip-to-pickup showed Get Upto but sent the untouched empty
    // answers, so the server re-priced a different device condition.
    const { svc } = setup();
    const starting = await pageRequestsQuote(svc, PERFECT_CONDITION_DIAGNOSTICS);
    const empty = { calls: null, touch: null, originalScreen: null, defects: [], hardware: [], accessories: [] };
    const v = await svc.verifyLeadPrice({ ...DEVICE, diagnostics: empty, quoteToken: starting.token, clientQuotedPrice: starting.price });
    assert.ok(v.ok);
    assert.equal(v.audit.tokenRejectedReason, 'diagnostics_mismatch');
    assert.notEqual(v.price, starting.price, 'old flow stored a different number than it showed');
    // And the browser-side estimate used the bundled snapshot (₹36,300).
    assert.notEqual(priceDevice(DEVICE.brand, DEVICE.model, 36300, ANSWERS).fhoneifyPrice, priceDevice(DEVICE.brand, DEVICE.model, REFERENCE, ANSWERS).fhoneifyPrice);
  });

  await test('a reload never restores ₹0, unsigned, expired or other-device prices', () => {
    const now = new Date();
    const good: SignedQuote = { device: { ...DEVICE }, price: 30916, getUpto: 37940, token: 't', expiresAt: new Date(now.getTime() + 60000).toISOString(), diagnostics: ANSWERS };
    const bad: [string, any][] = [
      ['zero price', { ...good, price: 0 }],
      ['null price', { ...good, price: null }],
      ['string price', { ...good, price: '30916' }],
      ['no token', { ...good, token: '' }],
      ['no Get Upto (pre-2026-09-23 session)', { ...good, getUpto: undefined }],
      ['zero Get Upto', { ...good, getUpto: 0 }],
      ['expired', { ...good, expiresAt: new Date(now.getTime() - 1).toISOString() }],
      ['other device', { ...good, device: { ...DEVICE, storage: '12 GB/256 GB' } }],
    ];
    for (const [label, q] of bad) {
      const s = new MemoryStorage();
      saveQuoteSession(s, { ...DEVICE, starting: q, final: q, answers: ANSWERS, couponApplied: false });
      const r = loadQuoteSession(s, DEVICE, now);
      assert.equal(r?.final, null, `${label}: final must not be restored`);
      assert.equal(r?.starting, null, `${label}: starting must not be restored`);
    }
    const s = new MemoryStorage();
    saveQuoteSession(s, { ...DEVICE, starting: good, final: good, answers: ANSWERS, couponApplied: false });
    assert.equal(loadQuoteSession(s, { ...DEVICE, model: 'Other' }, now), null, 'session for another device ignored');
    s.setItem(QUOTE_SESSION_KEY, '{not json');
    assert.equal(loadQuoteSession(s, DEVICE, now), null, 'corrupt session ignored');
  });

  await test('the quote page contains no pricing engine, snapshot, or ₹0 fallback', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../app/quote/page.tsx'), 'utf8');
    const forbidden = [
      /from ['"]@\/lib\/pricing\/engine['"]/,
      /from ['"]@\/lib\/pricingCalculator['"]/,
      /cashify_prices/,
      /pricingConfig\.json/,
      /\bpriceDevice\(/,
      /\bcalculateFhoneifyPrice\(/,
      /\bcomputeStartingPrice\(/,
      /\bresolveBaseMarketPrice\(/,
      /\bcomputeGetUpto\(/,
      /\bcomputeFhoneifyGetUpto\(/,
      /\bresolveReference\(/,
      /formatCurrency\(\s*\(?\s*(basePrice|finalPrice)\s*\|\|\s*0/,
      /Number\(finalPrice\)/,
    ];
    for (const re of forbidden) assert.ok(!re.test(src), `app/quote/page.tsx must not match ${re}`);
    assert.ok(src.includes("'/api/quote/price'"), 'page prices via the API');
  });

  await test('explain harness: steps add up and agree with the engine across the catalog', () => {
    const profiles: DiagnosticsType[] = [ANSWERS, { ...ANSWERS, warranty: false, validBill: false, accessories: [], mobileAge: 'above11', hardware: ['battery_service', 'face'] }, { ...ANSWERS, calls: false }];
    let checked = 0;
    for (const d of (SEED_DEVICES as any[]).filter((_, i) => i % 25 === 0)) {
      for (const p of profiles) {
        const x = explainQuote(d.brand, d.model, 40000, p);
        const sum = x.perfectConditionCashifyEquivalent + x.steps.reduce((a, s) => a + s.delta, 0);
        assert.equal(sum, x.cashifyEquivalent, `${d.model}: steps sum`);
        assert.equal(x.finalPrice, priceDevice(d.brand, d.model, 40000, p).fhoneifyPrice, `${d.model}: final`);
        checked++;
      }
    }
    assert.ok(checked > 50);
  });

  await test('payout rule preserved exactly from the old page expression', () => {
    for (const price of [100, 1200, 1296, 30916, 150000]) {
      for (const coupon of [false, true]) {
        const old = (price || 0) - (price === 1200 ? 0 : 99) + (coupon ? 299 : 0);
        assert.equal(customerPayout(price, coupon).payout, old);
      }
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
