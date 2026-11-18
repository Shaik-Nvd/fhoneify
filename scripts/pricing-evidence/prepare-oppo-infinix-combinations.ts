import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {cases as sharedCases} from './prepare-runner-combinations';
const cases:[string,object][]=[...sharedCases,['Flip outer screen + hinge',{hardware:['outer_screen','hinge']}],['Flip outer screen + Wi-Fi',{hardware:['outer_screen','wifi']}],['Flip hinge + panel cracked',{hardware:['hinge'],bodyPanel:'Cracked/ broken side or back panel'}]];
import {evaluateRunner,modelKey,runnerFaults} from '../../lib/pricing/cashifyRunnerModel/model';
import {InspectionRequiredError} from '../../lib/pricing/inspectionRequired';
const variants=[['Oppo','OPPO Reno12 Pro 5G','12 GB/256 GB'],['Oppo','OPPO F27 Pro Plus 5G','8 GB/128 GB'],['Oppo','OPPO Find N3 Flip 5G','12 GB/256 GB'],['Infinix','Infinix Hot 50 5G','8 GB/128 GB'],['Infinix','Infinix Note 40 5G','8 GB/256 GB'],['Infinix','Infinix Zero Flip 5G','8 GB/512 GB']];
const out='release-test-logs/oppo-infinix/frozen-combinations-v2';fs.mkdirSync(out,{recursive:true});
function freeze(file:string,bytes:Buffer){const target=`${out}/${file}`;if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw new Error('Frozen collection changed; version it');fs.writeFileSync(target,bytes);return createHash('sha256').update(bytes).digest('hex');}
const modelHash=freeze('model.ts.txt',fs.readFileSync('lib/pricing/cashifyRunnerModel/model.ts'));
for(const brand of ['Oppo','Infinix']) {
  const calibrationBytes=fs.readFileSync(`lib/pricing/cashifyRunnerModel/calibration.${brand.toLowerCase()}.json`);const calibration=JSON.parse(calibrationBytes.toString());
  const calibrationHash=freeze(`calibration.${brand.toLowerCase()}.json`,calibrationBytes);
  const dir=brand.toLowerCase()+'-2026-11-18';const rows=fs.readFileSync(`data/pricing-evidence/${dir}/measurements.jsonl`,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  const doc=[`# ${brand} combination collection`,'',`Frozen model SHA-256: ${modelHash}`,`Frozen calibration SHA-256: ${calibrationHash}`,'',
    'These are planned, inferred scenarios, not collected Cashify observations. Record a flawless control before and after each session, actual offered questions, all selected answers, reference, base/Selling/fees and date. Unavailable questions stay unavailable. Score the private frozen parameters at the newly observed reference before refitting. Keep previous snapshots.','',
    `Private snapshots and predictions: ${out}.`,'','| Model | Source storage |','|---|---|',...variants.filter(v=>v[0]===brand).map(v=>`| ${v[1]} | ${v[2]} |`),'',
    '| ID | Planned condition |','|---|---|',...cases.map(([label],i)=>`| C${String(i+1).padStart(2,'0')} | ${label.replace('Missing box and charger','All offered accessories missing')} |`),'',
    'Accessory rows omit only accessories actually offered; charger-only rows are not applicable if no charger question appears. S Pen remains present unless that row explicitly removes it. Do not reuse a stale accessory boolean. Known no-offer and unknown questions remain inspection outcomes, not zero prices.',''];
  const predictions:any[]=[];
  for(const[,model,storage]of variants.filter(v=>v[0]===brand)) {
    const baseline=rows.find(r=>r.primary&&r.model===model&&r.storage===storage&&r.status==='quoted'&&!runnerFaults(r.diagnostics).length&&(!r.hasAge||r.diagnostics.mobileAge==='below3')&&r.offeredAccessories.every((a:string)=>r.diagnostics.accessories.includes(a)));
    if(!baseline)throw new Error(`Missing clean collection control ${model} ${storage}`);
    const offered=baseline.offeredAccessories as string[];
    cases.forEach(([label,changes],i)=>{
      const diagnostics={...baseline.diagnostics,...changes};let applicable=!label.startsWith('Flip ')||/flip/i.test(model);
      if(label.startsWith('Missing box +'))diagnostics.accessories=offered.filter(a=>a!=='box');
      if(label.startsWith('Missing charger +')){applicable=offered.includes('charger');diagnostics.accessories=offered.filter(a=>a!=='charger');}
      if('accessories' in changes){diagnostics.box=diagnostics.accessories.includes('box');diagnostics.charger=diagnostics.accessories.includes('charger');}
      let expected:unknown=null;
      if(applicable)try{expected=evaluateRunner(calibration.profiles[modelKey(model)],baseline.reference,diagnostics,storage);}catch(error){if(!(error instanceof InspectionRequiredError))throw error;expected={inspection:error.reason};}
      predictions.push({model,storage,caseId:`C${String(i+1).padStart(2,'0')}`,label,diagnostics,planningReference:baseline.reference,expected,status:applicable?'planned-not-observed':'not-applicable',calibrationHash,modelHash});
    });
  }
  fs.writeFileSync(`${out}/${brand.toLowerCase()}-predictions.jsonl`,predictions.map(r=>JSON.stringify(r)).join('\n')+'\n');
  fs.writeFileSync(`docs/next-quotes/${brand.toLowerCase()}-oppo-infinix-round-combinations.md`,doc.join('\n'));console.log(`${brand}: ${predictions.length} plans; ${predictions.filter(r=>r.status==='not-applicable').length} unavailable; no observations promoted`);
}
