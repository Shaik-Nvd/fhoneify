import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope,runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { runnerSkipsAge,runnerOffersCharger,runnerSupportsHardware } from '../../lib/pricing/cashifyRunnerModel/scope';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-16T00:00:00Z');
let reference=10000;
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:reference,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'xiaomi-others-offline-fixture-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
assert(runnerSupportsHardware('Motorola Moto Razr','outer_screen'),'A measured no-offer remains an offered question');

for(const [brand,model,storage]of [['POCO','POCO F4 5G','6 GB/128 GB'],['Motorola','Motorola Moto G85 5G','8 GB/128 GB'],['Motorola','Motorola Moto Razr 50 Ultra','12 GB/512 GB']]){
 assert(runnerScope(model),`${model} registered`);const diagnostics={...clean,hardware:['wifi'],accessories:['box','charger']};
 const q=await service.quote({brand,model,storage,diagnostics});assert(q.ok,JSON.stringify(q));assert(q.internal.runnerModel);
 assert.equal(q.internal.cashifyConditionEquivalent,runnerQuote(model,storage,10000,diagnostics)!.price);assert.equal(q.fhoneifyPrice,q.internal.cashifyConditionEquivalent+800);
 assert(q.quoteToken);assert(runnerOffersCharger(model,storage));
}
// Small literal observation fixtures independently check routed condition values.
for(const [brand,model,storage,R,expected] of [
 ['POCO','POCO X7 5G','8 GB/128 GB',11280,7900],
 ['Motorola','Motorola Moto Razr 50 Ultra','12 GB/512 GB',31400,21790],
 ['Nokia','Nokia 8.1','4 GB/64 GB',2210,1340],
 ['Nokia','Nokia 8.1','6 GB/128 GB',2660,1610],
] as const) {
 reference=R;const q=await service.quote({brand,model,storage,diagnostics:{...clean,hardware:['wifi'],accessories:['box','charger']}});
 assert(q.ok);assert(Math.abs(q.internal.cashifyConditionEquivalent-expected)<=10);assert.equal(q.fhoneifyPrice,Math.round(q.internal.cashifyConditionEquivalent+Math.min(R*(R<=20000?.08:.06),1000)));
}
reference=10000;
for(const [brand,model,storage] of [['POCO','POCO X7 5G','8 GB/128 GB'],['Motorola','Motorola Moto G85 5G','8 GB/128 GB']]) {
 const young=await service.quote({brand,model,storage,diagnostics:{...clean,mobileAge:'below3'}});
 const old=await service.quote({brand,model,storage,diagnostics:{...clean,mobileAge:'above11'}});
 assert(young.ok&&old.ok);assert(old.fhoneifyPrice<young.fhoneifyPrice);
 const absent=await service.quote({brand,model,storage,diagnostics:{...clean,mobileAge:null}});assert(!absent.ok);assert.equal(absent.code,'MANUAL_INSPECTION_REQUIRED');
 const forced=await service.quote({brand,model,storage,diagnostics:{...clean,touch:false,mobileAge:null}});assert(forced.ok);
}
assert.equal(runnerScope('POCO Unknown Future Model'),null);assert(runnerSkipsAge({...clean,validBill:false}));
for(const brand of ['POCO','Motorola']) {
 const model=brand==='POCO'?'POCO F4 5G':'Motorola Moto G85 5G';const storage=brand==='POCO'?'6 GB/128 GB':'8 GB/128 GB';
 const q=await service.quote({brand,model,storage,diagnostics:{...clean,calls:null}});assert(!q.ok);assert.equal(q.code,'MANUAL_INSPECTION_REQUIRED');
}
console.log('PASS new brands use authoritative runner service with bonus once and token');
})().catch(error=>{console.error(error);process.exitCode=1;});
