/**
 * Cashify questionnaire walk (parser v2): accessories, eSIM, defect/problem
 * tiles and age options read from every questionnaire page, stored as labels,
 * and used by the pricing service and the quote page.
 *
 * Fixtures are the visible text of Cashify's questionnaire pages read on
 * 19 Nov 2026 (Moto Razr 40 Ultra, Galaxy S25 Ultra, iPhone 18 Pro Max 2 TB).
 *
 * Run: node --import tsx scripts/test/pricing.questionnaire-flow.test.ts   (no database, no browser)
 */
import assert from 'node:assert/strict';
import fixtures from './fixtures/cashify-questionnaire-flow-2026-11-19.json';
import {
  parseQuestionnaireFlow, flowModesFromLabels, QUESTIONNAIRE_FLOW_PARSER_VERSION, QUESTIONNAIRE_PARSER_VERSION,
} from '../../lib/referencePricing/questionnaire/parser';
import { refreshReason } from '../../lib/referencePricing/questionnaire/policy';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { runQuestionnaireRefresh } from '../../lib/referencePricing/questionnaire/refreshJob';
import { questionnaireModelKey, type CashifyQuestionnaireProfile } from '../../lib/referencePricing/questionnaire/types';
import { createPricingService, withUnaskedAccessoriesPresent } from '../../lib/pricing/pricingService';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';

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

async function main() {
  console.log('\n=== Parsing the questionnaire walk ===\n');

  await test('Razr 40 Ultra: charger and box asked, no S Pen, no eSIM', () => {
    const p = parseQuestionnaireFlow(fixtures.razr);
    assert.equal(p.ok, true);
    assert.deepEqual([p.warrantyMode, p.billMode], ['ASKED', 'ASKED']);
    assert.deepEqual([p.boxMode, p.chargerMode, p.sPenMode, p.eSimMode], ['ASKED', 'ASKED', 'NOT_ASKED', 'NOT_ASKED']);
    assert.ok(p.flowLabels.includes('problem:Face Sensor not working'));
    assert.ok(p.flowLabels.includes('age:6 months - 11 months'));
  });

  await test('Galaxy S25 Ultra: box and S Pen asked, no charger', () => {
    const p = parseQuestionnaireFlow(fixtures.s25u);
    assert.deepEqual([p.boxMode, p.chargerMode, p.sPenMode], ['ASKED', 'NOT_ASKED', 'ASKED']);
  });

  await test('iPhone 18 Pro Max 2 TB: only the box is asked, and the eSIM question is', () => {
    const p = parseQuestionnaireFlow(fixtures.iphone18);
    assert.deepEqual([p.boxMode, p.chargerMode, p.sPenMode, p.eSimMode], ['ASKED', 'NOT_ASKED', 'NOT_ASKED', 'ASKED']);
    assert.ok(!p.flowLabels.some((l) => /iPhone 18 Pro Max \(/.test(l)), 'the summary card is not read as an option');
  });

  await test('a walk that stopped before the accessories page leaves accessories UNKNOWN, never NOT_ASKED', () => {
    const p = parseQuestionnaireFlow(fixtures.razr.slice(0, 2));
    assert.deepEqual([p.boxMode, p.chargerMode, p.sPenMode], ['UNKNOWN', 'UNKNOWN', 'UNKNOWN']);
  });

  await test('no first page: nothing is concluded', () => {
    const p = parseQuestionnaireFlow([{ index: 0, text: '403 Forbidden' }]);
    assert.equal(p.ok, false);
    assert.deepEqual([p.warrantyMode, p.chargerMode, p.eSimMode], ['UNKNOWN', 'UNKNOWN', 'UNKNOWN']);
  });

  await test('stored labels decode back to the same modes; labels from parser v1 decode to UNKNOWN', () => {
    for (const pages of [fixtures.razr, fixtures.s25u, fixtures.iphone18]) {
      const p = parseQuestionnaireFlow(pages);
      assert.deepEqual(flowModesFromLabels(p.flowLabels), { boxMode: p.boxMode, chargerMode: p.chargerMode, sPenMode: p.sPenMode, eSimMode: p.eSimMode });
    }
    assert.deepEqual(flowModesFromLabels(['Are you able to make and receive calls?']), { boxMode: 'UNKNOWN', chargerMode: 'UNKNOWN', sPenMode: 'UNKNOWN', eSimMode: 'UNKNOWN' });
  });

  console.log('\n=== Refresh job ===\n');

  const devices = [
    { brand: 'Motorola', model: 'Motorola Moto Razr 40 Ultra', storage: '8 GB/256 GB' },
    { brand: 'Motorola', model: 'Motorola Moto Razr 40 Ultra', storage: '12 GB/512 GB' },
  ];

  await test('a v1 profile is re-learned once the walk is in use', () => {
    const v1 = { modelKey: 'm', brand: 'b', model: 'm', warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED', questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: QUESTIONNAIRE_PARSER_VERSION, observedAt: new Date().toISOString() } as CashifyQuestionnaireProfile;
    assert.equal(refreshReason(v1, { now: new Date(), parserVersion: QUESTIONNAIRE_FLOW_PARSER_VERSION }), 'parser_changed');
  });

  await test('variants that agree: accessories stored, parser v2', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    const report = await runQuestionnaireRefresh({ devices, store, resolveUrl: (d) => d.storage, fetchFlow: async (_d, url) => ({ pages: fixtures.razr, url }) });
    const profile = await store.get(questionnaireModelKey(devices[0]));
    assert.equal(report.refreshed, 1);
    assert.equal(profile?.status, 'OK');
    assert.equal(profile?.parserVersion, QUESTIONNAIRE_FLOW_PARSER_VERSION);
    assert.deepEqual([profile?.boxMode, profile?.chargerMode], ['ASKED', 'ASKED']);
    assert.deepEqual(flowModesFromLabels(profile?.questionLabels).chargerMode, 'ASKED');
  });

  await test('variants that disagree on accessories keep warranty/bill but leave accessories UNKNOWN', async () => {
    const store = new InMemoryQuestionnaireProfileStore();
    const pagesFor = (storage: string) => storage === '8 GB/256 GB' ? fixtures.razr : fixtures.s25u.map((p) => ({ ...p, text: p.text.replace('Samsung Galaxy S25 Ultra 5G', 'Motorola Moto Razr 40 Ultra') }));
    await runQuestionnaireRefresh({ devices, store, resolveUrl: (d) => d.storage, fetchFlow: async (d, url) => ({ pages: pagesFor(d.storage), url }) });
    const profile = await store.get(questionnaireModelKey(devices[0]));
    assert.equal(profile?.status, 'OK');
    assert.equal(profile?.warrantyMode, 'ASKED');
    assert.equal(profile?.chargerMode, undefined);
    assert.deepEqual(flowModesFromLabels(profile?.questionLabels).chargerMode, 'UNKNOWN');
    assert.match(profile?.statusDetail ?? '', /disagree on accessories/);
  });

  console.log('\n=== Pricing service ===\n');

  await test('an accessory Cashify does not ask is treated as present; asked or unknown ones are left as answered', () => {
    const d = { accessories: ['box'], charger: false } as any;
    assert.deepEqual(withUnaskedAccessoriesPresent(d, { chargerMode: 'NOT_ASKED' }), { accessories: ['box', 'charger'], charger: null });
    assert.equal(withUnaskedAccessoriesPresent(d, { chargerMode: 'ASKED' }), d);
    assert.equal(withUnaskedAccessoriesPresent(d, { chargerMode: 'UNKNOWN' }), d);
    assert.equal(withUnaskedAccessoriesPresent(d, {}), d);
  });

  await test('the service exposes walked modes, prices an unasked charger as present, and its token still verifies', async () => {
    const at = new Date().toISOString();
    const device = { brand: 'Vivo', model: 'Vivo V70', storage: '8 GB/256 GB' };
    const record = { deviceKey: deviceKey(device), ...device, source: 'cashify', currentPrice: 35500, matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: at, updatedAt: at } as ReferencePriceRecord;
    const repository = { get: async () => record, listAll: async () => [record], upsert: async () => { throw new Error('read-only'); } } as any;
    const store = new InMemoryQuestionnaireProfileStore();
    const walked = parseQuestionnaireFlow(fixtures.iphone18); // box asked, charger not asked
    await store.upsert({ modelKey: questionnaireModelKey(device), brand: device.brand, model: device.model, warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED',
      boxMode: walked.boxMode, chargerMode: walked.chargerMode, sPenMode: walked.sPenMode, eSimMode: 'NOT_ASKED', questionLabels: walked.flowLabels,
      status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: QUESTIONNAIRE_FLOW_PARSER_VERSION, observedAt: at });
    const svc = createPricingService({ repository, questionnaireStore: store, signingSecret: 'x'.repeat(32), tokenTtlSeconds: 600, strictReferenceMode: false, referenceLookupTimeoutMs: 200, logger: { info() {}, warn() {}, error() {} } });
    const base = { calls: true, touch: true, originalScreen: true, defects: [], hardware: [], warranty: true, validBill: true, mobileAge: 'below3' };
    const without = await svc.quote({ ...device, diagnostics: { ...base, accessories: ['box', 'bill'] } });
    const withCharger = await svc.quote({ ...device, diagnostics: { ...base, accessories: ['box', 'charger', 'bill'] } });
    assert.ok(without.ok && withCharger.ok);
    if (!without.ok || !withCharger.ok) return;
    assert.equal(without.questionnaire.chargerMode, 'NOT_ASKED');
    assert.equal(without.questionnaire.boxMode, 'ASKED');
    assert.equal(without.fhoneifyPrice, withCharger.fhoneifyPrice, 'no deduction for a charger Cashify does not ask about');
    const lead = await svc.verifyLeadPrice({ ...device, diagnostics: { ...base, accessories: ['box', 'bill'] }, quoteToken: without.quoteToken } as any);
    assert.ok(lead.ok, 'the quote token binds the answers as submitted');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
