/**
 * Rules' Cashify-equivalent for an answer set at a chosen reference, with the breakdown (no database).
 *
 *   npx tsx scripts/pricing-evidence/combo-at-reference.ts "iPhone 17 Pro" 256 101500 '{"hardware":["microphone"]}'
 */
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';

const [model, gb, ref, json] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5] ?? '{}'];
const d = { ...PERFECT_CONDITION_DIAGNOSTICS, accessories: ['box'], box: true, warranty: true, validBill: true, mobileAge: 'below3', ...JSON.parse(json) } as any;
const q = appleEvidenceQuote(model, `${gb}GB`, ref, d)!;
console.log(model, gb, 'ref', ref, '->', q.outcome.price);
for (const b of q.outcome.breakdown) console.log('   ', String(Math.round(b.amount)).padStart(7), b.label, b.support, (b.codes ?? []).join(','));
