/**
 * Fits the fixed-₹ model's per-model repair-cost anchors from the benchmark.
 *
 * The ₹ tables are the existing percentage rules taken at an anchor A
 * (tableFromPercentRules), so for the benchmark answers:
 *   C0 = R x retention + box                     (clean, warranty No)
 *   D1 = C0 - C1 = localDisplay + worst display defect (lines)  = 0.49 A
 *   D2 = C0 - C2 = scratchesHeavy + charging                    = 0.25 A
 * Retention is measured where a combo 0 capture exists, else --retention.
 * A1 = D1 / 0.49 and A2 = D2 / 0.25 must agree if the old relative weights
 * hold. A group shares one anchor, fitted by least squares on relative error
 * over its members' C1 and C2.
 *
 *   npx tsx scripts/pricing/fit-inr-tables.ts [--retention 0.764] [--note-retention 0.74]
 *     [--group "Xiaomi 15,Xiaomi 15 Ultra,Xiaomi 17,Xiaomi 17 Ultra"]...
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMON_BONUSES } from '../../lib/pricingCalculator';
import { tableFromPercentRules } from '../../lib/pricing/inrDeductionTables';

interface Case { model: string; storage: string; combo: 0 | 1 | 2; target: number | null }
interface Fixture { references: Record<string, { getUpto: number | null }>; cases: Case[] }

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const fixture: Fixture = JSON.parse(readFileSync(resolve(opt('--fixture', 'scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json')), 'utf8'));
const defaultRetention = Number(opt('--retention', '0.764'));
const noteRetention = Number(opt('--note-retention', '0.74'));
const groups = args.flatMap((a, i) => (a === '--group' ? [args[i + 1].split(',').map((s) => s.trim())] : []));
const box = COMMON_BONUSES.box;

// Coefficients of A in D1 and D2, read from the real table builder.
const unit = tableFromPercentRules('unit', 100000);
const k1 = (unit.screen.localDisplay + unit.screen.lines) / 100000;
const k2 = (unit.screen.scratchesHeavy + unit.functional.charging) / 100000;

interface M { model: string; R: number; ret: number; measured: boolean; c0: number; c1: number; c2: number }
const models: M[] = [];
for (const [id, ref] of Object.entries(fixture.references)) {
  const [model, storage] = id.split('|');
  const t = (combo: number) => fixture.cases.find((c) => c.model === model && c.storage === storage && c.combo === combo)?.target ?? null;
  const [c0m, c1, c2] = [t(0), t(1), t(2)];
  if (!ref.getUpto || c1 == null || c2 == null) continue;
  const ret = c0m != null ? (c0m - box) / ref.getUpto : model.toLowerCase().includes('note') ? noteRetention : defaultRetention;
  models.push({ model, R: ref.getUpto, ret, measured: c0m != null, c0: c0m ?? ref.getUpto * ret + box, c1, c2 });
}

console.log(`k1 = ${k1}, k2 = ${k2}, expected D2/D1 = ${(k2 / k1).toFixed(3)}; retention default ${defaultRetention}, Note ${noteRetention}\n`);
console.log('model | R | retention | C0 | D1 | D2 | D2/D1 | A1 = D1/k1 | A2 = D2/k2');
for (const m of models) {
  const d1 = m.c0 - m.c1;
  const d2 = m.c0 - m.c2;
  console.log(`${m.model} | ${m.R} | ${m.ret.toFixed(4)}${m.measured ? ' (measured)' : ''} | ${Math.round(m.c0)} | ${Math.round(d1)} | ${Math.round(d2)} | ${(d2 / d1).toFixed(3)} | ${Math.round(d1 / k1)} | ${Math.round(d2 / k2)}`);
}

// Per anchor set: least squares on relative error, sum over members of
// ((c0 - k A - target) / target)^2 -> A = Σ k (c0 - t) / t² / Σ k² / t².
const assigned = new Set(groups.flat());
const sets = [...groups, ...models.filter((m) => !assigned.has(m.model)).map((m) => [m.model])];
console.log('\nanchor set | A (₹, rounded to 10) | member C1 err | member C2 err');
for (const set of sets) {
  const members = models.filter((m) => set.includes(m.model));
  if (!members.length) continue;
  let num = 0;
  let den = 0;
  for (const m of members) for (const [k, t] of [[k1, m.c1], [k2, m.c2]] as const) { num += (k * (m.c0 - t)) / (t * t); den += (k * k) / (t * t); }
  const A = Math.round(num / den / 10) * 10;
  const errs = members.map((m) => {
    const e1 = ((m.c0 - k1 * A - m.c1) / m.c1) * 100;
    const e2 = ((m.c0 - k2 * A - m.c2) / m.c2) * 100;
    return `${m.model}: ${e1.toFixed(1)}% / ${e2.toFixed(1)}%`;
  });
  console.log(`${set.join(' + ')} | ${A} | ${errs.join('; ')}`);
}
