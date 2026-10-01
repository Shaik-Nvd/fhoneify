/**
 * Derives fixed-₹ calibration inputs from the benchmark fixture once combo 0
 * (clean, warranty No, bill, box) captures exist for a model:
 *
 *   warrantyRetention[model] = (C0 - box) / GetUpto
 *   D1[model] = C0 - C1   (local display + spots/lines/discoloration)
 *   D2[model] = C0 - C2   (>2 screen scratches + charging port)
 *
 * and shows, per proposed repair-cost group, how far apart the members'
 * deductions are. A shared group table is only justified when they agree.
 *
 *   npx tsx scripts/pricing/fit-inr-tables.ts [--fixture <file>]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMON_BONUSES } from '../../lib/pricingCalculator';

interface Case { model: string; storage: string; combo: 0 | 1 | 2; target: number | null }
interface Fixture { references: Record<string, { getUpto: number | null }>; cases: Case[]; groups?: Record<string, string> }

const args = process.argv.slice(2);
const fixturePath = resolve(args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : 'scripts/pricing/fixtures/cashify-benchmark-2026-10-01.json');
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const box = COMMON_BONUSES.box;

const byModel = new Map<string, { R: number | null; c: Partial<Record<0 | 1 | 2, number>> }>();
for (const c of fixture.cases) {
  const id = `${c.model}|${c.storage}`;
  const entry = byModel.get(id) ?? { R: fixture.references[id]?.getUpto ?? null, c: {} };
  if (c.target != null) entry.c[c.combo] = c.target;
  byModel.set(id, entry);
}

const rows: { id: string; group: string; R: number; ret: number; d1: number; d2: number }[] = [];
console.log('model | R | C0 | retention | D1 (C0-C1) | D2 (C0-C2) | D1-D2');
for (const [id, { R, c }] of byModel) {
  if (!R || c[0] == null || c[1] == null || c[2] == null) {
    console.log(`${id} | ${R ?? '-'} | ${c[0] ?? '-'} | (needs Get Upto and combos 0, 1, 2)`);
    continue;
  }
  const ret = (c[0] - box) / R;
  const d1 = c[0] - c[1];
  const d2 = c[0] - c[2];
  const group = fixture.groups?.[id.split('|')[0]] ?? '(unassigned)';
  rows.push({ id, group, R, ret, d1, d2 });
  console.log(`${id} | ${R} | ${c[0]} | ${ret.toFixed(4)} | ${d1} | ${d2} | ${d1 - d2}`);
}

const groups = new Map<string, typeof rows>();
for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
console.log('\ngroup | members | D1 mean (min-max) | D2 mean (min-max) | worst member error from the group mean, ₹');
for (const [group, members] of groups) {
  const stat = (k: 'd1' | 'd2') => {
    const v = members.map((m) => m[k]);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    return { mean: Math.round(mean), min: Math.min(...v), max: Math.max(...v), spread: Math.max(...v.map((x) => Math.abs(x - mean))) };
  };
  const a = stat('d1');
  const b = stat('d2');
  console.log(`${group} | ${members.length} | ${a.mean} (${a.min}-${a.max}) | ${b.mean} (${b.min}-${b.max}) | ${Math.round(Math.max(a.spread, b.spread))}`);
}
