import assert from 'node:assert/strict';
import { fitCalibration, mergeNokia81, series } from '../pricing-evidence/fit-cashify-runner-calibration';
import { diagnosticsForLabel } from '../pricing-evidence/import-cashify-runner-data';
const make=(caseId:string,label:string,base:number|null,status='quoted')=>({brand:'Motorola',model:'Motorola Moto Razr 50',storage:'8 GB/256 GB',caseId,label,base,reference:20000,status,primary:true,hasAge:false,complete:true,offeredAccessories:['box','charger'],observedAt:'2026-11-16T00:00:00Z',diagnostics:diagnosticsForLabel(label,['box','charger'],false)} as any);
const c=fitCalibration([make('baseline','Flawless',20000),make('calls','Cannot make/receive calls',1200),make('outer','Outer screen damaged/line/broken or spot',null,'no_offer')],'Motorola' as any);
assert.deepEqual(Object.values(c.profiles)[0].noOffer?.['hardware:outer_screen'],['8gb/256gb']);
assert.equal(series('Motorola Moto One'),series('Motorola Moto One Power'));
assert.notEqual(series('Motorola Moto One'),series('Motorola Moto Edge 50'));
assert.notEqual(series('POCO F4'),series('POCO M4'));
const previous:any={version:'old',sourceHash:'old',profiles:{nokia81:{...Object.values(c.profiles)[0],model:'Nokia 8.1'},nokia71:{...Object.values(c.profiles)[0],model:'Nokia 7.1'}}};
const incoming:any={...c,profiles:{nokia81:{...previous.profiles.nokia81,hasAge:true}}};
const once=mergeNokia81(previous,incoming);assert.deepEqual(mergeNokia81(once,incoming),once);assert.deepEqual(once.profiles.nokia71,previous.profiles.nokia71);assert(once.profiles.nokia81.hasAge);
console.log('PASS Motorola no-offer, same-series donors and reproducible Nokia 8.1-only replacement');

import fs from 'node:fs';
import { evaluateRunner, modelKey } from '../../lib/pricing/cashifyRunnerModel/model';
for(const brand of ['POCO','Motorola','Nokia']) {
 const file='data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-17/measurements.jsonl';
 if(!fs.existsSync(file)){console.log('SKIP private '+brand+' replay');continue;}
 const data=JSON.parse(fs.readFileSync('lib/pricing/cashifyRunnerModel/calibration.'+brand.toLowerCase()+'.json','utf8'));
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(s=>JSON.parse(s));let n=0;
 for(const r of rows.filter(r=>r.primary&&r.status==='quoted')) {const q=evaluateRunner(data.profiles[modelKey(r.model)],r.reference,r.diagnostics,r.storage);assert(Math.abs(q.price-r.base)<=20,brand+' '+r.model+' '+r.storage+' '+r.caseId+' error '+(q.price-r.base));n++;}
 console.log('PASS '+brand+' fitted primary replay '+n);
}
