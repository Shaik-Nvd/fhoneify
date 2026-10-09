import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadExactFinalQuoteFile } from '../../lib/pricing/exactFinalQuoteFile';
import { createFileFinalQuoteLedger } from '../../lib/pricing/finalQuoteLedger';
import { existingExactFinalQuoteEvidence, existingExactFinalQuoteIndex } from '../pricing/exact-final-quote-evidence';
import { boundedCompetitiveOffer, competitiveOfferAudit, createExactFinalQuoteIndex } from '../../lib/pricing/exactFinalQuote';
import { createPricingService } from '../../lib/pricing/pricingService';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { customerPayout } from '../../lib/pricing/payout';
import { canonicalDiagnosticsHash } from '../../lib/pricing/quoteToken';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { refreshFinalQuotes, CashifyCollectionBlocked } from '../../lib/pricing/finalQuoteRefresh';
import { parseFinalSellingPrice, requireEsimAnswer, requireBooleanAnswer } from '../../server/modules/quote/cashifyFinalPriceGuard';

const evidence=existingExactFinalQuoteEvidence(), index=existingExactFinalQuoteIndex();
const source=evidence.find(e=>e.id.endsWith('FM037_BOXREF_BOXNO'))!;
const device=findCatalogDevice(source.brand,source.model,source.storage)!;
const key=deviceKey(device), at=new Date('2026-10-07T17:30:00Z');
const profiles=new InMemoryQuestionnaireProfileStore();
profiles.profiles.set(questionnaireModelKey(device),{brand:device.brand,model:device.model,modelKey:questionnaireModelKey(device),warrantyMode:source.route.warranty,billMode:source.route.validBill,ageMode:source.route.mobileAge,
 questionLabels:[],status:'OK',statusDetail:null,sourceUrl:null,variantsChecked:1,parserVersion:'offline',observedAt:source.observedAt});
let record:ReferencePriceRecord={...device,deviceKey:key,source:'cashify',currentPrice:source.getUpto,matchConfidence:'exact',status:'fresh',lastVerifiedAt:source.observedAt,lastAttemptedAt:source.observedAt,lastFailureAt:null,lastFailureError:null,consecutiveFailures:0,createdAt:source.observedAt,updatedAt:source.observedAt};
const routes=loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json');
const base={repository:{async get(){return record;},async listAll(){return[record];},async upsert(){throw new Error('offline');},async appendHistory(){throw new Error('offline');},async getHistory(){return[];}},questionnaireStore:profiles,releaseRouteEvidence:routes,
 pricingMode:'hybrid' as const,signingSecret:'exact-final-quote-offline-signing-secret-not-production',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,logger:{info(){},warn(){},error(){}},snapshot:{},catalog:[device],now:()=>at};
const input={...device,diagnostics:source.diagnostics};
async function main(){
 const legacyHybrid=createPricingService(base), exact=createPricingService({...base,exactFinalQuoteIndex:index});
 const old=await legacyHybrid.quote(input), q=await exact.quote(input);assert(old.ok&&q.ok);assert.equal(old.internal.cashifyConditionEquivalent,5970);assert.equal(q.internal.cashifyConditionEquivalent,5650);
 assert(q.internal.exactFinalQuote); assert(q.pricingVersion.includes(q.internal.exactFinalQuote.fingerprint));
 const lead=await exact.verifyLeadPrice({...input,quoteToken:q.quoteToken,clientQuotedPrice:1});assert(lead.ok);assert.equal(lead.price,q.fhoneifyPrice);assert.equal(lead.audit.priceSource,'quote_token');assert(lead.audit.exactFinalQuote);
 console.log('PASS real missing-box capture corrects ₹5970 equivalent to ₹5650, signed token and in-memory lead agree');
 const original=record;
 record={...record,currentPrice:record.currentPrice+10};
 const moved=await exact.quote(input), movedBase=await legacyHybrid.quote(input);assert(moved.ok&&movedBase.ok);assert.equal(moved.fhoneifyPrice,movedBase.fhoneifyPrice);assert(!moved.internal.exactFinalQuote);
 const rechecked=await exact.verifyLeadPrice({...input,quoteToken:q.quoteToken});assert(rechecked.ok);assert.equal(rechecked.audit.tokenRejectedReason,'pricing_version_changed');record=original;
 console.log('PASS moved reference retains hybrid fallback and rejects old exact token');
 const expired=createPricingService({...base,exactFinalQuoteIndex:index,now:()=>new Date('2026-11-01T00:00:00Z')});const expiredBase=createPricingService({...base,now:()=>new Date('2026-11-01T00:00:00Z')});
 const eq=await expired.quote(input), eb=await expiredBase.quote(input);assert(eq.ok&&eb.ok);assert.equal(eq.fhoneifyPrice,eb.fhoneifyPrice);assert(!eq.internal.exactFinalQuote);
 const conflict=createPricingService({...base,exactFinalQuoteIndex:createExactFinalQuoteIndex([source,{...source,id:'conflict',sellingPrice:source.sellingPrice+100}])});const cq=await conflict.quote(input);assert(cq.ok);assert.equal(cq.fhoneifyPrice,old.fhoneifyPrice);assert(!cq.internal.exactFinalQuote);
 const mismatch=await exact.quote({...input,diagnostics:{...(source.diagnostics as any),hardware:['charging']}});const mismatchBase=await legacyHybrid.quote({...input,diagnostics:{...(source.diagnostics as any),hardware:['charging']}});assert(mismatch.ok&&mismatchBase.ok);assert.equal(mismatch.fhoneifyPrice,mismatchBase.fhoneifyPrice);assert(!mismatch.internal.exactFinalQuote);
 console.log('PASS expired, conflicting and unmeasured answers never reuse an exact captured price');
 const invalid=await exact.quote({...input,diagnostics:{...(source.diagnostics as any),validBill:false,accessories:['bill']}});assert(!invalid.ok&&invalid.code==='MANUAL_INSPECTION_REQUIRED');
 const parsed=parseDiagnostics(source.diagnostics);assert(parsed.ok);const reordered={...parsed.value,hardware:[...parsed.value.hardware].reverse(),accessories:[...parsed.value.accessories].reverse()};assert.equal(canonicalDiagnosticsHash(parsed.value),canonicalDiagnosticsHash(reordered));
 console.log('PASS bill contradiction remains inspection-only; token hashes preserve input order independence');
 for(const gu of [1,20000,20001,50000,50001,100000])for(let c=1;c<=150000;c+=17){const gross=boundedCompetitiveOffer(gu,c),standard=customerPayout(gross,false).payout,coupon=customerPayout(gross,true).payout;assert(standard>c&&standard-c<=2000);assert(coupon>c&&coupon-c<=2000);}
 assert.equal(competitiveOfferAudit(20000,1120).standardPass,false);assert.equal(competitiveOfferAudit(100000,100000).couponPass,false);
 console.log('PASS net-bound policy across 52,944 value/tier cases, low-value fee and high-value coupon boundaries');
 assert.equal(parseFinalSellingPrice('Get Upto ₹50,000\nVoucher ₹2,000'),null);assert.equal(parseFinalSellingPrice('Selling price\n₹12,340\nSell Now'),12340);assert.equal(parseFinalSellingPrice('Selling price ₹1,23,450'),123450);assert.equal(parseFinalSellingPrice('Selling price ₹1,200\nSelling price ₹2,000'),null);assert.throws(()=>requireEsimAnswer(null));assert.throws(()=>requireBooleanAnswer({},'warranty'));
 console.log('PASS scraper rejects Get Upto, vouchers, conflicting prices and invented conditional answers');
 let clock=0,fetches=0;const starts:number[]=[],reservations:number[]=[];
 const ledger={async reserve(){const attempt=reservations.length+1;reservations.push(attempt);return{attempt};},async finish(){}};
 const job={key:'one',priority:1,device,diagnostics:source.diagnostics};
 const dry=await refreshFinalQuotes({jobs:[job],authorizedAttempts:0,minStartIntervalMs:30000,ledger,fetch:async()=>{fetches++;return source;},accept:async()=>{}});assert.equal(fetches,0);assert.equal(dry.attempted,0);
 const paced=await refreshFinalQuotes({jobs:[job,job,{...job,key:'two'},{...job,key:'three'}],authorizedAttempts:2,minStartIntervalMs:30000,ledger,now:()=>clock,wait:async ms=>{clock+=ms;},fetch:async()=>{fetches++;starts.push(clock);return source;},accept:async()=>{}});assert.equal(paced.attempted,2);assert.deepEqual(starts,[0,30000]);
 const stopped=await refreshFinalQuotes({jobs:[job,{...job,key:'two'}],authorizedAttempts:2,minStartIntervalMs:30000,ledger,fetch:async()=>{throw new CashifyCollectionBlocked('CAPTCHA');},accept:async()=>{}});assert.equal(stopped.attempted,1);assert.equal(stopped.stopped,'AUTH_OR_CAPTCHA_STOP');
 console.log('PASS zero allowance performs no fetch; deduplicated serial pacing and auth stop charge every attempt');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'final-quote-ledger-'));
 try{
  const manifest=path.join(tmp,'evidence.json');fs.writeFileSync(manifest,JSON.stringify({version:'exact-final-quote-evidence/1',rows:evidence}));assert.equal(loadExactFinalQuoteFile(manifest).size,index.size);fs.writeFileSync(manifest,JSON.stringify({version:'wrong',rows:evidence}));assert.throws(()=>loadExactFinalQuoteFile(manifest));
  const disk=createFileFinalQuoteLedger(tmp,'one');assert.throws(()=>createFileFinalQuoteLedger(tmp,'one'));
  await disk.reserve(job,1);assert((await disk.lastStartTime!())!==null);disk.release();
  const reopened=createFileFinalQuoteLedger(tmp,'one');await assert.rejects(()=>reopened.reserve(job,1));await assert.rejects(()=>reopened.reserve(job,2));reopened.release();
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 console.log('PASS durable reservations survive restart, campaign ceiling cannot grow, concurrent workers are locked out');
 console.log('8 groups passed; zero browser requests or database writes');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
