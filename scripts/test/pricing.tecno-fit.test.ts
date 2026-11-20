import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeModel } from '../pricing-evidence/import-cashify-runner-data';
import { series } from '../pricing-evidence/fit-cashify-runner-calibration';
import { evaluateRunner, modelKey } from '../../lib/pricing/cashifyRunnerModel/model';
assert.deepEqual(normalizeModel('Tecno POVA 3 (4 GB/64 GB)','Tecno' as any),{model:'Tecno POVA 3',storage:'4 GB/64 GB'});
assert.throws(()=>normalizeModel('Infinix Hot 50 5G (8 GB/128 GB)','Tecno' as any),/Wrong brand/);
assert.notEqual(series('Tecno Camon 20'),series('Tecno Pova 5 Pro'));
assert.notEqual(series('Tecno Spark Go 5G'),series('Tecno Spark 10 5G'));
assert.notEqual(series('Tecno Phantom V Fold 5G'),series('Tecno Phantom X'));
const data=JSON.parse(fs.readFileSync('lib/pricing/cashifyRunnerModel/calibration.tecno.json','utf8'));
assert.equal(Object.keys(data.profiles).length,59);
// Cashify asks the hinge question on Tecno's folds and flips (inside "Device panel missing/broken").
for(const model of ['Tecno Phantom V Fold 5G','Tecno Phantom V Fold2 5G','Tecno Phantom V Flip 5G','Tecno Phantom V Flip2 5G'])
 assert(data.profiles[modelKey(model)].rules['hardware:hinge'],model+' keeps its measured hinge rule');
const dir='data/pricing-evidence/tecno-2026-11-21';
if(!fs.existsSync(dir+'/summary.json'))console.log('SKIP private Tecno corpus absent');
else {
 const s=JSON.parse(fs.readFileSync(dir+'/summary.json','utf8'));
 assert.equal(s.variants,92);assert.equal(s.quoted,4424);assert.equal(s.pending,46);assert.equal(s.noOffer,1);
 const rows=fs.readFileSync(dir+'/measurements.jsonl','utf8').trim().split('\n').map(s=>JSON.parse(s));let n=0;
 for(const r of rows.filter(r=>r.primary&&r.status==='quoted')) {
  const q=evaluateRunner(data.profiles[modelKey(r.model)],r.reference,r.diagnostics,r.storage);
  assert(Math.abs(q.price-r.base)<=20,r.model+' '+r.storage+' '+r.caseId+' error '+(q.price-r.base));n++;
 }
 console.log('PASS Tecno fitted primary replay '+n+' rows within INR 20');
}
console.log('PASS Tecno identity, series and fold hinge rules');
