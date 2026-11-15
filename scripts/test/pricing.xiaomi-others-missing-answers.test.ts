import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-16T00:00:00Z');
const service=createPricingService({repository:{async get(key:string){return{deviceKey:key,currentPrice:10000,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,pricingMode:'hybrid',signingSecret:'new-brand-missing-answer-test-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
for(const field of ['calls','touch','originalScreen'])for(const value of [null,undefined]){
 const diagnostics={...clean,[field]:value};if(value===undefined)delete (diagnostics as any)[field];
 const q=await service.quote({brand:'Nokia',model:'Nokia C12',storage:'2 GB/64 GB',diagnostics});
 assert(!q.ok,`${field} ${value} must not produce a signed flawless quote`);assert.equal(q.code,'MANUAL_INSPECTION_REQUIRED');
}
const q=await service.quote({brand:'Xiaomi',model:'Xiaomi Redmi 12 5G',storage:'4 GB/128 GB',diagnostics:{...clean,warranty:null,validBill:true,mobileAge:'below3'}});
assert(!q.ok);assert.equal(q.code,'MANUAL_INSPECTION_REQUIRED');
console.log('PASS missing and omitted initial answers fail closed for new brand profiles');
})().catch(e=>{console.error(e);process.exitCode=1;});
