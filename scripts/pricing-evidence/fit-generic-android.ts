/**
 * Cross-brand ("generic") Cashify deduction curves for Android phones without their own measurements.
 *
 * Cashify prices every Android brand with one rule set per regime: phones whose questionnaire asks
 * warranty/bill/age ("newer") and phones where it does not ("older"). Within a regime a deduction is a
 * share of the reference that depends only on the reference, e.g. Wi-Fi 30% (newer) / 40% (older).
 * For each regime and answer we fit that share as a curve over log(reference) from medians of every
 * measured brand. Nothing here is a final-quote table.
 *
 *   node --import tsx scripts/pricing-evidence/fit-generic-android.ts            (leave-one-brand-out report)
 *   node --import tsx scripts/pricing-evidence/fit-generic-android.ts --write    (also writes calibration.generic.json)
 */
import fs from 'node:fs';
import { loadPoints, type Point } from './cross-brand-deductions';

export const KNOTS = [1500, 2500, 4000, 6000, 9000, 13000, 19000, 28000, 42000, 65000, 100000];
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

export interface Curve { knots: number[]; shares: number[]; support: number }
export function fitCurve(points: { reference: number; deduction: number; brand: string }[]): Curve | null {
  if (points.length < 10) return null;
  const shares: (number | null)[] = KNOTS.map(k => {
    const near = points.filter(p => p.reference >= k / 1.6 && p.reference <= k * 1.6);
    if (near.length < 5) return null;
    // Median per brand first, then across brands: one brand with many models cannot dominate.
    const byBrand = new Map<string, number[]>();
    for (const p of near) byBrand.set(p.brand, [...(byBrand.get(p.brand) ?? []), p.deduction / p.reference]);
    return median([...byBrand.values()].map(median));
  });
  // Fill knots without support by nearest supported knot (flat ends, linear between in log space).
  const known = shares.map((s, i) => s === null ? null : i).filter((i): i is number => i !== null);
  if (!known.length) return null;
  const filled = shares.map((s, i) => {
    if (s !== null) return s;
    const lo = [...known].reverse().find(j => j < i), hi = known.find(j => j > i);
    if (lo === undefined) return shares[hi!]!; if (hi === undefined) return shares[lo]!;
    const t = (Math.log(KNOTS[i]) - Math.log(KNOTS[lo])) / (Math.log(KNOTS[hi]) - Math.log(KNOTS[lo]));
    return shares[lo]! + t * (shares[hi]! - shares[lo]!);
  });
  return { knots: KNOTS, shares: filled.map(s => +s.toFixed(4)), support: points.length };
}
export function curveShare(curve: Curve, reference: number) {
  const { knots, shares } = curve;
  if (reference <= knots[0]) return shares[0];
  if (reference >= knots[knots.length - 1]) return shares[shares.length - 1];
  const i = knots.findIndex(k => k >= reference) - 1;
  const t = (Math.log(reference) - Math.log(knots[i])) / (Math.log(knots[i + 1]) - Math.log(knots[i]));
  return shares[i] + t * (shares[i + 1] - shares[i]);
}
export const regimeOf = (hasAge: boolean) => hasAge ? 'newer' : 'older';

export function fitGeneric(points: Point[]) {
  const curves: Record<string, Record<string, Curve>> = { newer: {}, older: {} };
  for (const regime of ['newer', 'older'] as const) {
    const ps = points.filter(p => regimeOf(p.hasAge) === regime);
    for (const key of [...new Set(ps.map(p => p.key))]) {
      const c = fitCurve(ps.filter(p => p.key === key)); if (c) curves[regime][key] = c;
    }
  }
  return curves;
}

if (require.main === module) {
  (async () => {
    const { points } = loadPoints();
    const { priceDevice } = await import('../../lib/pricing/engine');
    const brands = [...new Set(points.map(p => p.brand))].sort();
    const report: any[] = [];
    const round10 = (x: number) => Math.round(x / 10) * 10;
    for (const held of brands) {
      const curves = fitGeneric(points.filter(p => p.brand !== held));
      const test = points.filter(p => p.brand === held);
      let gAbs = 0, gN = 0, g100 = 0, g5 = 0, lAbs = 0, lN = 0, l100 = 0, l5 = 0, missing = 0;
      for (const p of test) {
        const c = curves[regimeOf(p.hasAge)][p.key];
        if (!c) { missing++; continue; }
        const e = round10(curveShare(c, p.reference) * p.reference) - p.deduction;
        gAbs += Math.abs(e); gN++; if (Math.abs(e) <= 100) g100++; if (Math.abs(e) <= .05 * p.reference) g5++;
        try {
          const q = priceDevice(p.brand, p.model, p.reference, p.diagnostics, undefined, p.storage, { disableRunnerEvidence: true } as any);
          const le = (p.reference - q.cashifyConditionEquivalent) - p.deduction;
          lAbs += Math.abs(le); lN++; if (Math.abs(le) <= 100) l100++; if (Math.abs(le) <= .05 * p.reference) l5++;
        } catch { /* legacy refused */ }
      }
      report.push({ brand: held, rows: test.length, generic: { mae: Math.round(gAbs / gN), within100: +(g100 / gN).toFixed(3), within5pct: +(g5 / gN).toFixed(3), noCurve: missing },
        oldCalculators: { mae: Math.round(lAbs / lN), within100: +(l100 / lN).toFixed(3), within5pct: +(l5 / lN).toFixed(3) } });
    }
    console.table(report.map(r => ({ brand: r.brand, rows: r.rows, genericMAE: r.generic.mae, generic100: r.generic.within100, generic5pct: r.generic.within5pct, oldMAE: r.oldCalculators.mae, old100: r.oldCalculators.within100, old5pct: r.oldCalculators.within5pct })));
    fs.mkdirSync('data/pricing-evidence/analysis-2026-11-22', { recursive: true });
    fs.writeFileSync('data/pricing-evidence/analysis-2026-11-22/leave-one-brand-out.json', JSON.stringify(report, null, 1));
    if (process.argv.includes('--write')) {
      const curves = fitGeneric(points);
      fs.writeFileSync('lib/pricing/cashifyRunnerModel/calibration.generic.json', JSON.stringify({ version: 'generic-android-2026-11-22', brands, rows: points.length, curves }, null, 1) + '\n');
      console.log('wrote calibration.generic.json');
    }
  })().catch(e => { console.error(e); process.exit(1); });
}
