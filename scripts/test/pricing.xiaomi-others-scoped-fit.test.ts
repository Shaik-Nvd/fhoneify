import assert from 'node:assert/strict';
import { mergeOnePlus9RT } from '../pricing-evidence/fit-cashify-runner-calibration';
import type { RunnerCalibration } from '../../lib/pricing/cashifyRunnerModel/model';
const p=(model:string,scrap:number)=>({brand:'OnePlus' as const,model,hasAge:false,variants:{'8gb/128gb':{scrap,accessories:['box']}},rules:{}});
const previous:RunnerCalibration={version:'old',sourceHash:'old-hash',profiles:{oneplus9rt5g:p('OnePlus 9RT 5G',1000),oneplus9r5g:p('OnePlus 9R 5G',1200)}};
const incoming:RunnerCalibration={version:'new',sourceHash:'new-hash',profiles:{oneplus9rt5g:p('OnePlus 9RT 5G',800)}};
const once=mergeOnePlus9RT(previous,incoming),twice=mergeOnePlus9RT(once,incoming);
assert.deepEqual(once,twice,'identical scoped refit must be byte-reproducible');assert.deepEqual(once.profiles.oneplus9r5g,previous.profiles.oneplus9r5g);assert.equal(once.profiles.oneplus9rt5g.variants['8gb/128gb'].scrap,800);
console.log('PASS scoped 9RT refit is idempotent and preserves protected profiles');
