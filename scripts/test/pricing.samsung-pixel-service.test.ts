import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { evaluateRunner } from '../../lib/pricing/cashifyRunnerModel/model';
import { PERFECT_CONDITION_DIAGNOSTICS as clean } from '../../lib/pricing/perfectCondition';
const at=new Date('2026-11-13T16:00:00Z');
const service=createPricingService({repository:{async get(key:string){return {deviceKey:key,currentPrice:60000,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,
  pricingMode:'hybrid',signingSecret:'samsung-pixel-offline-fixture-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,
  snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
(async()=>{
  for(const [brand,model,storage,full]of [['Samsung','Samsung Galaxy S25 Ultra 5G','256 GB','12 GB/256 GB'],['Google','Google Pixel 11','12 GB/256 GB','12 GB/256 GB']]) {
    const profile=runnerScope(model)!;assert(profile,`${brand} runner registered`);
    const diagnostics={...clean,hardware:['wifi']};
    const expected=evaluateRunner(profile,60000,diagnostics,full);
    const result=await service.quote({brand,model,storage,diagnostics});assert(result.ok);
    assert.equal(result.internal.cashifyConditionEquivalent,expected.price);
    assert.equal(result.internal.runnerModel?.support,'measured',`${model} RAM identity is measured`);
    assert.equal(result.fhoneifyPrice,expected.price+1000,'bonus once');
    assert.equal(result.internal.payoutCeiling.equivalentBasis,'base');
  }
  const refused=await service.quote({brand:'Samsung',model:'Samsung Galaxy A6',storage:'3 GB/32 GB',diagnostics:{...clean,screenSpots:'3 or more minor spots on screen'}});
  assert(!refused.ok);assert.equal(refused.code,'MANUAL_INSPECTION_REQUIRED');
  console.log('PASS Samsung/Pixel service routing, measured S25 RAM/storage, bonus once and no-offer');
})().catch(error=>{console.error(error);process.exitCode=1;});
