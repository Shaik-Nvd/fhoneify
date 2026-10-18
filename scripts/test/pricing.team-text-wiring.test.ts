import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateApplePrice} from '../../lib/pricingCalculator';
import {reviewedAppleDispatchStorage} from '../../lib/pricing/appleVariantDispatch';
import fixture from '../pricing/fixtures/team-text-2026-10-18.json';
import {UNKNOWN_QUESTIONNAIRE} from '../../lib/pricing/questionnaireSemantics';
const d={calls:true,touch:true,originalScreen:true,warranty:false,validBill:true,eSim:null,mobileAge:null,defects:[],hardware:['face','battery_service'],accessories:[],screenCondition:null,screenSpots:null,screenLines:null,screenDiscoloration:null,bodyScratches:null,bodyDents:null,bodyPanel:null,bodyBent:null};
// Source case01, independently supplied TXT Selling; no formula constants computed by the test.
for(const [model,reference,selling] of [['Apple iPhone 15 Plus',48600,24910],['Apple iPhone 15 Pro',68160,35890],['Apple iPhone 15 Pro Max',72480,38430],['Apple iPhone 16',55150,27770],['Apple iPhone 16 Plus',56160,28270],['Apple iPhone 17',67700,32010]] as const){
 test(`${model} out-of-warranty512 reaches its own existing rule`,()=>{
  const device={brand:'Apple',model,storage:'512GB'};
  const storage=(reviewedAppleDispatchStorage as any)(device,d);
  assert.equal(storage,'512GB');
  const q=calculateApplePrice(model,reference,d,UNKNOWN_QUESTIONNAIRE,storage,{apple512OutOfWarrantyDispatch:true});
  assert.equal(selling,fixture.rows.find(r=>r.identity.model===model&&r.caseId==='01')!.sellingPrice);
  assert.equal(q.cashifyConditionEquivalent,selling);
 });
}
test('new wiring does not enable unsupported storage/model/warranty branches',()=>{
 for(const model of ['Apple iPhone 15 Plus','Apple iPhone 15 Pro','Apple iPhone 15 Pro Max','Apple iPhone 16','Apple iPhone 16 Plus','Apple iPhone 17']){
  for(const storage of ['128GB','256GB','1TB'])assert.equal((reviewedAppleDispatchStorage as any)({brand:'Apple',model,storage},d),undefined);
  for(const warranty of [true,null])assert.equal((reviewedAppleDispatchStorage as any)({brand:'Apple',model,storage:'512GB'},{...d,warranty}),undefined);
 }
 for(const model of ['Apple iPhone Air','Apple iPhone 16e','Apple iPhone 17 Pro','Apple iPhone 16 Pro'])assert.equal((reviewedAppleDispatchStorage as any)({brand:'Apple',model,storage:'512GB'},d),undefined);
});

import {createPricingService} from '../../lib/pricing/pricingService';
import {findCatalogDevice} from '../../lib/pricing/catalog';
import {customerPayout} from '../../lib/pricing/payout';
import {deviceKey} from '../../lib/referencePricing/types';
function serviceFor(row:any){
 const device=findCatalogDevice('Apple',row.identity.model,row.identity.storage)!;
 const time='2026-10-18T12:00:00Z';
 const record={...device,deviceKey:deviceKey(device),source:'cashify',currentPrice:row.referencePrice,matchConfidence:'exact',status:'fresh',lastVerifiedAt:time,lastAttemptedAt:time,lastFailureAt:null,lastFailureError:null,consecutiveFailures:0,createdAt:time,updatedAt:time};
 const service=createPricingService({repository:{async get(){return record as any},async listAll(){return[]},async upsert(){throw Error('no writes')},async appendHistory(){throw Error('no writes')},async getHistory(){return[]}},catalog:[device],snapshot:{},pricingMode:'hybrid',strictReferenceMode:true,referenceLookupTimeoutMs:100,signingSecret:'team-text-test-only-signed-quote-secret',tokenTtlSeconds:900,now:()=>new Date(time),logger:{info(){},warn(){},error(){}}});
 const diagnostics={screenSpots:null,screenLines:null,screenDiscoloration:null,bodyScratches:null,bodyDents:null,bodyPanel:null,bodyBent:null,...row.answers};
 return {service,input:{...device,diagnostics}};
}
test('corrected high-value Selling respects actual OFF/ON payout bounds through service',async()=>{
 const row=fixture.rows.find(r=>r.file==='iphone15_pro_max_24_test_cases.txt'&&r.caseId==='13')!;
 const {service,input}=serviceFor(row);const q=await service.quote(input);assert(q.ok);
 assert.equal(q.internal.cashifyConditionEquivalent,row.sellingPrice);
 for(const coupon of [false,true]){const payout=customerPayout(q.fhoneifyPrice,coupon).payout;assert(payout>row.sellingPrice!&&payout-row.sellingPrice!<=2000,`${payout} vs ${row.sellingPrice},coupon=${coupon}`);}
});

import {supportedApple512Fallback} from '../../lib/pricing/appleVariantDispatch';
import support from '../../lib/pricing/apple512FallbackSupport.json';
import {parseTeamText,buildTeamTextFixture} from '../pricing/team-text-20261018';
import fs from 'node:fs';
import path from 'node:path';
const rawDir=path.resolve('scripts/pricing/fixtures/team-text-2026-10-18');
test('raw transcripts reproduce fixture and invalid prices/choices fail closed',()=>{
 const regenerated=buildTeamTextFixture(rawDir);assert.deepEqual(regenerated,fixture);
 assert.equal(fixture.analysis.totalRows,198);assert.equal(fixture.analysis.observedRows,196);
 assert.equal(fixture.analysis.uniqueFullAnswerCombinations,172);assert.equal(fixture.analysis.conflictingExactGroups.length,0);
 assert.equal(fixture.analysis.ageGroups.filter(g=>!g.feasibleForBothCouponStates).length,15);
 const file='iphone15_pro_test_cases.txt';const original=fs.readFileSync(path.join(rawDir,file),'utf8');
 for(const changed of [original.replace('Processing Fee: ₹99\nTotal Amount: ₹35,791','Processing Fee: ₹1\nTotal Amount: ₹35,791'),original.replace('- Face Sensor not working','- Unknown hardware')]){
  const row=parseTeamText(file,Buffer.from(changed))[0];assert.equal(row.diagnostics.answersComplete,false);
 }
 assert(fixture.rows.every(r=>r.screenshotVerified===false&&!('observedAt'in r)));
});
test('new fallback scope rejects unseen faults, changed reference/storage, warranty, expiry and contradictions',()=>{
 const row=fixture.rows.find(r=>r.file==='iphone15_pro_max_24_test_cases.txt'&&r.caseId==='01')!;
 const {input}=serviceFor(row);const time=new Date('2026-10-18T12:00:00Z');
 const d=input.diagnostics as any;assert(supportedApple512Fallback(input,d,row.referencePrice!,time));
 assert(!supportedApple512Fallback(input,d,row.referencePrice!+1,time));
 assert(!supportedApple512Fallback({...input,storage:'256GB'},d,row.referencePrice!,time));
 assert(!supportedApple512Fallback(input,d,row.referencePrice!,new Date('2026-11-01T00:00:00Z')));
 for(const edit of [{bodyBent:'Phone bent'},{screenLines:'Lines on screen'},{screenSpots:'Multiple spots'}, {screenCondition:'Screen cracked',defects:['broken_screen']},{hardware:['wifi']},{hardware:['face','battery_service','battery_health']},{eSim:'Dual eSIM'},{warranty:true},{box:true},{accessories:['charger']},{calls:false},{touch:false}]){
  assert(!supportedApple512Fallback(input,{...d,...edit},row.referencePrice!,time),JSON.stringify(edit));
 }
 assert(support.rows.every(r=>!('sellingPrice'in r)&&!('getUpto'in r)));
});
test('new out-of-warranty quote remains age-neutral; target/device/reference identity remains bound',async()=>{
 const row=fixture.rows.find(r=>r.file==='iphone15_pro_max_24_test_cases.txt'&&r.caseId==='01')!;
 const {input,service}=serviceFor(row);const initial=await service.quote(input);assert(initial.ok);
 for(const mobileAge of [null,'below3','3to6','6to11','above11']){
  const q=await service.quote({...input,diagnostics:{...input.diagnostics,mobileAge}});assert(q.ok);assert.equal(q.fhoneifyPrice,initial.fhoneifyPrice);
 }
 const fresh=await service.verifyLeadPrice({...input,quoteToken:initial.quoteToken,clientQuotedPrice:initial.fhoneifyPrice});assert(fresh.ok);assert.equal(fresh.audit.priceSource,'quote_token');
 const changed=await service.verifyLeadPrice({...input,diagnostics:{...input.diagnostics,accessories:['box']},quoteToken:initial.quoteToken});assert(changed.ok);assert.equal(changed.audit.tokenRejectedReason,'diagnostics_mismatch');
});

import c1 from '../pricing/fixtures/exact-captures-2026-10-11-iphone12.json';
import c1Inputs from './fixtures/iphone12-reported-profiles-2026-10-11.json';
import {createExactFinalQuoteIndex,type ExactFinalQuoteEvidence} from '../../lib/pricing/exactFinalQuote';
import {existingExactFinalQuoteEvidence} from '../pricing/exact-final-quote-evidence';
import {loadReleaseRouteEvidence} from '../../lib/pricing/releaseRouteEvidence';
import {resolvePricingReleaseConfig} from '../../lib/pricing/releaseConfig';
test('prior captured iPhone12 C1 retains exact amount and both payout bounds',async()=>{
 const row=c1.rows[0];const device=findCatalogDevice(row.brand,row.model,row.storage)!;
 const reference={...c1Inputs.reference,status:'fresh',matchConfidence:'exact'};
 const config=resolvePricingReleaseConfig({},process.cwd());
 const service=createPricingService({repository:{async get(){return reference as any},async listAll(){return[]},async upsert(){throw Error('no writes')},async appendHistory(){throw Error('no writes')},async getHistory(){return[]}},
  questionnaireStore:{async get(){return c1Inputs.profile as any},async list(){return[]},async upsert(){throw Error('no writes')}} as any,
  releaseRouteEvidence:loadReleaseRouteEvidence(config.routeEvidenceFile!),exactFinalQuoteIndex:createExactFinalQuoteIndex(existingExactFinalQuoteEvidence()),exactFinalQuoteOfferPolicy:'bounded-net',
  catalog:[device],snapshot:{},pricingMode:'hybrid',strictReferenceMode:true,referenceLookupTimeoutMs:100,signingSecret:'team-text-C1-test-only-signed-quote-secret',tokenTtlSeconds:900,now:()=>new Date(Date.parse(row.observedAt)+60000),logger:{info(){},warn(){},error(){}}});
 const q=await service.quote({...device,diagnostics:row.diagnostics});assert(q.ok);assert(q.internal.exactFinalQuote);assert.equal(q.fhoneifyPrice,12247);
 assert.equal(q.internal.cashifyConditionEquivalent,row.sellingPrice);
 for(const coupon of [false,true]){const delta=customerPayout(q.fhoneifyPrice,coupon).payout-row.sellingPrice;assert(delta>0&&delta<=2000);}
});
