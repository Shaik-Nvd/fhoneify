import assert from 'node:assert/strict';
import { reconcile } from '../pricing-evidence/import-samsung-pixel-archives';
import { diagnosticsForLabel } from '../pricing-evidence/import-cashify-runner-data';
const make=(folder:string,complete:boolean,caseId:string)=>({brand:'Xiaomi',model:'Xiaomi Redmi A3',storage:'4 GB/128 GB',status:'quoted',diagnostics:diagnosticsForLabel(caseId==='baseline'?'Flawless':'Front Camera not working',['box'],false),hasAge:false,caseId,observedAt:'2026-10-30T00:00:00Z',complete,source:{folder,format:'C',sha256:folder}} as any);
const rows=[make('a-partial',false,'baseline'),make('z-complete',true,'baseline'),make('z-complete',true,'front')];reconcile(rows);
assert.equal(rows[0].primary,false);assert.equal(rows[1].primary,true);assert.equal(rows[2].primary,true);
console.log('PASS complete same-day Xiaomi source wins and October observations remain eligible');

const newer=[make('complete',true,'baseline'),{...make('partial',false,'baseline'),observedAt:'2026-10-31T00:00:00Z'},make('complete',true,'front')];reconcile(newer);
assert.equal(newer[0].primary,true);assert.equal(newer[1].primary,false);assert.equal(newer[2].primary,true);
