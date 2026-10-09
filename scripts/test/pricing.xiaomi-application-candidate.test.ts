import assert from 'node:assert/strict';
import { COMBO_0 } from '../pricing/benchmark-combos';
import { calculateXiaomiApplicationCandidate } from '../../lib/pricing/xiaomiApplicationCandidate';
import { calculateXiaomiPrice } from '../../lib/pricingCalculator';
import { xiaomiInrDeductions } from '../../lib/pricing/inrDeductionTables';
import { inrConditionValue } from '../../lib/pricing/inrDeductions';
const d={...COMBO_0,warranty:false,validBill:true,mobileAge:null,eSim:null,accessories:['box'],originalScreen:false,hardware:['charging']};
const q={warrantyMode:'ASKED',billMode:'ASKED',ageMode:'NOT_ASKED',source:'profile'} as const;
const base={model:'Xiaomi 17',storage:'12 GB/512 GB',diagnostics:d,questionnaire:q,eSimMode:'NOT_ASKED',now:new Date('2026-10-01T18:00:00Z'),
  reference:{cashifyGetUptoReference:57750,source:'reference_repository',referenceStatus:'fresh',referenceSource:'cashify',referenceLastVerifiedAt:'2026-10-01T15:00:00Z'}} as const;
const shippedQuoteBefore=calculateXiaomiPrice(base.model,57750,d,q).cashifyConditionEquivalent;
let checks=0;
const ok=calculateXiaomiApplicationCandidate(base);assert(ok.supported);assert.equal(ok.quote.cashifyConditionEquivalent,32220);checks++;
for(const input of [{...base,reference:null},{...base,reference:{...base.reference,referenceStatus:'stale' as const}},
  {...base,reference:{...base.reference,source:'materialized_snapshot' as const}},
  {...base,reference:{...base.reference,referenceSource:'legacy_migration'}},
  {...base,reference:{...base.reference,cashifyGetUptoReference:58500}},
  {...base,questionnaire:{...q,source:'fallback' as const}}, {...base,eSimMode:'UNKNOWN' as const},
  {...base,diagnostics:{...d,hardware:['charging','speaker']}},
  {...base,model:'Xiaomi 15'}, {...base,model:'Xiaomi Redmi Note 15 Pro Plus 5G'}]){
  const r=calculateXiaomiApplicationCandidate(input);assert.equal(r.supported,false);assert.equal('quote' in r,false);checks++;
}
const turbo=calculateXiaomiApplicationCandidate({...base,model:'Xiaomi Redmi Turbo 5',storage:'12 GB/256 GB',reference:{...base.reference,cashifyGetUptoReference:26750}});
assert(turbo.supported);assert.equal(turbo.quote.cashifyConditionEquivalent,14640);checks++;
const config=xiaomiInrDeductions(), group='redmi-note-15-pro-plus';
const severe={...d,originalScreen:true,hardware:['front_camera','back_camera','wifi','speaker','charging','fingerprint']};
const raw={config,group,reference:29250,ageRetention:.74,diagnostics:severe,deadPhonePrice:1200};
const legacyBefore=JSON.stringify(config);
assert.equal(inrConditionValue(raw).functional,5400);checks++;
assert.equal(inrConditionValue(raw).value,16630);checks++;
assert.equal(inrConditionValue({...raw,config:{...config,groups:{...config.groups,[group]:{...config.groups[group],functionalCap:Infinity}}}}).value,16630);checks++;
assert.equal(JSON.stringify(xiaomiInrDeductions()),legacyBefore);checks++;
// Counterfactual diagnostics using six separately measured single-fault
// losses, frozen before four unseen combinations (all four matched). These
// test-local costs never replace the shipped tables.
const measuredFunctional={charging:1000,speaker:400,front_camera:2000,back_camera:3200,wifi:8770,fingerprint:5850};
const measuredConfig={...config,groups:{...config.groups,[group]:{...config.groups[group],functional:measuredFunctional}}};
const capped=inrConditionValue({...raw,config:measuredConfig});
assert.equal(capped.functional,6610);checks++;
assert.equal(capped.value,15420);checks++;
const uncappedConfig={...measuredConfig,groups:{...measuredConfig.groups,[group]:{...measuredConfig.groups[group],functionalCap:Infinity}}};
assert.equal(inrConditionValue({...raw,config:uncappedConfig}).value,1200);checks++;
assert.equal(inrConditionValue({...raw,config:uncappedConfig,ageRetention:(21780-380)/29250,deadPhonePrice:0}).value,560);checks++;
assert.equal(shippedQuoteBefore,calculateXiaomiPrice(base.model,57750,d,q).cashifyConditionEquivalent);checks++;
assert.equal(xiaomiInrDeductions().enabled,false);checks++;
console.log(`PASS application readiness and severe fault mechanism: ${checks} checks; no active engine changes`);
