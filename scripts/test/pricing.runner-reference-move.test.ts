import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runnerQuote, runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { evaluateDeduction, round10 } from '../../lib/pricing/cashifyRunnerModel/model';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
import { fitRule } from '../pricing-evidence/fit-cashify-runner-calibration';
import { InspectionRequiredError } from '../../lib/pricing/inspectionRequired';

test('R8 OnePlus 15 measured age loss follows reference moves, including forced-age branches', () => {
  const model = 'OnePlus 15', storage = '12 GB/256 GB', key = '12gb/256gb';
  const rule = runnerScope(model)!.rules['age:above11'];
  assert.equal(rule.form, 'byStorage'); assert.equal(rule.fallback?.form, 'pct');
  const measuredReference = rule.references?.[key];
  assert(measuredReference && measuredReference > 0, 'measured storage reference is retained');
  const measuredLoss = rule.values![key];
  assert.equal(evaluateDeduction(rule, measuredReference, key), measuredLoss);
  for (const multiplier of [.9, 1.1]) {
    const reference: number = measuredReference * multiplier;
    assert.equal(evaluateDeduction(rule, reference, key), measuredLoss * reference / measuredReference);
    for (const edit of [{ mobileAge: 'above11' }, { warranty: false }, { validBill: false }, { touch: false },
      { originalScreen: false }, { screenCondition: 'Screen cracked/ glass broken' },
      { bodyPanel: 'Cracked/ broken side or back panel' }, { bodyBent: 'Bent/ curved panel' }]) {
      const quote = runnerQuote(model, storage, reference, { ...clean, ...edit })!;
      const age = quote.breakdown.find(row => row.rule === 'age:above11');
      assert(age); assert.equal(age.amount, measuredLoss * reference / measuredReference);
      if ('mobileAge' in edit) assert.equal(quote.price, round10(reference - age.amount));
    }
  }
});
test('R8 fitter records only training references; fixed storage amounts remain fixed and unseen storage uses fallback', () => {
  const points = [{ reference: 10000, value: 1500, storage: 'a' }, { reference: 20000, value: 3100, storage: 'b' }];
  const rule = fitRule(points, 'byStorage', 'pct');
  assert.deepEqual(rule.references, { a: 10000, b: 20000 });
  assert.equal(evaluateDeduction(rule, 11000, 'a'), 1650);
  assert.equal(evaluateDeduction(rule, 22000, 'b'), 3410);
  assert.equal(evaluateDeduction(rule, 30000, 'unseen'), rule.fallback!.value * 30000);
  const heldout = fitRule([points[0]], 'byStorage', 'pct');
  assert.deepEqual(heldout.references, { a: 10000 });
  assert.equal(evaluateDeduction(heldout, 20000, 'b'), 3000);
  const fixed = fitRule(points, 'byStorage', 'fixed');
  assert.equal(evaluateDeduction(fixed, 20000, 'a'), 1500);
});
test('R8 percentage-backed measured values fail closed without a valid normalization reference', () => {
  const rule = fitRule([{ reference: 10000, value: 1500, storage: 'a' }], 'byStorage', 'pct');
  for (const references of [undefined, { a: 0 }, { a: NaN }]) {
    assert.throws(() => evaluateDeduction({ ...rule, references }, 11000, 'a'), InspectionRequiredError);
  }
});
