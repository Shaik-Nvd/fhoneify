import assert from 'node:assert/strict';
import { normalizeModel } from '../pricing-evidence/import-cashify-runner-data';
assert.deepEqual(normalizeModel('POCO F4 (6 GB/128 GB)', 'POCO' as any), {model:'POCO F4',storage:'6 GB/128 GB'});
assert.deepEqual(normalizeModel('Motorola Moto G85 5G (8 GB/128 GB)', 'Motorola' as any), {model:'Motorola Moto G85 5G',storage:'8 GB/128 GB'});
assert.throws(()=>normalizeModel('POCO F4 (6 GB/128 GB)', 'Motorola' as any),/Wrong brand/);
console.log('PASS POCO and Motorola imports retain separate brand identities');

import fs from 'node:fs';
for (const [brand,variants,quoted,pending,noOffer] of [['POCO',114,5569,0,0],['Motorola',131,6420,44,8],['Nokia',2,92,0,0]] as const) {
  const dir='data/pricing-evidence/'+brand.toLowerCase()+'-2026-11-17';
  if (!fs.existsSync(dir+'/summary.json')) {console.log('SKIP private '+brand+' corpus absent');continue;}
  const s=JSON.parse(fs.readFileSync(dir+'/summary.json','utf8'));
  assert.equal(s.variants,variants);assert.equal(s.counts.quoted,quoted);assert.equal(s.counts.pending,pending);assert.equal(s.counts.no_offer,noOffer);assert.equal(s.disagreements.length,0);
  const rows=fs.readFileSync(dir+'/measurements.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert(rows.every(r=>r.variantUrl.startsWith('https://www.cashify.in/')));
  assert(rows.every(r=>r.source.sha256.length===64));
}
