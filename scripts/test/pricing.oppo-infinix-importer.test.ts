import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeModel } from '../pricing-evidence/import-cashify-runner-data';
assert.deepEqual(normalizeModel('OPPO Reno12 Pro 5G (12 GB/256 GB)', 'Oppo' as any), {model:'OPPO Reno12 Pro 5G',storage:'12 GB/256 GB'});
assert.deepEqual(normalizeModel('Oppo A18 (4 GB/64 GB)', 'Oppo' as any), {model:'Oppo A18',storage:'4 GB/64 GB'});
assert.deepEqual(normalizeModel('Infinix Zero Flip 5G (8 GB/512 GB)', 'Infinix' as any), {model:'Infinix Zero Flip 5G',storage:'8 GB/512 GB'});
assert.throws(()=>normalizeModel('Infinix Zero Flip 5G (8 GB/512 GB)', 'Oppo' as any),/Wrong brand/);
console.log('PASS Oppo (either capitalisation) and Infinix imports keep separate brand identities');
for (const [brand,variants,quoted,pending,noOffer] of [['Oppo',239,11876,132,4],['Infinix',83,3954,0,1]] as const) {
  const dir='data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-18';
  if (!fs.existsSync(dir+'/summary.json')) {console.log('SKIP private '+brand+' corpus absent');continue;}
  const s=JSON.parse(fs.readFileSync(dir+'/summary.json','utf8'));
  assert.equal(s.variants,variants);assert.equal(s.counts.quoted,quoted);assert.equal(s.counts.pending,pending);assert.equal(s.counts.no_offer,noOffer);assert.equal(s.disagreements?.length??0,0);
  const rows=fs.readFileSync(dir+'/measurements.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert(rows.every(r=>r.variantUrl.startsWith('https://www.cashify.in/')));
  assert(rows.every(r=>r.source.sha256.length===64));
  console.log('PASS '+brand+' private corpus counts');
}
