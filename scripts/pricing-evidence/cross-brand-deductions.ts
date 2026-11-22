/**
 * READ-ONLY analysis over the private runner corpora: every single-change Cashify quote becomes one
 * (brand, answer, reference, deduction) point. Prints, per answer, how the deduction scales with the
 * reference and how much brands differ. Output: <out>/points.jsonl and <out>/summary.json (private).
 *
 *   node --import tsx scripts/pricing-evidence/cross-brand-deductions.ts <out dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { runnerFaults, runnerAge } from '../../lib/pricing/cashifyRunnerModel/model';

export interface Point { brand: string; model: string; storage: string; key: string; reference: number; deduction: number; date: string; hasAge: boolean; diagnostics?: any; offered?: string[] }

export function changeKeys(r: any): string[] {
  const d = r.diagnostics; const keys = runnerFaults(d);
  if (r.hasAge) {
    if (d.warranty === false) keys.push('warranty');
    if (d.validBill === false) keys.push('bill');
    const age = runnerAge(d.mobileAge); if (d.mobileAge && age !== 'below3') keys.push('age:' + age);
  }
  const offered: string[] = r.offeredAccessories ?? [];
  const present = new Set<string>(d.accessories ?? []);
  const missing = offered.filter(a => !present.has(a));
  if (missing.length) keys.push(missing.length === offered.length && offered.length > 1 ? 'accessories:all' : 'accessory:' + missing.join('+'));
  return keys;
}

export function loadPoints(): { points: Point[]; baselines: Map<string, number> } {
  const corpora = fs.readdirSync('data/pricing-evidence').filter(d => /^[a-z]+-2026-11-\d\d$/.test(d) && fs.existsSync(`data/pricing-evidence/${d}/measurements.jsonl`)).sort().reverse();
  const seen = new Set<string>(); const points: Point[] = []; const baselines = new Map<string, number>();
  for (const c of corpora) for (const line of fs.readFileSync(`data/pricing-evidence/${c}/measurements.jsonl`, 'utf8').trim().split('\n')) {
    const r = JSON.parse(line);
    if (r.status !== 'quoted' || r.primary === false || !(r.reference > 0)) continue;
    const id = r.model + '|' + r.storage + '|' + JSON.stringify(r.diagnostics); if (seen.has(id)) continue; seen.add(id);
    const keys = changeKeys(r);
    if (keys.length === 0) { baselines.set(r.model + '|' + r.storage, r.reference); continue; }
    if (keys.length !== 1) continue;
    const brand = r.brand === 'POCO' ? 'POCO' : r.brand;
    points.push({ brand, model: r.model, storage: r.storage, key: keys[0], reference: r.reference, deduction: r.reference - r.base, date: r.observedAt ?? '', hasAge: !!r.hasAge, diagnostics: r.diagnostics, offered: r.offeredAccessories });
  }
  return { points, baselines };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };

if (require.main === module) {
  const out = process.argv[2]; if (!out) throw new Error('Usage: cross-brand-deductions.ts <out dir>');
  const { points } = loadPoints();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'points.jsonl'), points.map(({ diagnostics, ...p }) => JSON.stringify(p)).join('\n') + '\n');
  const keys = [...new Set(points.map(p => p.key))].sort();
  const brands = [...new Set(points.map(p => p.brand))].sort();
  const summary: any = {};
  for (const k of keys) {
    const ps = points.filter(p => p.key === k); if (ps.length < 20) continue;
    const row: any = { n: ps.length, pct: +median(ps.map(p => p.deduction / p.reference)).toFixed(3) };
    for (const b of brands) { const bp = ps.filter(p => p.brand === b); if (bp.length >= 5) row[b] = +median(bp.map(p => p.deduction / p.reference)).toFixed(3); }
    summary[k] = row;
  }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1));
  console.log('points', points.length, 'brands', brands.join(','));
  console.log(['answer', 'n', 'all', ...brands].join('\t'));
  for (const [k, r] of Object.entries<any>(summary)) console.log([k, r.n, r.pct, ...brands.map(b => r[b] ?? '-')].join('\t'));
}
