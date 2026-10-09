import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileFinalQuoteLedger } from '../../lib/pricing/finalQuoteLedger';
import { refreshFinalQuotes, CashifyCollectionBlocked } from '../../lib/pricing/finalQuoteRefresh';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pricing-review-followup-'));
 const job={key:'same-job',priority:1,device:{brand:'fixture',model:'fixture',storage:'fixture'},diagnostics:{}};
 try {
 let fetches=0;const first=createFileFinalQuoteLedger(root,'stopped');
 try {await refreshFinalQuotes({jobs:[job],authorizedAttempts:3,minStartIntervalMs:30000,ledger:first,wait:async()=>{},fetch:async()=>{fetches++;throw new CashifyCollectionBlocked('fixture block');},accept:async()=>{}});}finally{first.release();}
 const second=createFileFinalQuoteLedger(root,'stopped');
 try {const r=await refreshFinalQuotes({jobs:[job,{...job,key:'another-job'}],authorizedAttempts:3,minStartIntervalMs:30000,ledger:second,wait:async()=>{},fetch:async()=>{fetches++;return{id:'unverified'};},accept:async()=>{}});assert.equal(fetches,1,'A stopped campaign must not fetch again after restart');assert.equal(r.attempted,0);}finally{second.release();}
 console.log('PASS authentication stop persists across campaign restart; zero second fetches');
 for (const state of ['ACCEPTED','FAILED','CRASHED'] as const) {
 const campaign=`duplicate-${state}`,prior=createFileFinalQuoteLedger(root,campaign),reservation=await prior.reserve(job,3);
 if(state!=='CRASHED')await prior.finish(reservation.attempt,state,'previous-result');prior.release();
 const resumed=createFileFinalQuoteLedger(root,campaign),fetched:string[]=[];
 try {const result=await refreshFinalQuotes({jobs:[job,{...job,key:'new-job'}],authorizedAttempts:3,minStartIntervalMs:30000,ledger:resumed,wait:async()=>{},fetch:async j=>{fetched.push(j.key);return{id:j.key};},accept:async()=>{}});assert.deepEqual(fetched,['new-job']);assert.equal(result.attempted,1);await assert.rejects(()=>resumed.reserve(job,3));await assert.rejects(()=>resumed.reserve({...job,key:'ceiling-bypass'},4),/ceiling mismatch/);}finally{resumed.release();}
 }
 console.log('PASS accepted, failed and interrupted jobs stay consumed after restart; original ceiling retained');
 fs.mkdirSync(path.join(root,'config'));fs.writeFileSync(path.join(root,'config/pricing-release.json'),JSON.stringify({releaseCandidate:false,mode:'hybrid',exactFinalQuoteCache:true,exactFinalQuoteOfferPolicy:'bounded-net'}));
 const hybrid=resolvePricingReleaseConfig({PRICING_RELEASE_CANDIDATE:'hybrid'},root);assert.equal(hybrid.exactFinalQuoteCache,true);assert.equal(hybrid.exactFinalQuoteOfferPolicy,'bounded-net');const off=resolvePricingReleaseConfig({PRICING_RELEASE_CANDIDATE:'off'},root);assert.equal(off.mode,'legacy');assert.notEqual(off.exactFinalQuoteCache,true);
 console.log('PASS environment hybrid retains reviewed exact cache policy and off stays legacy');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
