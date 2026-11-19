import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope,runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { runnerSkipsAge,runnerOffersCharger } from '../../lib/pricing/cashifyRunnerModel/scope';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-16T00:00:00Z');
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:10000,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'xiaomi-others-offline-fixture-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
for(const [brand,model,storage]of [['Xiaomi','Xiaomi Redmi Note 11','6 GB/64 GB'],['Honor','Honor 20','6 GB/128 GB'],['Asus','Asus ROG Phone II ZS660KL','12 GB/512 GB'],['Lenovo','Lenovo K9 Note','4 GB/64 GB'],['Nokia','Nokia C12','2 GB/64 GB']]){
 assert(runnerScope(model),`${model} registered`);const diagnostics={...clean,hardware:['wifi'],accessories:['box','charger']};
 const q=await service.quote({brand,model,storage,diagnostics});assert(q.ok,JSON.stringify(q));assert(q.internal.runnerModel);
 assert.equal(q.internal.cashifyConditionEquivalent,runnerQuote(model,storage,10000,diagnostics)!.price);assert.equal(q.fhoneifyPrice,q.internal.cashifyConditionEquivalent+800);
 assert(q.quoteToken);assert(runnerOffersCharger(model,storage));
}
assert.equal(runnerScope('POCO F4'),null);assert(runnerSkipsAge({...clean,validBill:false}));
console.log('PASS new brands use authoritative runner service with bonus once and token');
})().catch(error=>{console.error(error);process.exitCode=1;});
