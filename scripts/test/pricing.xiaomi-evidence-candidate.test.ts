import assert from 'node:assert/strict';
import { calculateXiaomiPrice } from '../../lib/pricingCalculator';
import { xiaomiInrDeductions } from '../../lib/pricing/inrDeductionTables';
import { calculateXiaomiEvidenceCandidate, xiaomiEvidenceCandidateConfig, XIAOMI_CANDIDATE_DEVELOPMENT } from '../../lib/pricing/xiaomiEvidenceCandidate';
import { COMBO_0 } from '../pricing/benchmark-combos';

const semantics = { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as const;
const clean = { ...COMBO_0, warranty: false, validBill: true, mobileAge: null, eSim: null, accessories: ['box'] };
const before = JSON.stringify(xiaomiInrDeductions());
const shippedQuoteBefore = calculateXiaomiPrice('Xiaomi 17',57750,clean,semantics).cashifyConditionEquivalent;
let checks = 0;
function price(model: string, storage: string, reference: number, diagnostics = clean) {
  const result = calculateXiaomiEvidenceCandidate(model, storage, reference, diagnostics, semantics, true);
  if (!result.supported) throw Error(result.reason);
  return result.quote.cashifyConditionEquivalent;
}
for (const e of XIAOMI_CANDIDATE_DEVELOPMENT) {
  assert.equal(price(e.model,e.storage,e.reference),e.clean); checks++;
  assert.equal(price(e.model,e.storage,e.reference,{...clean,originalScreen:false}),e.clean-e.localDisplay); checks++;
  assert.equal(price(e.model,e.storage,e.reference,{...clean,hardware:['charging']}),e.clean-e.charging); checks++;
  assert.equal(price(e.model,e.storage,e.reference,{...clean,originalScreen:false,hardware:['charging','charging']}),e.clean-e.localDisplay-e.charging); checks++;
  assert.equal(calculateXiaomiEvidenceCandidate(e.model,'8 GB/256 GB',e.reference,clean,semantics,true).supported,false); checks++;
  for (const d of [{...clean,warranty:true},{...clean,validBill:false},{...clean,touch:false},{...clean,accessories:['box','charger']},
    {...clean,screenCondition:'More than 2 scratches on screen'}, {...clean,hardware:['speaker']}, {...clean,mobileAge:'below3'}]) {
    assert.equal(calculateXiaomiEvidenceCandidate(e.model,e.storage,e.reference,d,semantics,true).supported,false); checks++;
  }
}
assert.equal(calculateXiaomiEvidenceCandidate('Xiaomi 15','12 GB/512 GB',37100,clean,semantics,true).supported,false); checks++;
assert.equal(calculateXiaomiEvidenceCandidate('Xiaomi 17','12 GB/512 GB',57750,clean,{...semantics,ageMode:'UNKNOWN'},true).supported,false); checks++;
assert.equal(calculateXiaomiEvidenceCandidate('Xiaomi 17','12 GB/512 GB',57750,clean,semantics,false).supported,false); checks++;
const config=xiaomiEvidenceCandidateConfig();
assert.equal(config.enabled,true); checks++;
assert.equal(xiaomiInrDeductions().enabled,false); checks++;
assert.equal(config.groups['xiaomi 17'].functionalCap,33040); checks++;
assert.equal(config.groups['xiaomi redmi turbo 5'].functionalCap,15350); checks++;
config.groups['xiaomi 17'].screen.localDisplay=1;
assert.equal(JSON.stringify(xiaomiInrDeductions()),before); checks++;
assert.equal(calculateXiaomiPrice('Xiaomi 17',57750,clean,semantics).cashifyConditionEquivalent,shippedQuoteBefore); checks++;
console.log(`PASS Xiaomi research candidate: ${checks} checks; active engine unchanged`);
