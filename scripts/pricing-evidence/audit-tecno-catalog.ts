import fs from 'node:fs';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { modelKey, storageKey } from '../../lib/pricing/cashifyRunnerModel/model';
import { runnerStorageIdentity } from '../../lib/pricing/cashifyRunnerModel/identity';
import { deviceKey } from '../../lib/referencePricing/types';
import type { RunnerMeasurement } from './import-cashify-runner-data';
const brands=['Tecno'];
const audit=JSON.parse(fs.readFileSync('release-test-logs/tecno/reference-audit.json','utf8'));
const additions:any[]=[];const results:any[]=[];
for(const brand of brands){
 const rows:RunnerMeasurement[]=fs.readFileSync(`data/pricing-evidence/${brand.toLowerCase()}-2026-11-21/measurements.jsonl`,'utf8').trim().split('\n').map(line=>JSON.parse(line));
 const variants=[...new Map(rows.filter(r=>r.status==='quoted').map(r=>[modelKey(r.model)+'|'+storageKey(r.storage),r])).values()];
 const cat=SEED_DEVICES.filter(d=>d.brand===brand);
 const identity=(d:any)=>modelKey(d.model)+'|'+runnerStorageIdentity(d.storage,d.ram);
 const missing=variants.filter(r=>!cat.some(d=>identity(d)===modelKey(r.model)+'|'+storageKey(r.storage)));
 for(const r of missing) {if(!/^https:\/\/www\.cashify\.in\//.test(r.variantUrl))throw new Error('Missing exact Cashify URL');additions.push({id:(r.model+' '+r.storage).toLowerCase().replace(/[^a-z0-9]+/g,'-'),brand,model:r.model,storage:r.storage,ram:r.storage.split('/')[0],color:'Default',referencePriceStatus:'pending',cashifyLink:r.variantUrl});}
 const refs=audit.references.filter((r:any)=>String(r.brand).toLowerCase()===brand.toLowerCase());const profiles=audit.profiles.filter((r:any)=>String(r.brand).toLowerCase()===brand.toLowerCase());
 results.push({brand,catalogBefore:cat.length,dataVariants:variants.length,additions:missing.map(r=>({model:r.model,storage:r.storage})),catalogWithoutData:cat.filter(d=>!variants.some(r=>identity(d)===modelKey(r.model)+'|'+storageKey(r.storage))).map(d=>({id:d.id,model:d.model,storage:d.storage})),referenceRows:refs.length,statuses:Object.fromEntries([...new Set(refs.map((r:any)=>r.status))].map(status=>[String(status),refs.filter((r:any)=>r.status===status).length])),profiles:profiles.length,dataWithoutProfile:[...new Set(variants.filter(r=>!profiles.some((p:any)=>modelKey(p.model)===modelKey(r.model))).map(r=>r.model))],dataWithoutReference:variants.filter(r=>!refs.some((p:any)=>identity(p)===modelKey(r.model)+'|'+storageKey(r.storage))).map(r=>({model:r.model,storage:r.storage}))});
}
if(process.argv.includes('--write')){const file='lib/seed_devices.ts';const source=fs.readFileSync(file,'utf8');fs.writeFileSync(file,source.replace(/\r?\n\];\s*$/,',\n'+additions.map(d=>JSON.stringify(d,null,2).split('\n').map(line=>'  '+line).join('\n')).join(',\n')+'\n];\n'));}
fs.writeFileSync('release-test-logs/tecno/catalog-reference-summary.json',JSON.stringify({at:audit.at,readOnly:audit.readOnly,results,unbranded:SEED_DEVICES.map((d,index)=>!d.brand?{index,keys:Object.keys(d)}:null).filter(Boolean)},null,2));
console.log(JSON.stringify(results.map(r=>({brand:r.brand,added:r.additions.length,noData:r.catalogWithoutData.length,references:r.referenceRows,statuses:r.statuses,profiles:r.profiles,noProfile:r.dataWithoutProfile.length,noReference:r.dataWithoutReference.length}))));
