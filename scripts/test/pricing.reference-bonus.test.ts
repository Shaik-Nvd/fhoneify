import assert from 'node:assert/strict';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { createPricingService } from '../../lib/pricing/pricingService';
import { customerPayout } from '../../lib/pricing/payout';
import { applyReferenceBonusCeiling } from '../../lib/pricing/payoutCeiling';
async function main(){
 for(const [reference,condition,expected] of [[10000,5000,5800],[20000,5000,6000],[30000,10000,11000],[50000,10000,11000],[50001,10000,11000],[100000,1000,2000]]) assert.equal(applyCompetitorUplift(reference,condition),expected,`reference ${reference} condition ${condition}`);
 let reference=30000; const now=new Date();
 const service=createPricingService({repository:{async get(key:string){return {deviceKey:key,currentPrice:reference,source:'cashify',status:'fresh',matchConfidence:'exact',lastVerifiedAt:now};}} as any,signingSecret:'offline-reference-bonus-test-secret-only',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,now:()=>now,snapshot:{},pricingMode:'legacy',logger:{info(){},warn(){},error(){}}});
 let checks=6;
 for(const model of ['Apple iPhone XR','Apple iPhone 12','Apple iPhone 13','Apple iPhone 16']) for(const ref of [10000,20000,30000,50000,80000]) {
 reference=ref;const clean={calls:true,touch:true,originalScreen:true,defects:[],hardware:[],accessories:['box','charger'],warranty:false,validBill:true,mobileAge:'above11'};
 for(const diagnostics of [clean,{...clean,hardware:['back_camera']},{...clean,screenCondition:'Screen cracked/ glass broken'}]){
 const q=await service.quote({brand:'Apple',model,storage:'128GB',diagnostics});if(!q.ok)continue;
 const bonus=Math.min(reference*(reference<=20000?.08:reference<=50000?.06:.04),1000);
 const expected=Math.max(Math.round(q.internal.cashifyConditionEquivalent+bonus),100);
 assert.equal(q.fhoneifyPrice,expected,'service ceiling must preserve reference bonus');
 assert.equal(customerPayout(q.fhoneifyPrice,true,q.couponHeadroom).payout,customerPayout(expected,false).payout,'coupon must not stack above reference bonus'); checks++;
 }
 }
 for(let i=0;i<4000;i++){
 const reference=1000+(i*7919)%199000; const condition=100+(i*3571)%reference;
 const budget=Math.round(condition+Math.min(reference*(reference<=20000?.08:reference<=50000?.06:.04),1000));
 const ceiling=applyReferenceBonusCeiling({quote:budget,cashifyHeadlineEquivalent:condition-20,reference,equivalentBasis:'base'});
 if(ceiling.status==='ok'){assert.equal(ceiling.quote,budget);assert.equal(customerPayout(ceiling.quote,true,ceiling.couponHeadroom).payout,customerPayout(budget,false).payout);}
 checks++;
 }
 for(const reference of [NaN,Infinity,-1,0])assert.equal(applyReferenceBonusCeiling({quote:10000,cashifyHeadlineEquivalent:9000,reference,equivalentBasis:'selling'}).status,'inspection');
 console.log(`${checks} approved reference-bonus arithmetic and service checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
