import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { zipMembers, importRunnerData, normalizeModel, diagnosticsForLabel, functional, physical, initial, accessories, ages, foldBranches, type Brand, type RunnerMeasurement } from './import-cashify-runner-data';
import { modelKey, storageKey, runnerFaults, runnerAge } from '../../lib/pricing/cashifyRunnerModel/model';
import type { DiagnosticsType } from '../../lib/pricingCalculator';

const hash = (b: Buffer|string) => createHash('sha256').update(b).digest('hex');
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const number = (s: string) => Number(s.replace(/,/g,''));
function date(text: string) {
  const iso=text.match(/(?:observed|date)[^\n]*?(2026-\d\d-\d\d)/i)?.[1]; if(iso)return iso+'T00:00:00Z';
  const m=text.match(/(\d{1,2})\s+(October|November)\s+2026/i); check(m,'Report observation date missing');
  return `2026-${m[2].toLowerCase()==='october'?'10':'11'}-${m[1].padStart(2,'0')}T00:00:00Z`;
}
const modelPattern = /Samsung Galaxy[^\n:]*?\(\d+\s*GB\s*\/\s*\d+\s*(?:GB|TB)\)/gi;
export function diagnosticsFromReport(block: string): {diagnostics: DiagnosticsType; offered: string[]; hasAge: boolean} {
  const d=diagnosticsForLabel('Flawless',[],false);
  let initialCount=0;
  for(const [label,field] of Object.entries(initial)) {
    const m=block.match(new RegExp(escape(label)+'[^\\n]*\\n[\\s\\S]{0,400}?(?:^|\\n)(?:Answer:\\s*)?(Yes|No)\\s*(?:\\n|$)','im'));
    if(m){(d as any)[field]=m[1].toLowerCase()==='yes';initialCount++;}
  }
  if(!initialCount) {
    for(const [label,field] of [['Calls working','calls'],['Touch working','touch'],['Original screen','originalScreen']] as const){const m=block.match(new RegExp('^'+label+':\\s*(Yes|No)','im'));if(m)(d as any)[field]=m[1].toLowerCase()==='yes';}
    for(const[label,field]of [['Manufacturer warranty (initial selection)','warranty'],['GST valid bill with same IMEI (initial selection)','validBill']] as const){const m=block.match(new RegExp('^'+escape(label)+':\\s*(Yes|No)','im'));if(m)(d as any)[field]=m[1].toLowerCase()==='yes';}
    for(const label of ['Screen condition','Body scratches','Body dents']) {const value=block.match(new RegExp('^'+label+':\\s*([^\\n]+)','im'))?.[1].trim();if(value&&!/^None/i.test(value)){check(physical[value],`Unknown table condition: ${value}`);(d as any)[physical[value]]=value;}}
    const faults=block.match(/^Functional faults:\s*([^\n]+)/im)?.[1].trim();if(faults&&!/^None/i.test(faults))for(const value of faults.split(';').map(s=>s.trim())){check(functional[value],`Unknown table fault: ${value}`);d.hardware.push(functional[value]);}
    const age=block.match(/^Age selected:\s*([^\n]+)/im)?.[1].trim();if(age&&ages[age])d.mobileAge=ages[age];
  }
  for(const [label,field] of Object.entries(physical)) if(new RegExp('^'+escape(label)+'\\s*:\\s*Selected\\b','im').test(block))(d as any)[field]=label;
  for(const [label,code] of Object.entries(functional)) if(new RegExp('^'+escape(label)+'\\s*:\\s*Selected\\b','im').test(block))d.hardware.push(code);
  const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const knownLabels=[...Object.keys(physical),...Object.keys(functional),...Object.keys(accessories),...Object.keys(ages),...Object.keys(foldBranches),
    'Broken/scratch on device screen','Dead Spot/Visible line and Discoloration on screen','Scratch/Dent on device body','Device panel missing/broken'].map(normalize);
  for(const match of block.matchAll(/^([^\n:]+)\s*:\s*Selected\b/gmi)) {
    const label=normalize(match[1].trim());check(knownLabels.includes(label),`Unknown selected report label: ${match[1]}`);
    const fold=Object.entries(foldBranches).find(([key])=>normalize(key)===label)?.[1];if(fold)d.hardware.push(fold);
  }
  d.hardware=[...new Set(d.hardware)];
  const offered:string[]=[];
  for(const[label,code]of Object.entries(accessories)) {
    const m=block.match(new RegExp('^'+escape(label)+'\\s*:\\s*([^\\n]+)','im'));
    if(m&&!/not (?:present|offered|shown|asked)|not applicable|absent/i.test(m[1])) {offered.push(code);if(/^Selected|^Yes\b/i.test(m[1]))d.accessories.push(code);}
  }
  if(!offered.length && /Original box with same IMEI:\s*(Yes|No)/i.test(block)) {offered.push('box');if(/Original box with same IMEI:\s*Yes/i.test(block))d.accessories=['box'];}
  for(const[label,value]of Object.entries(ages))if(new RegExp('^'+escape(label)+'\\s*:\\s*Selected\\b','im').test(block))d.mobileAge=value;
  const hasAge=d.warranty!==null;
  check(d.calls!==null && d.touch!==null && d.originalScreen!==null,'Report has incomplete initial diagnostics');
  check(offered.length>0,'Report accessory path missing');
  if(hasAge&&!d.mobileAge&&!/Not asked|Skipped/i.test(block))throw new Error('Report age answer missing');
  return {diagnostics:d,offered,hasAge};
}
export function parseDetailedReport(text: string, source: RunnerMeasurement['source']): RunnerMeasurement[] {
  const headers=[...text.matchAll(/^(?:For example\s*:\s*|CASE\s+)([A-Z]?\d+)[ \t]*(?:\)|$)[ \t]*(.*)$/gmi)];
  const rows:RunnerMeasurement[]=[];
  for(let i=0;i<headers.length;i++) {
    const h=headers[i],start=h.index!,end=headers[i+1]?.index??text.length,block=text.slice(start,end);
    const priceStart=block.search(/^(?:OBSERVED CASHIFY QUOTE|(?:Cashify(?:['’]s)?\s+)?Selling price)/im);
    const models=[...block.slice(0,priceStart<0?block.length:priceStart).matchAll(modelPattern)];
    const raw=models[0]?.[0] ?? [...text.slice(0,start).matchAll(modelPattern)].at(-1)?.[0];
    check(raw,`Report case ${h[1]} missing model`);
    const identity=normalizeModel(raw.replace(/^samsung galaxy/i,'Samsung Galaxy'),'Samsung');
    const amount=(pattern: string)=>{const m=block.match(new RegExp(pattern+'\\s*:\\s*(?:[-−]\\s*)?(?:₹|INR)\\s*([\\d,]+)','im'));return m?number(m[1]):null;};
    const selling=amount("^(?:Cashify(?:['’]s)?\\s+)?Selling price(?:\\s+shown)?");
    let base=amount('^(?:Price Summary[^:\\n]*[—-]\\s*)?Base Price');
    const total=amount('^(?:Total Amount(?: shown)?|Total payout)');
    const fee=amount('^Processing [Ff]ee'),imei=amount('^IMEI (?:Validation )?[Ff]ee');
    let status:RunnerMeasurement['status']='quoted';
    if(selling===null)status=/very little value|no.?offer|no monetary offer/i.test(block)?'no_offer':/pending|not yet (?:verified|tested)|not completed/i.test(block)?'pending':'not_applicable';
    if(status==='quoted') {
      if(base===null && /IMEI Validation Fee\s*\u20b920/.test(text.slice(0,3500)))base=selling!+20;
      check(base!==null,`Report base and normalization fee missing ${source.folder} ${h[1]}`);
      if(total!==null||fee!==null||imei!==null)check(total!==null&&fee!==null&&imei!==null&&base - selling! === imei && selling! - fee === total,`Report arithmetic mismatch ${source.folder} ${h[1]}`);
    }
    const parsed=status==='quoted'||status==='no_offer'?diagnosticsFromReport(block):null;
    const baseline=amount('^(?:Flawless (?:Selling price(?: for this variant)?|selling-price baseline))');
    rows.push({brand:'Samsung',...identity,rawModel:raw,caseId:h[1],label:h[2].trim(),status,diagnostics:parsed?.diagnostics??diagnosticsForLabel('Flawless',[],false),answerPath:[],
      ageAsked:!!parsed?.diagnostics.mobileAge,ageSelected:parsed?.diagnostics.mobileAge??null,offeredAccessories:parsed?.offered??[],hasAge:parsed?.hasAge??false,
      reference:baseline!==null?baseline+20:null,base,selling,processingFee:fee,imeiFee:imei,total,deduction:null,observedAt:status==='pending'?null:date(block+'\n'+text.slice(0,Math.min(start,1500))),
      source:{...source,caseId:h[2].match(/raw (?:case )?index (\d+)/i)?.[1]??h[1],line:text.slice(0,start).split('\n').length},variantUrl:'',complete:!/INCOMPLETE|partial verified|66.of.153|120.of.153/i.test(source.folder)});
  }
  check(headers.length>0,'No detailed cases in report');
  for(const row of rows)if(row.reference===null)row.reference=rows.find(r=>r.model===row.model&&r.storage===row.storage&&r.status==='quoted'&&(/^(?:Flawless|baseline)/i.test(r.label)||(!r.label&&r.diagnostics.calls&&r.diagnostics.touch&&r.diagnostics.originalScreen&&!r.diagnostics.hardware.length&&r.diagnostics.accessories.includes('box')&&!r.diagnostics.screenCondition&&!r.diagnostics.bodyScratches&&!r.diagnostics.bodyDents&&(!r.hasAge||r.diagnostics.mobileAge==='below3'))))?.base??null;
  for(const row of rows)if(row.status==='quoted'){check(row.reference!==null,`Report baseline absent ${source.folder} ${row.model} ${row.storage} ${row.caseId}`);row.deduction=row.reference!-row.base!;}
  return rows;
}

/** Sources remain private; only fitted parameters and aggregate reports are public. */
export function importArchives(input:string,brand:'Samsung'|'Google',out:string) {
  const archive=zipMembers(fs.readFileSync(input));const inventory:any[]=[...archive].map(([file,bytes])=>({file,sha256:hash(bytes),bytes:bytes.length,ignored:file.endsWith('/desktop.ini')||file.endsWith('/diagnostic.json')}));const measurements:RunnerMeasurement[]=[];
  const scratch=path.join('pricing-inputs','samsung-pixel-import',brand);fs.mkdirSync(scratch,{recursive:true});
  const roots=[...archive.keys()].filter(n=>n.endsWith('/checkpoint.json')).map(n=>n.slice(0,-16));
  for(const [i,root]of roots.entries()) {
    const dir=path.join(scratch,String(i));fs.mkdirSync(dir,{recursive:true});
    for(const[n,b]of archive)if(path.posix.dirname(n)===root){inventory.push({file:n,sha256:hash(b),bytes:b.length,ignored:n.endsWith('/diagnostic.json')});if(!n.endsWith('/diagnostic.json'))fs.writeFileSync(path.join(dir,path.posix.basename(n)),b);}
    const imported=importRunnerData(dir,{brand});
    for(const row of imported.measurements){row.source.folder=root;row.source.format='A';measurements.push(row);}
  }
  const reportHashes=new Set<string>();
  for(const[n,b]of archive)if(n.endsWith('.zip')&&!n.endsWith('/Cashify_Test_Results.zip')) {
    const duplicate=reportHashes.has(hash(b));inventory.push({file:n,sha256:hash(b),bytes:b.length,duplicate});if(duplicate)continue;reportHashes.add(hash(b));
    const members=zipMembers(b);const format=members.has('verified_observations.json')?'B':'C';
    for(const[k,v]of members)inventory.push({file:n+'!/'+k,sha256:hash(v),bytes:v.length});
    let reportCount=0;const firstRow=measurements.length;
    if(members.has('canonical_questionnaire_reference.json')) {
      const canonical=JSON.parse(members.get('canonical_questionnaire_reference.json')!.toString('utf8'));
      const bytes=members.get('verified_observations.json')!,observations=JSON.parse(bytes.toString('utf8'));
      const readme=members.get('README_INCOMPLETE.txt')!.toString('utf8');
      for(const[key,storage]of [['R','12 GB/256 GB'],['S','12 GB/512 GB']])for(const[qId,q]of observations[key].entries())if(q){
        const label=canonical.cases[qId].label;const d=diagnosticsForLabel(label,['box'],true);
        const reference=observations[key][0].base;
        measurements.push({brand:'Samsung',model:'Samsung Galaxy Z Flip 7',rawModel:'Samsung Galaxy Z Flip 7',storage,caseId:String(qId),label,status:'quoted',
          diagnostics:d,answerPath:[],ageAsked:!q.ageSkipped,ageSelected:q.ageSkipped?null:'below3',offeredAccessories:['box'],reference,base:q.base,selling:q.quote,
          processingFee:q.quote-q.total,imeiFee:q.base-q.quote,total:q.total,deduction:reference-q.base,observedAt:date(q.observed_date+'\n'+readme),
          source:{folder:n,file:'verified_observations.json',caseId:String(qId),sha256:hash(bytes),format:'B'},variantUrl:'',hasAge:true,complete:false});
      }
      reportCount++;
    }
    for(const[k,v]of members)if(k.endsWith('.txt')&&!/README/i.test(k)) {
      const source={folder:n,file:k,caseId:'',sha256:hash(v),format} as const;
      measurements.push(...parseDetailedReport(v.toString('utf8'),source));reportCount++;
    }
    if(!reportCount)throw new Error('Report archive has no parsed report: '+n);
    if(members.has('verified_observations.json')&&!members.has('canonical_questionnaire_reference.json')) {
      const verified=JSON.parse(members.get('verified_observations.json')!.toString('utf8'));
      const actual=measurements.slice(firstRow);
      const used=new Set<RunnerMeasurement>();
      for(const[storage,values]of Object.entries(verified) as [string,any[]][])for(const[index,q]of values.entries())if(q) {
        check(q.selectionChecks!==false,'Unverified report selection');
        // Labels/answers come from the complete text cases, never guessed from
        // an unlabeled JSON array position. Check the monetary multiset only.
        const row=actual.find(r=>!used.has(r)&&storageKey(r.storage)===storageKey(storage)&&(q.quote??null)===r.selling&&(q.base??null)===r.base&&(q.total??null)===r.total);
        check(row,`Report JSON monetary mismatch ${n} ${storage} ${index}`);used.add(row);
      }
    }
  }
  reconcile(measurements);
  const counts=(xs:RunnerMeasurement[])=>Object.fromEntries(['quoted','pending','no_offer','not_applicable'].map(status=>[status,xs.filter(r=>r.status===status).length]));
  const summary={brand,observations:measurements.length,counts:counts(measurements),primary:counts(measurements.filter(r=>r.primary)),byFormat:Object.fromEntries(['A','B','C'].map(f=>[f,counts(measurements.filter(r=>r.source.format===f))])),variants:new Set(measurements.map(r=>modelKey(r.model)+'|'+storageKey(r.storage))).size,
    sellingOnly:measurements.filter(r=>r.status==='quoted'&&r.total===null).length,
    disagreements:measurements.filter(r=>!r.primary&&r.status==='quoted').map(r=>{const p=measurements.find(m=>m.primary&&m.source.sha256===r.supersededBy&&m.model===r.model&&m.storage===r.storage&&signature(m)===signature(r));return p&&p.base!==r.base?{model:r.model,storage:r.storage,caseId:r.source.caseId,oldBase:r.base,newBase:p.base,oldDate:r.observedAt,newDate:p.observedAt}:null;}).filter(Boolean)};
  fs.mkdirSync(out,{recursive:true});for(const[name,value]of [['summary',summary],['inventory',inventory]] as const)fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(path.join(out,'measurements.jsonl'),measurements.map(r=>JSON.stringify(r)).join('\n')+'\n');return summary;
}
function signature(row:RunnerMeasurement) {
  const d=row.diagnostics;
  return JSON.stringify({faults:runnerFaults(d).sort(),warranty:d.warranty,bill:d.validBill,age:row.hasAge?runnerAge(d.mobileAge):null,accessories:[...d.accessories].sort()});
}
function reconcile(rows:RunnerMeasurement[]) {
  const groups=new Map<string,RunnerMeasurement[]>();
  for(const row of rows){const key=modelKey(row.model)+'|'+storageKey(row.storage)+'|'+signature(row)+(row.status==='pending'||row.status==='not_applicable'?'|'+row.caseId:'');groups.set(key,[...groups.get(key)??[],row]);}
  for(const group of groups.values()){group.sort((a,b)=>(b.observedAt??'').localeCompare(a.observedAt??'') || Number(b.source.format==='A')-Number(a.source.format==='A'));group.forEach((row,i)=>{row.primary=i===0&&!row.observedAt?.startsWith('2026-10');if(i)row.supersededBy=group[0].source.sha256;});}
}
if(require.main===module){const args=process.argv.slice(2);const {disagreements,...summary}=importArchives(args[0],args[1] as 'Samsung'|'Google',args[2]);console.log(JSON.stringify({...summary,disagreementCount:disagreements.length}));}
