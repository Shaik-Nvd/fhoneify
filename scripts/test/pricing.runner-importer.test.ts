import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importRunnerData } from '../pricing-evidence/import-cashify-runner-data';

// Entire fixture is synthetic; no collector/account text is retained.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-import-'));
const folder = path.join(tmp, 'source', 'synthetic');
fs.mkdirSync(folder, { recursive: true });
const questions = ['Are you able to make and receive calls?', "Is your device's touch screen working properly?", "Is your phone's screen original?"];
const model = 'Oneplus Open (16 GB/512 GB)';
const quote = { status: 'quoted', base: 10000, selling: 9980, imei_fee: 20, processing_fee: 99, total: 9881 };
const answers: any[] = [{ stage: 'initial', options: ['Yes', 'No'], questions, selected: ['Yes','Yes','Yes'], responses: questions.map(question => ({ question, answer: 'Yes' })) }, { stage: 'functional', options: ['Hinges stuck/loose or broken'], selected: [] }, { stage: 'accessories', options: ['Original Box with same IMEI', 'Original Charger of Device'], selected: ['Original Box with same IMEI','Original Charger of Device'] }, { stage: 'age', options: [], selected: [], asked: false }];
const baseline = { case: { id: 'baseline', label: 'Flawless baseline' }, quote, answers, observed_at: '2026-11-09T00:00:00Z', quote_text: 'PRIVATE_SYNTHETIC_SENTINEL' };
const fault = { ...baseline, case: { id: 'functional-0', label: 'Hinges stuck/loose or broken' }, quote: { ...quote, base: 9000, selling: 8980, total: 8881 }, answers: answers.map(a => a.stage === 'functional' ? {...a, selected: ['Hinges stuck/loose or broken']} : a) };
const pending = { ...baseline, case: { id: 'functional-1', label: 'Outer screen damaged/line/broken or spot' }, quote: { status: 'pending' }, answers: [] };
const rows: any[] = [baseline, fault, pending].map(r => ({ model, case_id: r.case.id, test: r.case.label, ...r.quote, deduction: r === pending ? null : r === fault ? 1000 : 0, total_reduction: r === pending ? null : r === fault ? 1000 : 0, observed_at: r.observed_at }));
const checkpoint = { variants: { 'https://example.test/open': { model, url: 'https://example.test/open', schema: { initial: questions, groups: [], branches: [], functional: ['Hinges stuck/loose or broken','Outer screen damaged/line/broken or spot'], accessories: answers[2].options, ages: [] }, results: Object.fromEntries([baseline,fault,pending].map(r=>[r.case.id,r])), complete: false, final_control_matches: null, healthy_controls_match: true } } };
function write() {
 fs.writeFileSync(path.join(folder,'checkpoint.json'), JSON.stringify(checkpoint));
 fs.writeFileSync(path.join(folder,'results.json'), JSON.stringify(rows));
 const keys = Object.keys(rows[0]);
 fs.writeFileSync(path.join(folder,'results.csv'), keys.join(',')+'\n'+rows.map(row=>keys.map(k=>JSON.stringify(String((row as any)[k] ?? ''))).join(',')).join('\n'));
 fs.writeFileSync(path.join(folder,'full_test_results.txt'), rows.map(row=>JSON.stringify(row,null,2)).join('\n'));
}
try {
 write();
 const imported = importRunnerData(path.dirname(folder), { brand: 'OnePlus', out: path.join(tmp,'out'), requireMirror: false });
 assert.equal(imported.measurements.length, 3);
 assert.equal(imported.measurements[0].model, 'OnePlus Open');
 assert.equal(imported.measurements[1].diagnostics.hardware[0], 'hinge');
 assert.equal(imported.measurements[2].base, null);
 assert.equal(imported.measurements[2].deduction, null);
 assert.equal(imported.summary.incompleteVariants, 1);
 assert(!JSON.stringify(imported).includes('PRIVATE_SYNTHETIC_SENTINEL'));
 // Options can remain present on a skipped age page; only a recorded selection is an age answer.
 const variant = checkpoint.variants['https://example.test/open'];
 variant.schema.ages = ['Below 3 months','3 months - 6 months','6 months - 11 months','Above 11 months'] as any;
 answers[3] = { stage:'age',options:variant.schema.ages,selected:['Below 3 months'],asked:true };
 baseline.answers = answers;
 fault.answers = fault.answers.map(a=>a.stage==='age'?{stage:'age',options:variant.schema.ages,selected:[],asked:false}:a);
 write();
 const aged=importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false});
 assert.equal(aged.measurements[0].ageAsked,true);
 assert.equal(aged.measurements[0].diagnostics.mobileAge,'below3');
 assert.equal(aged.measurements[1].hasAge,true);
 assert.equal(aged.measurements[1].ageAsked,false);
 assert.equal(aged.measurements[1].ageSelected,null);
 // Real incomplete runs retain pending cases in plan/results exports, without checkpoint result or timestamp.
 delete variant.results[pending.case.id];
 (variant as any).plan=[baseline.case,fault.case,pending.case];
 variant.final_control_matches=false as any;
 rows[2].observed_at=null;
 write();
 const unobserved=importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false});
 assert.equal(unobserved.measurements[2].observedAt,null);
 assert.deepEqual(unobserved.measurements[2].answerPath,[]);
 assert.equal(unobserved.measurements[2].source.file,'results.json');
 fs.writeFileSync(path.join(folder,'full_test_results.txt'),rows.filter(row=>row.status==='quoted').map(row=>JSON.stringify(row,null,2)).join('\n'));
 assert.equal(importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false}).summary.pending,1);
 fs.writeFileSync(path.join(folder,'full_test_results.txt'),JSON.stringify(rows[0],null,2));
 assert.throws(()=>importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false}),/quoted row missing text/i);
 const terabyteModel='Oneplus Open (24 GB/1 TB)';
 variant.model=terabyteModel; for(const row of rows)row.model=terabyteModel;write();
 assert.equal(importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false}).measurements[0].storage,'24 GB/1 TB');
 variant.model=model;for(const row of rows)row.model=model;write();
 // Open's fold condition is a physical branch, with an explicit healthy counterpart.
 fault.case.label='Outer screen damaged/line/ broken or Spot'; rows[1].test=fault.case.label;
 fault.answers=fault.answers.map(a=>a.stage==='functional'?{...a,selected:[]}:a);
 fault.answers.push({stage:'branch',group:'Dead Spot/Visible line and Discoloration on screen',options:['Outer screen damaged/line/ broken or Spot','No issue with outer screen'],selected:[fault.case.label]});
 write();
 assert(importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false}).measurements[1].diagnostics.hardware.includes('outer_screen'));
 // Recognize only the observed mojibake dash alias, while preserving the recorded raw label.
 pending.case.label=questions[0]+' \u00e2\u20ac\u201d No'; rows[2].test=pending.case.label;write();
 assert.equal(importRunnerData(path.dirname(folder),{brand:'OnePlus',requireMirror:false}).measurements[2].label,pending.case.label);
 const emptyZip=Buffer.alloc(22);emptyZip.writeUInt32LE(0x06054b50);
 fs.writeFileSync(path.join(folder,'Cashify_Test_Results.zip'),emptyZip);
 assert.throws(()=>importRunnerData(path.dirname(folder),{brand:'OnePlus'}),/mirror mismatch/i);
 fs.unlinkSync(path.join(folder,'Cashify_Test_Results.zip'));
 rows[1].base = 9001; write();
 assert.throws(()=>importRunnerData(path.dirname(folder), { brand:'OnePlus', requireMirror:false }), /mismatch|arithmetic/i);
 rows[1].base = 9000;
 answers[1].options.push('Unrecognized functional option'); write();
 assert.throws(()=>importRunnerData(path.dirname(folder), { brand:'OnePlus', requireMirror:false }), /unknown/i);
 answers[1].options.pop();
 checkpoint.variants['https://example.test/open'].healthy_controls_match = false; write();
 assert.throws(()=>importRunnerData(path.dirname(folder), { brand:'OnePlus', requireMirror:false }), /control/i);
 checkpoint.variants['https://example.test/open'].healthy_controls_match = true;
 fault.case.label = 'Unknown answer'; rows[1].test = 'Unknown answer'; write();
 assert.throws(()=>importRunnerData(path.dirname(folder), { brand:'OnePlus', requireMirror:false }), /unknown/i);
 console.log('Runner importer synthetic fixture: passed');
} finally { fs.rmSync(tmp, { recursive:true, force:true }); }
