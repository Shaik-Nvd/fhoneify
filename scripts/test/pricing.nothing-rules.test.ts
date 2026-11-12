import assert from 'node:assert/strict';
import { evaluateRunner, evaluateDeduction, type RunnerProfile } from '../../lib/pricing/cashifyRunnerModel/model';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';

// Synthetic parameters test the repair/branch algebra independently of fitted quotes.
const fixed = (value: number) => ({ form: 'fixed' as const, value, support: 2, residual: 0 });
const pct = (value: number) => ({ form: 'pct' as const, value, support: 2, residual: 0 });
const profile: RunnerProfile = { brand: 'Nothing', model: 'Synthetic', hasAge: true,
  variants: { '8gb/128gb': { accessories: ['box', 'charger'], scrap: 800 } },
  rules: { 'age:above11': pct(.2), 'age:3to6': pct(.06), original: fixed(2000), crackedExtra: fixed(1000),
    touch: fixed(4000), panel: fixed(1500), bent: fixed(1500), loose: pct(.2),
    'hardware:wifi': pct(.3), 'hardware:back_camera': fixed(1000),
    box: fixed(500), charger: fixed(400), both: fixed(500) } };
const quote = (edit: object = {}, reference = 10000, p = profile) => evaluateRunner(p, reference, { ...clean, accessories: ['box', 'charger'], ...edit }, '8 GB/128 GB');
assert.equal(quote().price, 10000);
assert.equal(quote({ originalScreen: false }).price, 6000);
assert.equal(quote({ originalScreen: false, mobileAge: 'above11' }).price, 6000, 'forced age charged once');
assert.equal(quote({ screenCondition: 'Screen cracked/ glass broken' }).price, 5000);
assert.equal(quote({ touch: false, originalScreen: false, screenCondition: 'Screen cracked/ glass broken' }).price, 4000, 'largest display repair');
assert.equal(quote({ hardware: ['wifi', 'back_camera'] }).price, 6000);
assert.equal(quote({ hardware: ['wifi', 'back_camera', 'back_camera'] }).price, 6000);
assert.equal(quote({ accessories: [] }).price, 9500, 'accessories are not summed');
assert.equal(quote({ bodyPanel: 'Cracked/ broken side or back panel', bodyBent: 'Bent/ curved panel' }).price, 6500, 'one panel repair group, age once');
assert.equal(quote({ warranty: false }).price, quote({ validBill: false }).price);
assert.equal(quote({ warranty: false }).price, quote({ mobileAge: 'above11' }).price);
const inherited = { ...profile, rules: { ...profile.rules, 'hardware:back_camera': { ...fixed(1000), support: 0, inferredFrom: 'Synthetic sibling' } } };
assert.equal(quote({ hardware: ['back_camera'] }, 10000, inherited).support, 'inferred', 'inherited single answers stay inferred');
assert.equal(quote({ mobileAge: 'above 11 months' }).price, quote({ mobileAge: 'above11' }).price, 'legacy age label');
assert.equal(quote({ mobileAge: '3 months - 6 months' }).price, quote({ mobileAge: '3to6' }).price, 'recorded age label');
assert.equal(quote({ calls: false, hardware: ['wifi'] }).price, 800);
assert.equal(quote({ calls: false, accessories: [] }).support, 'inferred', 'calls plus missing accessories is a combination');
assert.equal(quote({ calls: false }).breakdown.reduce((sum, row) => sum + row.amount, 0), 10000 - 800, 'calls breakdown reconciles on deduction basis');
assert.equal(quote({ mobileAge: 'above11', warranty: false }, 10000, { ...profile, hasAge: false }).price, 10000);
assert.equal(quote({ hardware: ['wifi', 'back_camera'] }).support, 'inferred');
assert.equal(evaluateDeduction(fixed(1000), 20000, '8gb/128gb'), 1000);
assert.equal(evaluateDeduction(pct(.2), 20000, '8gb/128gb'), 4000);
assert.throws(() => quote({}, NaN), /reference/);
console.log('PASS synthetic runner rules: age once, repair groups, accessories, scrap, response and support');
