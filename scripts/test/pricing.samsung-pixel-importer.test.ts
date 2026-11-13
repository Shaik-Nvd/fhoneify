import assert from 'node:assert/strict';
import { normalizeModel, diagnosticsForLabel } from '../pricing-evidence/import-cashify-runner-data';
import { diagnosticsFromReport, parseDetailedReport } from '../pricing-evidence/import-samsung-pixel-archives';
assert.deepEqual(normalizeModel('Samsung Galaxy S25 Ultra (12 GB/256 GB)', 'Samsung'), { model: 'Samsung Galaxy S25 Ultra', storage: '12 GB/256 GB' });
assert.deepEqual(normalizeModel('Google Pixel 11 (12 GB/256 GB)', 'Google'), { model: 'Google Pixel 11', storage: '12 GB/256 GB' });
assert.equal(diagnosticsForLabel('Original S Pen missing', ['box', 'spen'], true).accessories.includes('spen'), false);
assert.equal(diagnosticsForLabel('Screen not original', ['box'], true).originalScreen, false);
assert(diagnosticsForLabel('Hinges stuck/loose or broken', ['box'], false).hardware.includes('hinge'));
assert.throws(() => diagnosticsForLabel('unknown invented case', ['box'], false), /Unknown/);
const answers = `Are you able to make and receive calls?
Answer: Yes
Is your device's touch screen working properly?
Answer: Yes
Is your phone's screen original?
Answer: Yes
Original Box with same IMEI : Selected
Outer screen damaged/line/ broken or Spot : Selected`;
assert.deepEqual(diagnosticsFromReport(answers).diagnostics.hardware, ['outer_screen']);
assert.throws(()=>diagnosticsFromReport('Original Box with same IMEI : Selected'),/initial diagnostics/);
assert.throws(()=>diagnosticsFromReport(answers.replace('Are you able to make and receive calls?\nAnswer: Yes','Are you able to make and receive calls?')),/initial diagnostics/,'missing calls answer cannot borrow the touch answer');
assert.throws(() => diagnosticsFromReport(answers+'\nInvented screen option : Selected'), /Unknown selected/);
const priced=(selling:number)=>`Selling price : INR ${selling}\nBase Price : INR ${selling+20}\nIMEI Validation Fee : INR 20\nProcessing Fee : INR 99\nTotal Amount : INR ${selling-99}\n`;
const report=`Observed: 5 November 2026
MODEL: Samsung Galaxy Z Fold4 (12 GB/256 GB)
CASE 00) Flawless
${answers.replace(/Outer screen[^\n]+/,'')}
${priced(10000)}
CASE 01) Outer screen damaged
${answers}
${priced(8000)}
MODEL: Samsung Galaxy Z Fold4 (12 GB/512 GB)
CASE 00) Flawless
${answers.replace(/Outer screen[^\n]+/,'')}
${priced(12000)}
CASE 01) Outer screen damaged
${answers}
Your device seems to have very little value due to its condition
`;
const rows=parseDetailedReport(report,{folder:'synthetic',file:'report.txt',caseId:'',sha256:'synthetic',format:'C'});
assert.equal(rows.length,4);assert.equal(rows[1].storage,'12 GB/256 GB','trailing next-model header cannot reassign the previous quote');
assert.equal(rows[1].reference,10020);assert.equal(rows[3].status,'no_offer');assert.equal(rows[3].base,null);assert.equal(rows[3].selling,null);
assert(rows[3].diagnostics.hardware.includes('outer_screen'));assert(rows[3].source.line!>1);
const pending=parseDetailedReport(report.replace('Your device seems to have very little value due to its condition','Status: NOT VERIFIED - live test unfinished.\nSelling price, deduction, fees and payout: not verified.'),{folder:'synthetic',file:'partial.txt',caseId:'',sha256:'synthetic',format:'C'});
assert.equal(pending[3].status,'pending','unverified is not an unavailable question');
assert.equal(pending[3].base,null);assert.equal(pending[3].observedAt,null);
assert.equal(pending[3].diagnostics.calls,null,'pending answers remain unknown');
console.log('PASS Samsung/Pixel identities and fail-closed report labels');
