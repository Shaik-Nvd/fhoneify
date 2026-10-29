/**
 * The rules' deduction for one condition at a time on a variant, at a given reference (box and charger present, otherwise flawless).
 *
 *   npx tsx scripts/pricing-evidence/single-deductions.ts "iPhone 8" 256 6150
 */
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import calibrationJson from '../../lib/pricing/appleCashifyModel/calibration.json';

const [model, gb, ref] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const clean = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['box', 'charger'], box: true, charger: true, warranty: true, validBill: true, mobileAge: 'below3' } as any;
const price = (d: any) => appleEvidenceQuote(model, `${gb}GB`, ref, d)!.outcome.price;
const base = price(clean);
const singles: [string, any][] = [
  ['F01 front camera', { hardware: ['front_camera'] }], ['F02 back camera', { hardware: ['back_camera'] }], ['F06 speaker', { hardware: ['speaker'] }],
  ['F08 face', { hardware: ['face'] }], ['S04 1-2 screen scratches', { screenCondition: '1-2 scratches on screen' }],
  ['C02 1-2 body scratches', { bodyScratches: '1-2 scratches' }], ['C04 1-2 minor dents', { bodyDents: '1-2 minor dents' }],
  ['box missing', { accessories: ['charger'], box: false }], ['charger missing', { accessories: ['box'], charger: false }],
];
const cal = (calibrationJson as any).models[model.replace(/^Apple /, '')];
console.log(model, gb, 'ref', ref, 'flawless', base);
for (const [label, o] of singles) {
  const code = label.split(' ')[0];
  const c = cal?.codes?.[code];
  console.log(label.padEnd(26), String(base - price({ ...clean, ...o })).padStart(6), c ? `${c.support}${c.basis ? ' (' + c.basis + ')' : ''}` : '');
}
