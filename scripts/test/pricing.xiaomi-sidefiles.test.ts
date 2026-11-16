import assert from 'node:assert/strict';
import { verifyReportMonetaryRows } from '../pricing-evidence/import-samsung-pixel-archives';
const row:any={storage:'4 GB/128 GB',selling:5000,base:5020,total:4901};
const side={model:'Xiaomi Redmi A3',variants:{'4 GB/128 GB':'A'},observations:{A:[{quote:5000,base:5020,total:4901,selectionChecks:true}]}};
assert.doesNotThrow(()=>verifyReportMonetaryRows(side,[row],'synthetic'));
assert.throws(()=>verifyReportMonetaryRows(side,[{...row,base:9999}],'synthetic'),/monetary mismatch/);
console.log('PASS nested report monetary cross-check uses explicit variant map');
