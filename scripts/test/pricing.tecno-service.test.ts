import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope,runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { runnerSupportsHardware } from '../../lib/pricing/cashifyRunnerModel/scope';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-21T00:00:00Z');
let reference=10000;
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:reference,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'tecno-offline-fixture-secret-32chars-long',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
assert(runnerSupportsHardware('Tecno Phantom V Fold 5G','hinge'),'Phantom V Fold keeps its hinge question');
assert(runnerSupportsHardware('Tecno Phantom V Flip 5G','outer_screen'),'Phantom V Flip keeps its outer-screen question');
for(const [model,storage,hasAge]of [['Tecno Camon 20','8 GB/256 GB',true],['Tecno POVA 3','4 GB/64 GB',false],['Tecno Phantom V Fold 5G','12 GB/512 GB',true],['Tecno Spark Go 5G','4 GB/128 GB',true]] as const){
 reference=10000;
 assert(runnerScope(model),model+' has a runner profile');
 const diagnostics={...clean,hardware:['wifi'],accessories:['box','charger'],...(hasAge?{}:{warranty:null,validBill:null,mobileAge:null})};
 const q=await service.quote({brand:'Tecno',model,storage,diagnostics});assert(q.ok,JSON.stringify(q));assert(q.internal.runnerModel);
 assert.equal(q.internal.cashifyConditionEquivalent,runnerQuote(model,storage,10000,diagnostics)!.price);
 assert.equal(q.fhoneifyPrice,Math.round(q.internal.cashifyConditionEquivalent+Math.min(10000*.08,1000)));
 assert(q.quoteToken);
 const bad=await service.quote({brand:'Tecno',model,storage,diagnostics:{...clean,calls:null}});assert(!bad.ok);assert.equal(bad.code,'MANUAL_INSPECTION_REQUIRED');
}
// Phantom V Fold: Cashify takes 20% off for a broken hinge (measured on 256 and 512 GB).
const fold={...clean,accessories:['box','charger']};
const healthy=runnerQuote('Tecno Phantom V Fold 5G','12 GB/512 GB',20600,fold)!.price;
const hinge=runnerQuote('Tecno Phantom V Fold 5G','12 GB/512 GB',20600,{...fold,hardware:['hinge']})!.price;
assert.equal(healthy-hinge,4120);
assert.equal(runnerScope('Tecno Unknown Future Model'),null);
console.log('PASS Tecno uses the authoritative runner service with bonus once, a signed token, fail-closed answers and the measured hinge deduction');
})().catch(error=>{console.error(error);process.exitCode=1;});
