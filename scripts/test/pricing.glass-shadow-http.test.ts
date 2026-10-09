/** Offline real router test. No held-out Selling targets loaded into candidate/test inputs. */
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { existingExactFinalQuoteEvidence } from '../pricing/exact-final-quote-evidence';
import { createGlassShadowCandidate } from '../../lib/pricing/glassShadowCandidate';
import { createPricingService, type AuthoritativeQuote } from '../../lib/pricing/pricingService';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
Object.assign(process.env, { DATABASE_URL: sentinel, DIRECT_URL: sentinel, NODE_ENV: 'test',
  JWT_SECRET: 'offline-glass-shadow-jwt', QUOTE_SIGNING_SECRET: 'offline-glass-shadow-signing-secret-not-for-production',
  ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false', QUOTE_PRICE_RATE_LIMIT: '1000', QUOTE_LEAD_RATE_LIMIT: '1000' });
const ids = ['FM004_LIVE_A','FM004_LIVE_B','FM017_LIVE_A','FM017_LIVE_B'].map(x => `team-workbook-2026-10-02:${x}`);
const anchors = existingExactFinalQuoteEvidence().filter(r => ids.includes(r.id));
assert.equal(anchors.length, 4);
const originals = structuredClone(anchors);
let at = new Date('2026-10-09T12:00:00Z');
let failShadow = false;
const records = new Map<string, ReferencePriceRecord>();
const profiles = new InMemoryQuestionnaireProfileStore();
const routes = [...loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json')];
const fixtures = anchors.filter(r => r.id.endsWith('_A')).map(row => {
  const device = findCatalogDevice(row.brand, row.model, row.brand === 'Apple' ? row.storage.replace(/\s+GB/g,'GB') : row.storage)!;
  assert(device);
  const key = deviceKey(device), route = routes.find(r => r.brand === device.brand && r.model === device.model)!;
  records.set(key, { ...device, deviceKey:key, source:'cashify', currentPrice:row.getUpto, matchConfidence:'exact', status:'fresh',
    lastVerifiedAt:row.observedAt, lastAttemptedAt:row.observedAt, lastFailureAt:null, lastFailureError:null, consecutiveFailures:0, createdAt:row.observedAt, updatedAt:row.observedAt });
  profiles.profiles.set(questionnaireModelKey(device), { ...route.semantics, brand:device.brand, model:device.model, modelKey:questionnaireModelKey(device),
    questionLabels:[],status:'OK',statusDetail:null,sourceUrl:null,variantsChecked:1,parserVersion:'offline-glass-shadow',observedAt:row.observedAt });
  const parsed=parseDiagnostics(row.diagnostics);assert(parsed.ok);
  return {device,key, diagnostics:{...parsed.value,screenCondition:'Screen cracked/ glass broken',defects:['screen_scratch']}};
});
const originalRoutes=structuredClone(routes);
const candidate=createGlassShadowCandidate(anchors);
const deps = { repository:{ async get(key:string){return records.get(key)??null;},async listAll(){return [...records.values()];},async upsert(){throw Error('no writes');},async appendHistory(){throw Error('no writes');},async getHistory(){return [];} },
  questionnaireStore:profiles, releaseRouteEvidence:routes, pricingMode:'hybrid' as const,
  signingSecret:process.env.QUOTE_SIGNING_SECRET!,tokenTtlSeconds:900, strictReferenceMode:true, referenceLookupTimeoutMs:100, snapshot:{}, now:()=>at,
  logger:{info(){},warn(){},error(){}} };
const baseline=createPricingService(deps);
const active=createPricingService({...deps,glassShadowCandidate:input=>{if(failShadow)throw Error('fixture');return candidate(input);}});
let last:AuthoritativeQuote|undefined;
const leads:any[]=[];
async function run(){
 const [{default:express},{default:prisma},{pricingService,pricingRelease},{default:router}]=await Promise.all([
  import('express'),import('../../server/lib/prisma'),import('../../server/modules/quote/pricing'),import('../../server/modules/quote/routes')]);
 assert.equal(process.env.DATABASE_URL,sentinel);
 prisma.$connect=async()=>{throw Error('no DB');};
 Object.defineProperty(prisma.lead,'create',{value:async({data}:any)=>{leads.push(data);return {...data,id:`fixture-${leads.length}`};}});
 pricingRelease.mode='hybrid';
 pricingService.quote=async input=>{const out=await active.quote(input);last=out.ok?out:undefined;return out;};
 pricingService.verifyLeadPrice=input=>active.verifyLeadPrice(input);
 const app=express();app.use(express.json());app.use('/api/quote',router);
 const server:Server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const addr=server.address();assert(addr&&typeof addr!=='string');
 let checks=0;
 const post=async(endpoint:string,body:object)=>{const r=await fetch(`http://127.0.0.1:${addr.port}/api/quote${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json() as any};};
 const price=async(f:typeof fixtures[number],diagnostics=f.diagnostics)=>{
   const request={brand:f.device.brand,model:f.device.model,storage:f.device.storage,diagnostics};
   const response=await post('/price',request);const control=await baseline.quote(request);
   assert(control.ok);assert.equal(response.status,200);
   const {ok,internal,...publicControl}=control;
   assert.deepEqual(response.body.data,publicControl,'shadow cannot alter any public field or signed token');
   assert.equal(response.body.data.glassShadow,undefined);assert.equal(response.body.data.internal,undefined);
   checks++;return response;
 };
 try{
  for(const f of fixtures){
   const response=await price(f);const shadow=last!.internal.glassShadow!;assert(shadow.supported);
   assert(shadow.anchors.clean.ids.every(id=>ids.includes(id)));assert(shadow.anchors.scratch.ids.every(id=>ids.includes(id)));
   for(const payout of [shadow.couponOff,shadow.couponOn]) assert(payout.payout>shadow.sellingEstimate&&payout.payout-shadow.sellingEstimate<=2000);
   console.log(JSON.stringify({device:f.device.model,storage:f.device.storage,shadow}));
   for(const couponApplied of [false,true]){
    const r=await post('/leads',{brand:f.device.brand,model:f.device.model,storage:f.device.storage,answers:f.diagnostics,quoteToken:response.body.data.quoteToken,quotedPrice:shadow.gross,couponApplied,phone:'0000000000'});
    assert.equal(r.status,200);assert.equal(leads.at(-1).quotedPrice,response.body.data.fhoneifyPrice);assert.equal(leads.at(-1).answers.pricing.glassShadow,undefined);checks++;
   }
   for(const mutation of ['missing','mismatch','wrong-storage','bad-provenance','future-anchor'] as const){
    const i=anchors.findIndex(a=>a.brand===f.device.brand&&a.id.endsWith('_B'));const saved=anchors[i];
    if(mutation==='missing')anchors.splice(i,1);
    else anchors[i]={...saved,...(mutation==='mismatch'?{sellingPrice:saved.sellingPrice+10}:mutation==='wrong-storage'?{storage:'64GB'}:mutation==='future-anchor'?{observedAt:'2026-11-01T00:00:00Z'}:{provenance:{...saved.provenance,screenshotVerified:false}})};
    await price(f);assert.equal(last!.internal.glassShadow!.supported,false);
    anchors.splice(0,anchors.length,...structuredClone(originals));
   }
   for(const diagnostics of [{...f.diagnostics,bodyDents:'Major dent(s) or more than 2',defects:['screen_scratch','body_scratch']},{...f.diagnostics,accessories:[]}]){
    await price(f,diagnostics);assert.equal(last!.internal.glassShadow!.supported,false);
   }
   const record=records.get(f.key)!;
   for(const change of [{matchConfidence:'inferred'},{source:'other'},{lastVerifiedAt:'2026-09-01T00:00:00Z'}]){
    records.set(f.key,{...record,...change} as ReferencePriceRecord);await price(f);assert.equal(last!.internal.glassShadow!.supported,false);
   }
   records.set(f.key,record);

   records.set(f.key,{...record,currentPrice:record.currentPrice!+1000});
   const originalAt=at;at=new Date(at.getTime()+901000); // the displayed token is now expired
   const changed=await price(f);assert.equal(last!.internal.glassShadow!.supported,false);
   for(const couponApplied of [false,true]){
    const count=leads.length;const r=await post('/leads',{...f.device,answers:f.diagnostics,quoteToken:response.body.data.quoteToken,quotedPrice:changed.body.data.fhoneifyPrice,couponApplied,phone:'0000000000'});
    assert.equal(r.status,409);assert.equal(r.body.code,'QUOTE_CHANGED');assert.equal(leads.length,count);checks++;
   }
   records.set(f.key,record);at=originalAt;
   const profileKey=questionnaireModelKey(f.device),profile=profiles.profiles.get(profileKey)!;
   profiles.profiles.set(profileKey,{...profile,status:'FETCH_FAILED'});await price(f);assert.equal(last!.internal.glassShadow!.supported,false);profiles.profiles.set(profileKey,profile);
   const count=leads.length;const conflict={...f.diagnostics,box:false};
   const rejected=await post('/price',{...f.device,diagnostics:conflict});assert.equal(rejected.status,422);
   const lead=await post('/leads',{...f.device,answers:conflict,quoteToken:response.body.data.quoteToken,phone:'0000000000'});assert.equal(lead.status,422);assert.equal(leads.length,count);checks++;
  }
  // Fresh reference/profile/route metadata cannot refresh stale A/B capture evidence.
  at=new Date('2026-10-25T12:00:00Z');
  for(const r of records.values())r.lastVerifiedAt=at.toISOString();
  for(const p of profiles.profiles.values())p.observedAt=at.toISOString();
  for(const r of routes)r.observedAt=at.toISOString();
  for(const f of fixtures){await price(f);assert.equal(last!.internal.glassShadow!.supported,false);}
  at=new Date('2026-10-09T12:00:00Z');
  for(const f of fixtures){const row=originals.find(r=>r.brand===f.device.brand)!;records.get(f.key)!.lastVerifiedAt=row.observedAt;profiles.profiles.get(questionnaireModelKey(f.device))!.observedAt=row.observedAt;}
  routes.splice(0,routes.length,...originalRoutes);
  failShadow=true;await price(fixtures[0]);assert.equal(last!.internal.glassShadow!.supported,false);assert.equal((last!.internal.glassShadow as any).reason,'SHADOW_EVALUATION_FAILED');
  console.log(`PASS glass shadow: ${checks} router/control checks; ${leads.length} in-memory leads; zero DB writes; no held-out target inputs`);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
