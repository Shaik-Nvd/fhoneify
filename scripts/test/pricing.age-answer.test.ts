import assert from 'node:assert/strict';
import fs from 'node:fs';
import { priceDevice } from '../../lib/pricing/engine';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { questionnaireFor, ageResolutionFor } from '../../lib/pricing/questionnaire';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { SEED_DEVICES } from '../../lib/seed_devices';

/**
 * The age answer shown after "warranty: Yes" must change the price wherever the page shows it.
 * Regression for the live bug of 16 Nov 2026: the crawled questionnaire profile says age NOT_ASKED
 * (it only reads Cashify's first page), and the server discarded every age answer for those phones.
 */
const crawled = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as const;
const R = 20000;
const price = (brand: string, model: string, edit: object) =>
  priceDevice(brand, model, R, { ...clean, warranty: true, validBill: true, ...edit } as any, crawled as any).cashifyConditionEquivalent;
const ages = ['below3', '3to6', '6to11', 'above11'] as const;

// POCO and most Oppo models now use measured runner age rules, covered by their service tests; Oppo A76 has no measured data.
const cases: [string, string, 'brackets' | 'elevenMonths'][] = [
  ['Vivo', 'Vivo V30', 'brackets'],
  ['Oppo', 'Oppo A76', 'brackets'],
  // 22 Nov 2026: unmeasured Android phones use the cross-brand generic rules, which price every bracket.
  ['Realme', 'Realme 12 Pro 5G', 'brackets'],
  ['Motorola', 'Motorola Edge 50', 'brackets'],
  ['Vivo', 'Vivo X Fold3 Pro', 'brackets'],
  ['iQOO', 'iQOO Z11 5G', 'brackets'],
  ['Ai+', 'Ai+ Nova 2 5G', 'brackets'],
];
for (const [brand, model, resolution] of cases) {
  assert.equal(runnerScope(model), null, `${model} must not be on the measured rules for this test`);
  assert.equal(ageResolutionFor({ brand, model }), resolution, `${model} age resolution`);
  assert.equal(questionnaireFor({ brand, model }).asksAge, true, `${model} asks the age question`);
  const p = Object.fromEntries(ages.map(a => [a, price(brand, model, { mobileAge: a })])) as Record<typeof ages[number], number>;
  assert.ok(p.below3 >= p['3to6'] && p['3to6'] >= p['6to11'] && p['6to11'] >= p.above11, `${model} older never pays more: ${JSON.stringify(p)}`);
  assert.ok(p.above11 < p.below3, `${model} above 11 months lowers the price: ${JSON.stringify(p)}`);
  assert.equal(p.above11, price(brand, model, { warranty: false, mobileAge: null }), `${model} above 11 months = warranty No`);
  if (resolution === 'brackets') assert.ok(p['3to6'] < p.below3, `${model} 3-6 months has its own value: ${JSON.stringify(p)}`);
  else assert.equal(p['3to6'], p.below3, `${model} has no 3-6 value, so the page must not offer it`);
}

// Page and engine agree for the whole catalog: a phone offered the four brackets must price them,
// and a phone offered only below/above 11 months must price above 11 differently.
let checked = 0;
for (const d of SEED_DEVICES as any[]) {
  if (!d.brand || runnerScope(d.model) || /apple/i.test(d.brand)) continue;
  const q = questionnaireFor({ brand: d.brand, model: d.model });
  const below = price(d.brand, d.model, { mobileAge: 'below3' }), above = price(d.brand, d.model, { mobileAge: 'above11' });
  assert.ok(above < below, `${d.brand} ${d.model}: above 11 months must lower the price`);
  if (q.ageResolution === 'brackets') {
    const mid = price(d.brand, d.model, { mobileAge: '6to11' });
    assert.ok(mid < below, `${d.brand} ${d.model}: offered 6-11 months must change the price`);
  }
  checked++;
}
// Measured brands leave this legacy loop as they are released (Oppo and Infinix: 777 devices remain); the floor only guards against an empty loop.
assert.ok(checked > 700, `checked ${checked} catalog devices`);

// Bug 2 guard: every device change in the quote page goes through the answer reset.
const page = fs.readFileSync('app/quote/page.tsx', 'utf8');
const nav = page.slice(page.indexOf('const navigateToState'), page.indexOf('setSelectedBrand(newBrand)') + 30);
assert.match(nav, /resetAnswersOnDeviceChange\(newBrand, newModel, newStorage\)/, 'picker navigation resets answers');
const pop = page.slice(page.indexOf('const handlePopState'), page.indexOf('setSelectedBrand(sBrand)') + 30);
assert.match(pop, /resetAnswersOnDeviceChange\(sBrand, sModel, sStorage\)/, 'back/forward navigation resets answers');
assert.equal((page.match(/setDiagnostics\(emptyDiagnostics\(\)\)/g) ?? []).length >= 2, true, 'reset and start-over use the empty questionnaire');

console.log(`PASS age answer priced on ${cases.length} brands and ${checked} catalog devices; answers reset on device change`);
