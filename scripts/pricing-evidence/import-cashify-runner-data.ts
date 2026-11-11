import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import type { DiagnosticsType } from '../../lib/pricingCalculator';

type Brand = 'Nothing' | 'OnePlus';
export interface RunnerMeasurement {
  brand: Brand; model: string; rawModel: string; storage: string; caseId: string; label: string;
  status: 'quoted' | 'pending'; diagnostics: DiagnosticsType; answerPath: any[];
  ageAsked: boolean; ageSelected: string | null; offeredAccessories: string[]; reference: number;
  base: number | null; selling: number | null; processingFee: number | null; imeiFee: number | null;
  total: number | null; deduction: number | null; observedAt: string;
  source: { folder: string; file: string; caseId: string; sha256: string };
  variantUrl: string; hasAge: boolean; complete: boolean;
}
const functional: Record<string,string> = {
  'Front Camera not working':'front_camera', 'Back Camera not working':'back_camera',
  'Volume Button not working':'volume', 'Finger Touch not working':'fingerprint',
  'WiFi not working':'wifi', 'Battery Faulty':'battery_service', 'Speaker Faulty':'speaker',
  'Power Button not working':'power', 'Charging Port not working':'charging',
  'Face Sensor not working':'face', 'Silent Button not working':'silent',
  'Audio Receiver not working':'audio_receiver', 'Camera Glass Broken':'camera_glass',
  'Bluetooth not working':'bluetooth', 'Vibrator is not working':'vibrator',
  'Microphone not working':'microphone', 'Proximity Sensor not working':'proximity',
  'Outer screen damaged/line/broken or spot':'outer_screen', 'Hinges stuck/loose or broken':'hinge'
};
const physical: Record<string,keyof DiagnosticsType> = {};
for (const [key, values] of Object.entries({
  screenCondition:['Screen cracked/ glass broken','Chipped/cracked outside display area','More than 2 scratches on screen','1-2 scratches on screen'],
  screenSpots:['Large/ heavy visible spots on screen','3 or more minor spots on screen','1-2 minor spots on screen','No spots on screen'],
  screenLines:['Visible line(s) on display','Display faded along edges','No line(s) on Display'],
  screenDiscoloration:['Major Discoloration','Minor Discoloration','No Discoloration'],
  bodyScratches:['More than 2 scratches','1-2 scratches','No scratches'],
  bodyDents:['Major dent(s) or more than 2','1-2 minor dents','No dents'],
  bodyPanel:['Cracked/ broken side or back panel','Missing side or back panel','No defect on side or back panel'],
  bodyBent:['Bent/ curved panel','Loose screen (Gap in screen and body)','Phone not bent']
})) for (const value of values) physical[value] = key as keyof DiagnosticsType;
const groups: Record<string,string> = {
  'Broken/scratch on device screen':'screen_scratch',
  'Dead Spot/Visible line and Discoloration on screen':'screen_spot',
  'Scratch/Dent on device body':'body_scratch', 'Device panel missing/broken':'panel_missing'
};
const initial: Record<string,keyof DiagnosticsType> = {
  'Are you able to make and receive calls?':'calls', "Is your device's touch screen working properly?":'touch',
  "Is your phone's screen original?":'originalScreen', 'Is your device under manufacturer warranty?':'warranty',
  'Do you have GST valid bill with the same IMEI?':'validBill'
};
const accessories: Record<string,string> = { 'Original Box with same IMEI':'box', 'Original Charger of Device':'charger' };
const ages: Record<string,string> = { 'Below 3 months':'below3', '3 months - 6 months':'3to6', '6 months - 11 months':'6to11', 'Above 11 months':'above11' };
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function sha(bytes: Buffer) { return createHash('sha256').update(bytes).digest('hex'); }
function known(value: string, map: Record<string,unknown>) { check(Object.hasOwn(map,value), 'Unknown questionnaire label/option'); }
function labelKnown(label: string) {
  if (label === 'Flawless baseline' || label === 'All offered accessories missing') return;
  if (label.endsWith(': no defects')) { known(label.slice(0,-12),groups); return; }
  if (label.endsWith(' \u2014 No')) { known(label.slice(0,-5),initial); return; }
  if (label.endsWith(' missing')) { known(label.slice(0,-8),accessories); return; }
  check(Object.hasOwn(functional,label) || Object.hasOwn(physical,label) || Object.hasOwn(ages,label), 'Unknown case label');
}
/** Read central-directory entries without extracting or executing archive members. */
function zipMembers(bytes: Buffer): Map<string,Buffer> {
  let end = bytes.length - 22;
  while (end >= Math.max(0,bytes.length-65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  check(end >= 0 && bytes.readUInt32LE(end) === 0x06054b50, 'Invalid ZIP directory');
  const count = bytes.readUInt16LE(end+10); let offset = bytes.readUInt32LE(end+16);
  const result = new Map<string,Buffer>();
  for (let i=0;i<count;i++) {
    check(bytes.readUInt32LE(offset) === 0x02014b50, 'Invalid ZIP entry');
    const flags=bytes.readUInt16LE(offset+8), method=bytes.readUInt16LE(offset+10), size=bytes.readUInt32LE(offset+20), expanded=bytes.readUInt32LE(offset+24);
    const nameLength=bytes.readUInt16LE(offset+28), extra=bytes.readUInt16LE(offset+30), comment=bytes.readUInt16LE(offset+32), local=bytes.readUInt32LE(offset+42);
    const name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8');
    check(!(flags & 1) && [0,8].includes(method) && expanded < 100_000_000, 'Unsupported ZIP entry');
    check(!result.has(name), 'Duplicate ZIP entry');
    check(bytes.readUInt32LE(local) === 0x04034b50,'Invalid ZIP local entry');
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    const compressed=bytes.subarray(start,start+size);
    const data=method === 8 ? inflateRawSync(compressed,{maxOutputLength:100_000_000}) : compressed;
    check(data.length===expanded,'ZIP length mismatch'); result.set(name,data);
    offset += 46+nameLength+extra+comment;
  }
  return result;
}
function csvRows(text: string): Record<string,string>[] {
  const rows: string[][]=[]; let row:string[]=[], field='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"') {field+='"';i++;} else quoted=!quoted; }
    else if(c===','&&!quoted) {row.push(field);field='';}
    else if(c==='\n'&&!quoted) {row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  check(!quoted,'Unclosed CSV quote');const keys=rows.shift()!;
  return rows.filter(r=>r.some(Boolean)).map(r=>{check(r.length===keys.length,'CSV column mismatch');return Object.fromEntries(keys.map((k,i)=>[k,r[i]]));});
}
function normalizeModel(raw: string, brand: Brand) {
  const match=raw.match(/^(.*?)\s*\((\d+\s*GB\s*\/\s*\d+\s*GB)\)$/i);
  check(match,'Unrecognized model/storage format');
  let model=match[1].trim().replace(/^Oneplus\b/i,'OnePlus');
  if(brand==='Nothing') {model=model.replace(/^CMF Phone /i,'CMF by Nothing Phone ');check(/^(Nothing |CMF by Nothing )/.test(model),'Wrong brand model');}
  else check(model.startsWith('OnePlus '),'Wrong brand model');
  return { model, storage:match[2].replace(/\s*\/\s*/,'/').replace(/gb/gi,'GB') };
}
function normalizeAnswers(answers:any[], schema:any) {
  const d:DiagnosticsType={ calls:null,touch:null,originalScreen:null,defects:[],screenCondition:null,screenSpots:null,screenLines:null,screenDiscoloration:null,bodyScratches:null,bodyDents:null,bodyPanel:null,bodyBent:null,hardware:[],accessories:[],warranty:null,validBill:null,eSim:null,mobileAge:null };
  let ageAsked=false,ageSelected:string|null=null;
  for(const a of answers) {
    check(Array.isArray(a.selected)&&Array.isArray(a.options),'Invalid answer stage');
    for(const s of a.selected) check(a.options.includes(s),'Selected option absent from options');
    check(a.verified !== false,'Unverified answer');
    if(a.stage==='initial') {
      check(a.questions.length===a.selected.length && a.responses.length===a.questions.length,'Initial answer mismatch');
      for(const option of a.options) check(['Yes','No'].includes(option),'Unknown initial option');
      a.questions.forEach((q:string,i:number)=>{known(q,initial);check(a.responses[i].question===q&&a.responses[i].answer===a.selected[i],'Initial response mismatch');(d as any)[initial[q]]=a.selected[i]==='Yes';});
    } else if(a.stage==='groups') {for(const o of a.options)known(o,groups);d.defects=a.selected.map((s:string)=>groups[s]);}
    else if(a.stage==='branch') {known(a.group,groups);for(const o of a.options)known(o,physical);for(const s of a.selected)(d as any)[physical[s]]=s;}
    else if(a.stage==='functional') {for(const o of a.options)known(o,functional);d.hardware=a.selected.map((s:string)=>functional[s]);}
    else if(a.stage==='accessories') {for(const o of a.options)known(o,accessories);d.accessories=a.selected.map((s:string)=>accessories[s]);d.box=d.accessories.includes('box');d.charger=d.accessories.includes('charger');}
    else if(a.stage==='age') {for(const o of a.options)known(o,ages);check(a.selected.length<=1,'Multiple age answers');ageAsked=a.selected.length===1;check(a.asked!==true||ageAsked,'Age marked asked without selection');check(a.asked!==false||!ageAsked,'Age marked skipped with selection');ageSelected=a.selected[0]??null;d.mobileAge=ageSelected?ages[ageSelected]:null;}
    else throw new Error('Unknown answer stage');
  }
  return {diagnostics:d, ageAsked,ageSelected};
}
export function importRunnerData(input: string, options: {brand:Brand;out?:string;requireMirror?:boolean}) {
  check(['Nothing','OnePlus'].includes(options.brand),'Unknown brand');
  const measurements:RunnerMeasurement[]=[]; const inventory:any[]=[];const variants:any[]=[];
  const folders=fs.existsSync(path.join(input,'checkpoint.json')) ? ['.'] : fs.readdirSync(input,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
  check(folders.length>0,'No model folders');
  for(const folder of folders) {
    const dir=path.join(input,folder), files=new Map<string,Buffer>();
    for(const f of fs.readdirSync(dir,{withFileTypes:true})) {
      check(f.isFile(),'Unexpected nested source directory');
      if(f.name==='diagnostic.json') {inventory.push({folder,file:f.name,ignored:true});continue;}
      const bytes=fs.readFileSync(path.join(dir,f.name)); files.set(f.name,bytes);inventory.push({folder,file:f.name,bytes:bytes.length,sha256:sha(bytes)});
    }
    const required=['results.json','results.csv','full_test_results.txt','checkpoint.json'];
    for(const f of required)check(files.has(f),'Missing required runner file');
    const zip=files.get('Cashify_Test_Results.zip');
    check(zip||options.requireMirror===false,'Missing mirror ZIP');
    if(zip) {const entries=zipMembers(zip);for(const f of required){const matches=[...entries].filter(([name])=>path.posix.basename(name)===f);check(matches.length===1&&matches[0][1].equals(files.get(f)!),'ZIP mirror mismatch');inventory.push({folder,file:`Cashify_Test_Results.zip!/${matches[0][0]}`,bytes:matches[0][1].length,sha256:sha(matches[0][1]),mirror:true});}}
    const rows:any[]=JSON.parse(files.get('results.json')!.toString('utf8'));
    const checkpoint=JSON.parse(files.get('checkpoint.json')!.toString('utf8'));
    const csv=csvRows(files.get('results.csv')!.toString('utf8'));
    // Text reports embed a clean JSON result object after each answer path. Extract only those objects.
    const text=files.get('full_test_results.txt')!.toString('utf8');
    const textRows=[...text.matchAll(/\{\s*"model"\s*:[\s\S]*?\n\}/g)].map(m=>JSON.parse(m[0]));
    check(rows.length===csv.length && rows.length===textRows.length,'Cross-file row count mismatch');
    const keys=['base','selling','imei_fee','processing_fee','total','deduction','total_reduction'];
    const index=(list:any[])=>new Map(list.map(r=>[`${r.model}|${r.case_id}`,r]));
    const ci=index(csv),ti=index(textRows),ri=index(rows);check(ri.size===rows.length,'Duplicate result row');let seen=0;
    for(const [url,v] of Object.entries(checkpoint.variants) as [string,any][]) {
      const baseline=v.results.baseline;check(baseline?.quote?.status==='quoted','Variant missing priced baseline');
      const hasPending=Object.values(v.results).some((r:any)=>r.quote.status==='pending');
      const complete=v.complete===true;
      check(v.final_control_matches!==false&&v.healthy_controls_match!==false,'Control mismatch');
      if(!hasPending)check(complete&&v.final_control_matches===true&&v.healthy_controls_match===true&&v.final_control,'Variant missing final control');
      const reference=baseline.quote.base;check(Number.isFinite(reference)&&reference>0,'Invalid baseline reference');
      const model=normalizeModel(v.model,options.brand);
      for(const q of v.schema.initial)known(q,initial);
      for(const g of v.schema.groups)known(g,groups);
      for(const branch of v.schema.branches) {known(branch.label,groups);for(const option of branch.options)known(option,physical);}
      if(v.final_control) {
        for(const key of ['status','base','selling','processing_fee','imei_fee','total']) check(v.final_control.quote[key]===baseline.quote[key],'Final control price mismatch');
        const control=normalizeAnswers(v.final_control.answers,v.schema);
        const clean=normalizeAnswers(baseline.answers,v.schema);
        check(JSON.stringify(control)===JSON.stringify(clean),'Final control answers mismatch');
      }
      for(const o of v.schema.functional)known(o,functional);
      for(const o of v.schema.accessories)known(o,accessories);
      for(const o of v.schema.ages)known(o,ages);
      variants.push({folder,...model,variantUrl:url,complete:complete&&!hasPending,pending:hasPending,hasAge:v.schema.ages.length>0,finalControlMatches:v.final_control_matches??null,healthyControlsMatch:v.healthy_controls_match??null});
      for(const [id,r] of Object.entries(v.results) as [string,any][]) {
        labelKnown(r.case.label);check(id===r.case.id,'Checkpoint case ID mismatch');
        const key=`${v.model}|${id}`,row=ri.get(key);check(row,'Checkpoint row absent from results');seen++;
        check(row.test===r.case.label && row.status===r.quote.status && row.observed_at===r.observed_at,'Checkpoint label/status/time mismatch');
        check(['quoted','pending'].includes(row.status),'Unknown quote status');
        const quoted=row.status==='quoted';
        for(const field of keys) {
          const value=row[field]??null;
          check(String(ci.get(key)?.[field]??'')===String(value??''),'CSV price mismatch');
          check((ti.get(key)?.[field]??null)===value,'Text price mismatch');
          if(!quoted)check(value===null,'Pending row has monetary value');
          if(['deduction','total_reduction'].includes(field))continue;
          check((r.quote[field]??null)===value,'Checkpoint price mismatch');
          if(quoted)check(Number.isFinite(value),'Missing quoted monetary value');else check(value===null,'Pending row has price');
        }
        if(quoted)check(row.total_reduction===baseline.quote.total-row.total&&row.base-row.selling===row.imei_fee&&row.imei_fee===20&&row.selling-row.processing_fee===row.total&&baseline.quote.selling-row.selling===row.deduction,'Quote arithmetic mismatch');
        if(quoted && (r.case.control===true || r.case.label.endsWith(': no defects'))) check(row.deduction===0,'Healthy control price mismatch');
        const answerPath=(r.answers??[]).map((a:any)=>Object.fromEntries(['stage','group','options','selected','verified','questions','responses','asked'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]])));
        for(const a of answerPath) {
          // Retain only questionnaire data, never arbitrary nested page snapshots.
          if(a.responses) a.responses=a.responses.map((response:any)=>({question:response.question,answer:response.answer}));
        }
        const normalized=normalizeAnswers(answerPath,v.schema);
        if(quoted) {
          for(const stage of ['initial','functional','accessories','age']) check(answerPath.filter((a:any)=>a.stage===stage).length===1,'Missing or duplicate quoted stage');
          check(JSON.stringify(answerPath.find((a:any)=>a.stage==='initial').questions)===JSON.stringify(v.schema.initial),'Initial schema mismatch');
        }
        check(typeof row.observed_at==='string'&&Number.isFinite(Date.parse(row.observed_at)),'Invalid observed time');
        measurements.push({brand:options.brand,...model,rawModel:v.model,caseId:id,label:r.case.label,status:row.status,...normalized,answerPath,offeredAccessories:v.schema.accessories.map((s:string)=>accessories[s]),reference,base:quoted?row.base:null,selling:quoted?row.selling:null,processingFee:quoted?row.processing_fee:null,imeiFee:quoted?row.imei_fee:null,total:quoted?row.total:null,deduction:quoted?row.deduction:null,observedAt:row.observed_at,source:{folder,file:'checkpoint.json',caseId:id,sha256:sha(files.get('checkpoint.json')!)},variantUrl:url,hasAge:v.schema.ages.length>0,complete:complete&&!hasPending});
      }
    }
    check(seen===rows.length,'Unmatched results row');
  }
  const summary={brand:options.brand,folders:folders.length,variants:variants.length,measurements:measurements.length,quoted:measurements.filter(m=>m.status==='quoted').length,pending:measurements.filter(m=>m.status==='pending').length,excluded:0,incompleteVariants:variants.filter(v=>!v.complete).length,mirrors:inventory.filter(i=>i.mirror).length,variantInventory:variants};
  if(options.out) {fs.mkdirSync(options.out,{recursive:true});fs.writeFileSync(path.join(options.out,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');fs.writeFileSync(path.join(options.out,'measurements.jsonl'),measurements.map(m=>JSON.stringify(m)).join('\n')+'\n');fs.writeFileSync(path.join(options.out,'summary.json'),JSON.stringify(summary,null,2)+'\n');}
  return {measurements,inventory,summary};
}
if(process.argv[1] && /import-cashify-runner-data\.(?:ts|js)$/.test(process.argv[1])) {
  const args=process.argv.slice(2),input=args[0],brand=args[args.indexOf('--brand')+1] as Brand,out=args[args.indexOf('--out')+1];
  check(input&&args.includes('--brand')&&args.includes('--out'),'Usage: import-cashify-runner-data.ts <folder> --brand <Nothing|OnePlus> --out <dir>');
  const {variantInventory,...counts}=importRunnerData(input,{brand,out}).summary;console.log(JSON.stringify(counts));
}
