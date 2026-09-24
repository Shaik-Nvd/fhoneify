/**
 * Cashify questionnaire metadata: parser, refresh policy, model-level reuse,
 * storage history, and how the engine and pricing service consume the
 * ASKED / NOT_ASKED / UNKNOWN semantics.
 *
 * Run: npm run test:pricing:questionnaire-metadata   (no database, no browser)
 */
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice, computeFhoneifyGetUpto, DiagnosticsType } from '../../lib/pricingCalculator';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/engine';
import { UNKNOWN_QUESTIONNAIRE, showsQuestion, type QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import { parseQuestionnairePage, QUESTIONNAIRE_PARSER_VERSION } from '../../lib/referencePricing/questionnaire/parser';
import { refreshReason } from '../../lib/referencePricing/questionnaire/policy';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { runQuestionnaireRefresh } from '../../lib/referencePricing/questionnaire/refreshJob';
import { questionnaireModelKey, type CashifyQuestionnaireProfile } from '../../lib/referencePricing/questionnaire/types';
import { createPricingService } from '../../lib/pricing/pricingService';
import { deviceKey, ReferencePriceRecord } from '../../lib/referencePricing/types';

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

// Visible text of Cashify's first questionnaire page, as read 2026-09-24.
const PAGE_ASKED = `Tell us more about your device?
Please answer a few questions about your device.
Are you able to make and receive calls?
Yes
No
Is your device's touch screen working properly?
Yes
No
Is your phone's screen original?
Yes
No
Is your device under manufacturer warranty?
You can get a better price for your device if it's under manufacturer warranty with a GST valid bill.
Yes
No
Do you have GST valid bill with the same IMEI?
Yes
No
Continue`;
const PAGE_NOT_ASKED = `Tell us more about your device?
Are you able to make and receive calls?
Yes
No
Is your device's touch screen working properly?
Yes
No
Is your phone's screen original?
Yes
No
Continue`;
const PAGE_PRODUCT_ONLY = 'Sell Old Apple iPhone 13 (4 GB/128 GB)\nGet Upto\n₹23,710\nGet Exact Value';

const ASKED: QuestionnaireSemantics = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' };
const NOT_ASKED: QuestionnaireSemantics = { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' };

const profile = (over: Partial<CashifyQuestionnaireProfile> = {}): CashifyQuestionnaireProfile => ({
  modelKey: 'apple|apple iphone 13', brand: 'Apple', model: 'Apple iPhone 13', ...NOT_ASKED,
  questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 2,
  parserVersion: QUESTIONNAIRE_PARSER_VERSION, observedAt: '2026-09-24T00:00:00.000Z', ...over,
});

async function run() {
  console.log('\nSuite I - Cashify questionnaire metadata\n');

  await test('parser: warranty and bill ASKED when the questions are shown', () => {
    const p = parseQuestionnairePage(PAGE_ASKED);
    assert.equal(p.ok, true);
    assert.deepEqual([p.warrantyMode, p.billMode, p.ageMode], ['ASKED', 'ASKED', 'NOT_ASKED']);
    assert.ok(p.questionLabels.includes('Is your device under manufacturer warranty?'));
  });

  await test('parser: NOT_ASKED when the questionnaire rendered without them', () => {
    const p = parseQuestionnairePage(PAGE_NOT_ASKED);
    assert.deepEqual([p.ok, p.warrantyMode, p.billMode], [true, 'NOT_ASKED', 'NOT_ASKED']);
  });

  await test('parser: a failed or partial load is UNKNOWN, never NOT_ASKED or false', () => {
    for (const text of [PAGE_PRODUCT_ONLY, '', null, undefined, 'Access denied']) {
      const p = parseQuestionnairePage(text as any);
      assert.deepEqual([p.ok, p.warrantyMode, p.billMode, p.ageMode], [false, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN']);
    }
  });

  await test('policy: new, UNKNOWN, failed, stale and parser-changed profiles are refreshed; fresh OK ones reused', () => {
    const now = new Date('2026-09-30T00:00:00Z');
    const opts = { now, parserVersion: QUESTIONNAIRE_PARSER_VERSION };
    assert.equal(refreshReason(null, opts), 'new');
    assert.equal(refreshReason(profile({ warrantyMode: 'UNKNOWN' }), opts), 'unknown');
    assert.equal(refreshReason(profile({ status: 'FETCH_FAILED' }), opts), 'failed');
    assert.equal(refreshReason(profile({ observedAt: '2026-08-01T00:00:00Z' }), opts), 'stale');
    assert.equal(refreshReason(profile({ parserVersion: 'old' }), opts), 'parser_changed');
    assert.equal(refreshReason(profile(), opts), null);
  });

  await test('refresh: one fetch set per MODEL, reused across its variants, and reused on the next run', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    const fetched: string[] = [];
    const devices = [
      { brand: 'Apple', model: 'Apple iPhone 13', storage: '128GB' },
      { brand: 'Apple', model: 'Apple iPhone 13', storage: '256GB' },
      { brand: 'Apple', model: 'Apple iPhone 13', storage: '512GB' },
      { brand: 'Samsung', model: 'Samsung Galaxy S24 5G', storage: '8 GB/256 GB' },
    ];
    const options = {
      devices, store, resolveUrl: (d: any) => `https://x/${d.model}/${d.storage}`, variantsPerModel: 2,
      fetchPageText: async (d: any, url: string) => { fetched.push(url); return { pageText: d.brand === 'Apple' ? PAGE_NOT_ASKED : PAGE_ASKED, url }; },
      now: () => new Date('2026-09-24T00:00:00Z'),
    };
    const first = await runQuestionnaireRefresh(options);
    assert.equal(first.models, 2);
    assert.equal(first.refreshed, 2);
    assert.equal(fetched.length, 3, 'two variants for the iPhone, one for the only S24 variant');
    assert.equal((await store.get(questionnaireModelKey(devices[0])))!.warrantyMode, 'NOT_ASKED');
    assert.equal((await store.get(questionnaireModelKey(devices[3])))!.warrantyMode, 'ASKED');
    const second = await runQuestionnaireRefresh(options);
    assert.deepEqual([second.refreshed, second.reused, fetched.length], [0, 2, 3], 'nothing re-fetched within 30 days');
  });

  await test('refresh: variants that disagree store UNKNOWN (VARIANT_MISMATCH), not either answer', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    let i = 0;
    await runQuestionnaireRefresh({
      devices: [{ brand: 'Google', model: 'Google Pixel 8', storage: '8 GB/128 GB' }, { brand: 'Google', model: 'Google Pixel 8', storage: '8 GB/256 GB' }],
      store, resolveUrl: () => 'https://x', fetchPageText: async (_d, url) => ({ pageText: i++ === 0 ? PAGE_ASKED : PAGE_NOT_ASKED, url }),
    });
    const p = (await store.get('google|google pixel 8'))!;
    assert.deepEqual([p.status, p.warrantyMode, p.billMode], ['VARIANT_MISMATCH', 'UNKNOWN', 'UNKNOWN']);
  });

  await test('refresh: transport failures and parser failures store UNKNOWN; a later success replaces them with history', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    const device = { brand: 'Vivo', model: 'Vivo X60 Pro', storage: '12 GB/256 GB' };
    await runQuestionnaireRefresh({ devices: [device], store, resolveUrl: () => 'https://x', fetchPageText: async () => { throw new Error('timeout'); } });
    assert.equal((await store.get('vivo|vivo x60 pro'))!.status, 'FETCH_FAILED');
    assert.equal((await store.get('vivo|vivo x60 pro'))!.warrantyMode, 'UNKNOWN');
    await runQuestionnaireRefresh({ devices: [device], store, resolveUrl: () => 'https://x', fetchPageText: async (_d, url) => ({ pageText: PAGE_PRODUCT_ONLY, url }) });
    assert.equal((await store.get('vivo|vivo x60 pro'))!.status, 'PARSE_FAILED');
    await runQuestionnaireRefresh({ devices: [device], store, resolveUrl: () => 'https://x', fetchPageText: async (_d, url) => ({ pageText: PAGE_NOT_ASKED, url }) });
    assert.equal((await store.get('vivo|vivo x60 pro'))!.warrantyMode, 'NOT_ASKED');
    assert.equal(store.history.length, 3, 'each semantic change is recorded');
  });

  await test('refresh: dry run writes nothing', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    await runQuestionnaireRefresh({ devices: [{ brand: 'A', model: 'B', storage: 'C' }], store, dryRun: true, resolveUrl: () => 'u', fetchPageText: async (_d, url) => ({ pageText: PAGE_ASKED, url }) });
    assert.equal((await store.list()).length, 0);
  });

  const base = { ...PERFECT_CONDITION_DIAGNOSTICS, mobileAge: null, warranty: null, validBill: null, accessories: ['box'] } as DiagnosticsType;

  await test('engine NOT_ASKED: no out-of-warranty/bill depreciation (iPhone 13 clean ≈ Cashify ₹24,030)', () => {
    const r = calculateFhoneifyPrice('Apple', 'Apple iPhone 13', 23710, base, NOT_ASKED);
    assert.equal(r.cashifyConditionEquivalent, 24090);
    // Even a stray "No" from an old client cannot bring the depreciation back.
    const stray = calculateFhoneifyPrice('Apple', 'Apple iPhone 13', 23710, { ...base, warranty: false, validBill: false, mobileAge: 'above11' }, NOT_ASKED);
    assert.equal(stray.cashifyConditionEquivalent, r.cashifyConditionEquivalent);
  });

  await test('engine ASKED: the calibrated warranty path still applies (S24 out of warranty)', () => {
    const young = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S24 5G', 34710, { ...base, warranty: true, validBill: true }, ASKED).cashifyConditionEquivalent;
    const old = calculateFhoneifyPrice('Samsung', 'Samsung Galaxy S24 5G', 34710, { ...base, warranty: false, validBill: true, mobileAge: 'above11' }, ASKED).cashifyConditionEquivalent;
    assert.ok(old < young, `${old} < ${young}`);
    assert.equal(old, 27318);
  });

  await test('engine UNKNOWN: identical to the pre-metadata behaviour (answers priced as given)', () => {
    const d = { ...base, warranty: false, validBill: true, mobileAge: 'above11' } as DiagnosticsType;
    assert.deepEqual(
      calculateFhoneifyPrice('Apple', 'Apple iPhone 13', 23710, d, UNKNOWN_QUESTIONNAIRE),
      calculateFhoneifyPrice('Apple', 'Apple iPhone 13', 23710, d)
    );
  });

  await test('UI rule and engine agree: NOT_ASKED hides the question; ASKED and UNKNOWN show it', () => {
    assert.equal(showsQuestion('NOT_ASKED'), false);
    assert.equal(showsQuestion('ASKED'), true);
    assert.equal(showsQuestion('UNKNOWN'), true);
  });

  await test('Get Upto never depends on questionnaire semantics', () => {
    assert.equal(computeFhoneifyGetUpto(23710), 25133);
  });

  await test('pricing service: uses the stored profile, exposes it, and records the fallback', async () => {
    const at = new Date().toISOString();
    const records = new Map<string, ReferencePriceRecord>();
    const device = { brand: 'Apple', model: 'Apple iPhone 13', storage: '128GB' };
    records.set(deviceKey(device), { deviceKey: deviceKey(device), ...device, source: 'cashify', currentPrice: 23710, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: at, updatedAt: at } as any);
    const repository = { get: async (k: string) => records.get(k) ?? null, listAll: async () => [...records.values()], upsert: async () => { throw new Error('read-only'); } } as any;
    const store = new InMemoryQuestionnaireProfileStore();
    const logs: string[] = [];
    const svc = createPricingService({ repository, questionnaireStore: store, signingSecret: 'x'.repeat(32), tokenTtlSeconds: 600, strictReferenceMode: false, referenceLookupTimeoutMs: 200, logger: { info: (_o: object, m: string) => logs.push(m), warn() {}, error() {} } });

    const fallback = await svc.quote({ ...device, diagnostics: { ...base, warranty: false, validBill: true, mobileAge: 'above11' } });
    assert.ok(fallback.ok);
    if (fallback.ok) {
      assert.deepEqual(fallback.questionnaire, { ...UNKNOWN_QUESTIONNAIRE, source: 'fallback' });
      assert.ok(logs.includes('Quote priced with the UNKNOWN questionnaire fallback'));
    }
    await store.upsert(profile());
    const known = await svc.quote({ ...device, diagnostics: { ...base } });
    assert.ok(known.ok);
    if (known.ok) {
      assert.equal(known.questionnaire.warrantyMode, 'NOT_ASKED');
      assert.equal(known.questionnaire.source, 'profile');
      assert.equal(known.fhoneifyPrice, 25535);
      assert.equal(known.startingPrice, 25133, 'Get Upto unchanged');
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
