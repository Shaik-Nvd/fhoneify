import assert from 'node:assert/strict';
import { normalizeModel } from '../pricing-evidence/import-cashify-runner-data';
import { parseDetailedReport } from '../pricing-evidence/import-samsung-pixel-archives';
assert.deepEqual(normalizeModel('Xiaomi Black Shark 2 (6 GB/128 GB)', 'Xiaomi' as any), {model:'Xiaomi Black Shark 2',storage:'6 GB/128 GB'});
const report=`Observed: 30 October 2026
MODEL: Xiaomi Redmi A3 (4 GB/128 GB)
CASE 00) Flawless
Are you able to make and receive calls?
Answer: Yes
Is your device's touch screen working properly?
Answer: Yes
Is your phone's screen original?
Answer: Yes
Original Box with same IMEI : Selected
Selling price : INR 5000
Base Price : INR 5020
IMEI Validation Fee : INR 20
Processing Fee : INR 99
Total Amount : INR 4901
CASE 01) Front Camera not working
Status: Not yet verified
`;
const rows=parseDetailedReport(report,{folder:'partial.zip',file:'report.txt',caseId:'',sha256:'synthetic',format:'C'},'Xiaomi' as any);
assert.equal(rows[0].brand,'Xiaomi');assert.equal(rows[0].reference,5020);assert.equal(rows[1].status,'pending');assert.equal(rows[1].base,null);
assert.equal(rows[0].observedAt,'2026-10-30T00:00:00Z');
assert.throws(()=>normalizeModel('POCO F4 (6 GB/128 GB)','Xiaomi' as any),/Wrong brand/);
console.log('PASS Xiaomi dated text and pending status; POCO remains separate');
