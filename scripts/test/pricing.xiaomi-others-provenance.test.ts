import assert from 'node:assert/strict';
import { evaluateRunner, type RunnerProfile } from '../../lib/pricing/cashifyRunnerModel/model';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const p={brand:'Nokia',model:'Nokia C12',hasAge:false,variants:{'2gb/64gb':{scrap:300,accessories:['box']}},rules:{'hardware:wifi':{form:'pct',value:.3,support:1,residual:0,measuredStorages:['3gb/64gb']}}} as RunnerProfile;
const q=evaluateRunner(p,10000,{...clean,hardware:['wifi'],accessories:['box']},'2 GB/64 GB');
assert.equal(q.price,7000);assert.equal(q.support,'inferred');assert.equal(q.breakdown[0].support,'inferred');
console.log('PASS uncollected storage answer is labelled inferred without changing price');
