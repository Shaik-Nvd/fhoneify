/**
 * End-to-end leave-one-brand-out check of the generic Android rules: curves fitted without brand X
 * price every primary measured quote of brand X (single answers, controls and the few multi-answer
 * rows) through genericQuote, the same evaluator and floors production uses. Compares with the old
 * calculators on the same quotes. Private corpora only; prints aggregates.
 */
import fs from 'node:fs';
import { loadPoints } from './cross-brand-deductions';
import { fitGeneric } from './fit-generic-android';
import { genericQuote } from '../../lib/pricing/cashifyRunnerModel/generic';
import { priceDevice } from '../../lib/pricing/engine';

const { points } = loadPoints();
const corpora = fs.readdirSync('data/pricing-evidence').filter(d => /^[a-z]+-2026-11-\d\d$/.test(d) && fs.existsSync(`data/pricing-evidence/${d}/measurements.jsonl`)).sort().reverse();
const rows: any[] = []; const seen = new Set<string>();
for (const c of corpora) for (const line of fs.readFileSync(`data/pricing-evidence/${c}/measurements.jsonl`, 'utf8').trim().split('\n')) {
  const r = JSON.parse(line); if (r.status !== 'quoted' || r.primary === false || !(r.reference > 0)) continue;
  const id = r.model + '|' + r.storage + '|' + JSON.stringify(r.diagnostics); if (seen.has(id)) continue; seen.add(id); rows.push(r);
}
const brands = [...new Set(points.map(p => p.brand))].sort();
const table: any[] = []; const all = { g: [] as number[], l: [] as number[] };
for (const held of brands) {
  const curves = fitGeneric(points.filter(p => p.brand !== held)) as any;
  const g: number[] = [], l: number[] = []; let refused = 0;
  for (const r of rows.filter(r => r.brand === held)) {
    const sem = { warrantyMode: r.hasAge ? 'ASKED' : 'NOT_ASKED', boxMode: r.offeredAccessories?.includes('box') ? 'ASKED' : 'NOT_ASKED', chargerMode: r.offeredAccessories?.includes('charger') ? 'ASKED' : 'NOT_ASKED' };
    try { g.push((genericQuote(r.model, r.storage, r.reference, r.diagnostics, sem, curves).price - r.base) / r.reference); } catch { refused++; }
    try { l.push((priceDevice(r.brand, r.model, r.reference, r.diagnostics, undefined, r.storage, { disableRunnerEvidence: true } as any).cashifyConditionEquivalent - r.base) / r.reference); } catch { /* refused */ }
  }
  const s = (xs: number[]) => ({ n: xs.length, meanAbsPct: +(100 * xs.reduce((a, b) => a + Math.abs(b), 0) / xs.length).toFixed(1), within3pct: +(xs.filter(x => Math.abs(x) <= .03).length / xs.length).toFixed(2), overpay5pct: +(xs.filter(x => x > .05).length / xs.length).toFixed(2) });
  table.push({ brand: held, refused, ...Object.fromEntries(Object.entries(s(g)).map(([k, v]) => ['generic_' + k, v])), ...Object.fromEntries(Object.entries(s(l)).map(([k, v]) => ['old_' + k, v])) });
  all.g.push(...g); all.l.push(...l);
}
console.table(table);
const s = (xs: number[]) => ({ meanAbsPct: +(100 * xs.reduce((a, b) => a + Math.abs(b), 0) / xs.length).toFixed(1), within3pct: +(xs.filter(x => Math.abs(x) <= .03).length / xs.length).toFixed(3) });
console.log('ALL generic', JSON.stringify(s(all.g)), 'old', JSON.stringify(s(all.l)));
