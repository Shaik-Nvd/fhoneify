import assert from 'node:assert/strict';
import fs from 'node:fs';
import { series } from '../pricing-evidence/fit-cashify-runner-calibration';
import { evaluateRunner, modelKey } from '../../lib/pricing/cashifyRunnerModel/model';
assert.equal(series('OPPO Reno12 Pro 5G'),series('OPPO Reno 2'));
assert.notEqual(series('OPPO F19'),series('OPPO A5'));
assert.notEqual(series('OPPO Find X8 5G'),series('OPPO Find N3 Flip 5G'));
assert.notEqual(series('Infinix Hot 50 5G'),series('Infinix Note 40 5G'));
for(const brand of ['Oppo','Infinix']) {
 const file='data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-18/measurements.jsonl';
 if(!fs.existsSync(file)){console.log('SKIP private '+brand+' replay');continue;}
 const data=JSON.parse(fs.readFileSync('lib/pricing/cashifyRunnerModel/calibration.'+brand.toLowerCase()+'.json','utf8'));
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(s=>JSON.parse(s));let n=0,off=0;
 for(const r of rows.filter(r=>r.primary&&r.status==='quoted')) {
  const q=evaluateRunner(data.profiles[modelKey(r.model)],r.reference,r.diagnostics,r.storage);
  // OPPO A5 5G, age 6-11 months: Cashify charges less than for 3-6 months, but the shared
  // "an older bracket never pays less" rule keeps the higher amount. Disclosed exception (underquote only).
  if(Math.abs(q.price-r.base)>20){assert(r.model==='OPPO A5 5G'&&r.caseId==='age-2'&&q.price<r.base,brand+' '+r.model+' '+r.storage+' '+r.caseId+' error '+(q.price-r.base));off++;}
  n++;
 }
 assert(off<=2);
 console.log('PASS '+brand+' fitted primary replay '+n+' ('+off+' disclosed exceptions)');
}
