import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { InspectionRequiredError } from '../../lib/pricing/inspectionRequired';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { fitRule } from '../pricing-evidence/fit-cashify-runner-calibration';
import { createPricingService } from '../../lib/pricing/pricingService';
import { explainQuote } from '../../lib/pricing/explain';

const quote = (edit: object = {}) => runnerQuote('OnePlus 12', '12 GB/256 GB', 33470, { ...clean, ...edit })!;
for (const hardware of [['hinge'], ['s_pen'], ['unknown_fault']]) {
  test(`R1 refuses unsupported hardware ${hardware}`, () => assert.throws(() => quote({ hardware }), InspectionRequiredError));
}
for (const edit of [{ defects: ['broken_screen'] }, { defects: ['screen_spot'] }, { defects: ['panel_missing'] },
  { defects: ['unknown_group'] }, { defects: ['__proto__'] }, { defects: ['constructor'] },
  { screenCondition: 'unknown damage' }, { bodyBent: 'unknown damage' }]) {
  test(`R1 refuses unsupported or incomplete answer ${JSON.stringify(edit)}`, () => assert.throws(() => quote(edit), InspectionRequiredError));
}
for (const screenCondition of ['Screen cracked/glass broken', 'screen cracked/ glass broken', '  SCREEN  cracked / glass broken  ']) {
  test(`R1 normalizes ${screenCondition}`, () => assert.equal(quote({ screenCondition }).price, quote({ screenCondition: 'Screen cracked/ glass broken' }).price));
}
test('R1 service refuses without issuing a price or token; R2 missing conditional age', async () => {
  const at = new Date('2026-11-12T00:00:00Z');
  const service = createPricingService({ repository: { async get(key: string) { return { deviceKey: key, currentPrice: 33470,
    source: 'cashify', status: 'fresh', lastVerifiedAt: at.toISOString() }; } } as any, pricingMode: 'hybrid',
    signingSecret: 'offline-review-test-secret-at-least-32-characters', tokenTtlSeconds: 900, strictReferenceMode: true,
    referenceLookupTimeoutMs: 100, now: () => at, snapshot: {}, logger: { info() {}, warn() {}, error() {} } });
  for (const edit of [{ hardware: ['hinge'] }, { defects: ['broken_screen'] }, { warranty: true, mobileAge: null }]) {
    const result = await service.quote({ brand: 'OnePlus', model: 'OnePlus 12', storage: '12 GB/256 GB', diagnostics: { ...clean, ...edit } });
    assert.equal(result.ok, false);
    assert(!('quoteToken' in result)); assert(!('fhoneifyPrice' in result));
  }
});
test('R2 age required only when the age question remains applicable', () => {
  assert.throws(() => quote({ warranty: true, mobileAge: null }), InspectionRequiredError);
  for (const edit of [{ touch: false }, { originalScreen: false }, { warranty: false }, { validBill: false },
    { screenCondition: 'Screen cracked/ glass broken' }, { bodyBent: 'Bent/ curved panel' }, { bodyPanel: 'Missing side or back panel' }]) {
    assert.equal(quote({ ...edit, mobileAge: null }).price, quote({ ...edit, mobileAge: 'above11' }).price);
  }
  assert.throws(() => quote({ bodyBent: 'Loose screen (Gap in screen and body)', mobileAge: null }), InspectionRequiredError);
  assert(runnerQuote('OnePlus 8', '8 GB/128 GB', 20000, { ...clean, mobileAge: null }));
});
test('R3 two distinct storages cannot identify affine or capped shapes, including frozen holdouts', () => {
  const points = [{ reference: 10000, value: 1500, storage: 'a' }, { reference: 20000, value: 2500, storage: 'b' }];
  for (const shape of [undefined, 'affine', 'capped'] as const) assert.equal(fitRule(points, shape).form, 'byStorage');
  assert.equal(fitRule([...points, { ...points[0] }]).form, 'byStorage');
});
test('R5 OnePlus 12 five functional faults reach the inferred INR1200 floor', () => {
  const result = quote({ hardware: ['wifi', 'bluetooth', 'fingerprint', 'face', 'back_camera'] });
  assert.equal(result.price, 1200); assert.equal(result.support, 'inferred');
});
test('R4 approval disclosure and R5 exact floor collection probe are present in review artifacts', () => {
  const response = fs.readFileSync('docs/pricing-handbook/RUNNER_REVIEW_RESPONSE_2026_11_12.md', 'utf8');
  assert.match(response, /Explicit owner approval is required for the seed_devices.ts catalog changes/);
  assert.match(response, /Explicit owner approval is also required for bypassing the October OnePlus display and accessory release routes/);
  const plan = fs.readFileSync('docs/next-quotes/oneplus-combinations.md', 'utf8');
  assert.match(plan, /FLOOR01: OnePlus 12 12 GB\/256 GB/);
  assert.match(plan, /Wi-Fi \+ Bluetooth \+ fingerprint \+ face \+ back camera/);
  assert.match(plan, /no combination observation supports that floor/);
});
test('R1 explanation does not label incomplete single-answer probes ignored and still refuses incomplete final answers', () => {
  const d = { ...clean, defects: ['screen_scratch'], screenCondition: 'Screen cracked/glass broken' };
  const result = explainQuote('OnePlus', 'OnePlus 12', 33470, d);
  assert.equal(result.finalPrice, runnerQuote('OnePlus 12', undefined, 33470, d)!.price + 1000);
  assert(!result.ignoredAnswers.some(answer => answer.startsWith('defects=')));
  assert.throws(() => explainQuote('OnePlus', 'OnePlus 12', 33470, { ...clean, defects: ['broken_screen'] }), InspectionRequiredError);
});
test('R3 conditional holdout freezes fallback form while refitting its coefficient from training only', () => {
  const rule = fitRule([{ reference: 10000, value: 1500, storage: 'a' }], 'byStorage', 'pct');
  assert.deepEqual(rule.fallback, { form: 'pct', value: .15 });
  assert.deepEqual(rule.values, { a: 1500 });
});
for (const accessory of ['box', 'charger']) {
  test(`R6 explicit false overrides stale ${accessory} array entry`, () => {
    assert.equal(quote({ [accessory]: false }).price, quote({ accessories: clean.accessories.filter(a => a !== accessory) }).price);
    assert(quote({ [accessory]: false }).price < quote().price);
  });
}
