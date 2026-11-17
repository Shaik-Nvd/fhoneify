import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope,runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { runnerSkipsAge,runnerOffersCharger } from '../../lib/pricing/cashifyRunnerModel/scope';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-16T00:00:00Z');
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:10000,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'xiaomi-others-offline-fixture-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
for(const [brand,model,storage]of [['POCO','POCO F4 5G','6 GB/128 GB'],['Motorola','Motorola Moto G85 5G','8 GB/128 GB'],['Motorola','Motorola Moto Razr 50 Ultra','12 GB/512 GB']]){
 assert(runnerScope(model),`${model} registered`);const diagnostics={...clean,hardware:['wifi'],accessories:['box','charger']};
 const q=await service.quote({brand,model,storage,diagnostics});assert(q.ok,JSON.stringify(q));assert(q.internal.runnerModel);
 assert.equal(q.internal.cashifyConditionEquivalent,runnerQuote(model,storage,10000,diagnostics)!.price);assert.equal(q.fhoneifyPrice,q.internal.cashifyConditionEquivalent+800);
 assert(q.quoteToken);assert(runnerOffersCharger(model,storage));
}
assert.equal(runnerScope('POCO Unknown Future Model'),null);assert(runnerSkipsAge({...clean,validBill:false}));
for(const brand of ['POCO','Motorola']) {
 const model=brand==='POCO'?'POCO F4 5G':'Motorola Moto G85 5G';const storage=brand==='POCO'?'6 GB/128 GB':'8 GB/128 GB';
 const q=await service.quote({brand,model,storage,diagnostics:{...clean,calls:null}});assert(!q.ok);assert.equal(q.code,'MANUAL_INSPECTION_REQUIRED');
}
console.log('PASS new brands use authoritative runner service with bonus once and token');
})().catch(error=>{console.error(error);process.exitCode=1;});
