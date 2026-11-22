/** Summarises a private production audit file (audit-rows.jsonl). */
import fs from 'node:fs';
const file = process.argv[2];
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const by: Record<string, any> = {};
for (const r of rows) {
  const b = by[r.brand] ??= { rows: 0, notInCatalog: 0, testRefused: 0, testWithin20: 0, testN: 0, prodN: 0, prodRefused: 0, prodNoRef: 0, prodWithin3pct: 0, prodOver5pct: 0, prodUnder5pct: 0, refMoves: [] as number[] };
  b.rows++;
  if (r.error === 'NOT_IN_CATALOG') { b.notInCatalog++; continue; }
  if (r.status === 'no_offer') continue;
  if (r.test?.price !== undefined) { b.testN++; if (Math.abs(r.test.price - r.cashify) <= 20) b.testWithin20++; } else b.testRefused++;
  if (!r.productionReference) { b.prodNoRef++; continue; }
  if (r.production?.price === undefined) { b.prodRefused++; continue; }
  // Measured price moved with the reference: what Cashify would pay today if its deductions scale with the reference.
  const expected = r.cashify * r.productionReference / r.testReference;
  const rel = (r.production.price - expected) / r.productionReference;
  b.prodN++; if (Math.abs(rel) <= .03) b.prodWithin3pct++; if (rel > .05) b.prodOver5pct++; if (rel < -.05) b.prodUnder5pct++;
  b.refMoves.push(r.productionReference / r.testReference - 1);
}
const out = Object.entries(by).map(([brand, b]: any) => {
  const m = [...b.refMoves].sort((x: number, y: number) => x - y);
  return { brand, rows: b.rows, notInCatalog: b.notInCatalog, testWithin20: b.testN ? +(b.testWithin20 / b.testN).toFixed(3) : null, testRefused: b.testRefused,
    prodNoRef: b.prodNoRef, prodRefused: b.prodRefused, prodWithin3pct: b.prodN ? +(b.prodWithin3pct / b.prodN).toFixed(3) : null, prodOver5pct: b.prodN ? +(b.prodOver5pct / b.prodN).toFixed(3) : null,
    refMoveMedian: m.length ? +(m[Math.floor(m.length / 2)] * 100).toFixed(1) : null, refMoveP10: m.length ? +(m[Math.floor(m.length * .1)] * 100).toFixed(1) : null, refMoveP90: m.length ? +(m[Math.floor(m.length * .9)] * 100).toFixed(1) : null };
});
console.table(out);
