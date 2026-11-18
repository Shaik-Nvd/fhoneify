import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope,runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { runnerSupportsHardware } from '../../lib/pricing/cashifyRunnerModel/scope';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-18T00:00:00Z');
let reference=10000;
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:reference,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'oppo-infinix-offline-fixture-secret-32chars',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
assert(runnerSupportsHardware('OPPO Find N3 Flip 5G','hinge')||runnerSupportsHardware('OPPO Find N3 Flip 5G','outer_screen'),'Find N3 Flip keeps its fold questions');
assert(runnerSupportsHardware('Infinix Zero Flip 5G','hinge')||runnerSupportsHardware('Infinix Zero Flip 5G','outer_screen'),'Zero Flip keeps its fold questions');
for(const [brand,model,storage]of [['Oppo','OPPO Reno12 Pro 5G','12 GB/256 GB'],['Oppo','OPPO F27 Pro Plus 5G','8 GB/128 GB'],['Infinix','Infinix Hot 50 5G','8 GB/128 GB'],['Infinix','Infinix Note 40 5G','8 GB/256 GB']]){
 reference=10000;
 assert(runnerScope(model),model+' has a runner profile');
 const diagnostics={...clean,hardware:['wifi'],accessories:['box','charger']};
 const q=await service.quote({brand,model,storage,diagnostics});assert(q.ok,JSON.stringify(q));assert(q.internal.runnerModel);
 assert.equal(q.internal.cashifyConditionEquivalent,runnerQuote(model,storage,10000,diagnostics)!.price);
 assert.equal(q.fhoneifyPrice,Math.round(q.internal.cashifyConditionEquivalent+Math.min(10000*.08,1000)));
 assert(q.quoteToken);
 const bad=await service.quote({brand,model,storage,diagnostics:{...clean,calls:null}});assert(!bad.ok);assert.equal(bad.code,'MANUAL_INSPECTION_REQUIRED');
}
assert.equal(runnerScope('OPPO Unknown Future Model'),null);assert.equal(runnerScope('Infinix Unknown Future Model'),null);
console.log('PASS Oppo and Infinix use the authoritative runner service with bonus once, a signed token and fail-closed answers');
})().catch(error=>{console.error(error);process.exitCode=1;});
