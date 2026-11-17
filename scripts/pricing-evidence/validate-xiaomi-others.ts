import fs from 'node:fs';
import { createPricingService } from '../../lib/pricing/pricingService';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { modelKey, storageKey, evaluateRunner, type RunnerCalibration } from '../../lib/pricing/cashifyRunnerModel/model';
import { runnerStorageIdentity } from '../../lib/pricing/cashifyRunnerModel/identity';
import { series, generation, fitCalibration } from './fit-cashify-runner-calibration';
import type { RunnerMeasurement } from './import-cashify-runner-data';
import { statistics } from './validate-cashify-runner';

export async function validateXiaomiOthers(brand:'Xiaomi'|'Honor'|'Asus'|'Lenovo'|'Nokia'|'OnePlus'|'Google'|'POCO'|'Motorola', options:{dir?:string;replayControls?:boolean}={}) {
  const dir=options.dir??`data/pricing-evidence/${brand.toLowerCase()+'-2026-11-16'}`;
  const all:RunnerMeasurement[]=fs.readFileSync(`${dir}/measurements.jsonl`,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  const rows=all.filter(r=>(r.primary||['OnePlus','Google'].includes(brand))&&r.status==='quoted');
  const calibration:RunnerCalibration=JSON.parse(fs.readFileSync(`lib/pricing/cashifyRunnerModel/calibration.${brand.toLowerCase()}.json`,'utf8'));
  const at=new Date('2026-11-16T00:00:00Z');let reference=0;
  const service=createPricingService({repository:{async get(key:string){return {deviceKey:key,currentPrice:reference,source:'cashify',status:'fresh',lastVerifiedAt:at.toISOString()};}} as any,
    pricingMode:'hybrid',signingSecret:'samsung-pixel-offline-validation-secret-32',tokenTtlSeconds:900,strictReferenceMode:true,referenceLookupTimeoutMs:100,
    snapshot:{},now:()=>at,logger:{info(){},warn(){},error(){}}});
  const catalog=new Map(SEED_DEVICES.filter(d=>d.brand===brand).map(d=>[modelKey(d.model)+'|'+runnerStorageIdentity(d.storage,d.ram),d]));
  const replay:any[]=[],refusals:any[]=[],noOffer:any[]=[],moves:any[]=[];
  const selectedSources=new Set(all.filter(r=>r.primary).map(r=>modelKey(r.model)+'|'+storageKey(r.storage)+'|'+r.source.folder));
  for(const row of all.filter(r=>(options.replayControls?selectedSources.has(modelKey(r.model)+'|'+storageKey(r.storage)+'|'+r.source.folder):(r.primary||['OnePlus','Google'].includes(brand)))&&(r.status==='quoted'||r.status==='no_offer'))) {
    const device=catalog.get(modelKey(row.model)+'|'+storageKey(row.storage));if(!device)throw new Error(`Catalog missing ${row.model} ${row.storage}`);
    reference=row.reference!;
    const q=await service.quote({...device,diagnostics:row.diagnostics});
    if(row.status==='no_offer'){noOffer.push({model:row.model,storage:row.storage,caseId:row.caseId,manual:!q.ok&&q.code==='MANUAL_INSPECTION_REQUIRED',source:row.source});continue;}
    if(!q.ok){refusals.push({model:row.model,storage:row.storage,caseId:row.caseId,code:q.code,source:row.source});continue;}
    if(!q.internal.runnerModel||q.internal.payoutCeiling.equivalentBasis!=='base')throw new Error('Runner bypassed or repriced');
    if(q.fhoneifyPrice!==Math.round(q.internal.cashifyConditionEquivalent+Math.min(reference*(reference<=20000?.08:reference<=50000?.06:.04),1000)))throw new Error('Bonus applied incorrectly');
    replay.push({model:row.model,storage:row.storage,caseId:row.caseId,error:q.internal.cashifyConditionEquivalent-row.base!,format:row.source.format,source:row.source,support:q.internal.runnerModel.support});
  }
  // Each model's known repair forms at +/-10%; independent algebra assertions
  // live in the pure-model suites, rather than comparing two identical routes.
  for(const [key,profile]of Object.entries(calibration.profiles)) {
    const ms=rows.filter(r=>modelKey(r.model)===key);const control=ms.find(r=>r.diagnostics.calls===true&&r.diagnostics.touch===true&&r.diagnostics.originalScreen===true);
    if(!control)continue;const device=catalog.get(key+'|'+storageKey(control.storage))!;
    for(const factor of [.9,1.1]) {reference=Math.round(control.reference!*factor);const q=await service.quote({...device,diagnostics:control.diagnostics});
      const expected=evaluateRunner(profile,reference,control.diagnostics,control.storage);if(!q.ok||q.internal.cashifyConditionEquivalent!==expected.price)throw new Error('Reference-move service mismatch');moves.push({model:profile.model,factor});}
  }
  const heldout:any[]=[],holdoutRefused:any[]=[];
  for(const[key,profile]of Object.entries(calibration.profiles)) {
    const ms=rows.filter(r=>modelKey(r.model)===key);const storages=[...new Set(ms.map(r=>r.storage))];if(storages.length<2)continue;
    const donors=new Set(Object.values(profile.rules).map(r=>r.inferredFrom).filter(Boolean));
    const family=series;

    if(all.some(r=>modelKey(r.model)===key&&!r.complete))for(const p of Object.values(calibration.profiles).filter(p=>modelKey(p.model)!==key&&family(p.model)===family(profile.model)&&(!profile.hasAge||p.hasAge))
      .sort((a,b)=>Math.abs(generation(a.model)-generation(profile.model))-Math.abs(generation(b.model)-generation(profile.model))).slice(0,3))donors.add(p.model);
    for(const storage of storages) {
      const training=all.filter(r=>r.primary&&((modelKey(r.model)===key&&r.storage!==storage)||donors.has(r.model)));
      let fitted:RunnerCalibration|undefined;let fitError:string|undefined;
      try{fitted=fitCalibration(training,brand,calibration);}catch(error:any){fitError=error.message;}
      for(const row of ms.filter(r=>r.storage===storage)) {
        try{if(!fitted)throw new Error(fitError);const q=evaluateRunner(fitted.profiles[key],row.reference!,row.diagnostics,row.storage);
          heldout.push({model:row.model,storage,caseId:row.caseId,error:q.price-row.base!,source:row.source});}
        catch(error:any){holdoutRefused.push({model:row.model,storage,caseId:row.caseId,reason:error.message,source:row.source});}
      }
    }
  }
  const numeric=statistics(heldout);const denominator=heldout.length+holdoutRefused.length;
  const holdout={...numeric,count:denominator,numericPredictions:heldout.length,refused:holdoutRefused.length,within20:denominator?heldout.filter(r=>Math.abs(r.error)<=20).length/denominator:null};
  const summary={brand,sourceRows:all.length,primaryQuoted:rows.length,replay:statistics(replay),byFormat:Object.fromEntries(['A','B','C'].map(f=>[f,statistics(replay.filter(r=>r.format===f))])),refusals,
    noOffer:{count:noOffer.length,manual:noOffer.filter(r=>r.manual).length},holdout,moves:moves.length,over300:heldout.filter(r=>Math.abs(r.error)>300),holdoutRefused,
    gates:{replay:refusals.length===0&&replay.every(r=>Math.abs(r.error)<=20),noOffer:noOffer.every(r=>r.manual),holdout:brand==='Google'&&denominator===0?null:(holdout.within20??0)>=.95},
    method:'Primary source chosen by observation date; same-day ties prefer JSON-backed reports. Forms (including fallback forms) frozen from full-corpus discovery; all coefficients and normalization anchors refitted on training-only storage rows. Refusals count as holdout misses; MAE is over numerical predictions only.'};
  fs.mkdirSync(`${dir}/validation`,{recursive:true});fs.writeFileSync(`${dir}/validation/summary.json`,JSON.stringify(summary,null,2));
  for(const[name,data]of [['replay',replay],['heldout',heldout],['no-offer',noOffer]] as const)fs.writeFileSync(`${dir}/validation/${name}.jsonl`,data.map(r=>JSON.stringify(r)).join('\n')+'\n');
  return summary;
}
if(require.main===module)validateXiaomiOthers(process.argv[2] as any).then(s=>{console.log(JSON.stringify({brand:s.brand,replay:s.replay,byFormat:s.byFormat,noOffer:s.noOffer,holdout:s.holdout,gates:s.gates}));if(!Object.values(s.gates).filter(g=>g!==null).every(Boolean))process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1;});
