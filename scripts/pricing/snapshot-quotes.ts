/**
 * Regression guard: prices a fixed cross-brand sample of catalog variants
 * under the benchmark combos and writes them to JSON, so a pricing change can
 * be compared before/after.
 *
 *   npx tsx scripts/pricing/snapshot-quotes.ts --out <file.json>
 *   npx tsx scripts/pricing/snapshot-quotes.ts --compare <before.json>
 *
 * No database: references come from lib/cashify_prices.json or the catalog
 * basePrice (resolveReference without a repository record).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { priceDevice, resolveReference } from '../../lib/pricing/engine';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { BENCHMARK_SEMANTICS, COMBOS } from './benchmark-combos';

const SAMPLE: [string, string, string][] = [
  ['Apple', 'Apple iPhone 15', '512GB'],
  ['Apple', 'Apple iPhone 14', '128GB'],
  ['Apple', 'Apple iPhone 16 Pro', '256GB'],
  ['Apple', 'Apple iPhone 13', '128GB'],
  ['Samsung', 'Samsung Galaxy S24 5G', '8 GB/256 GB'],
  ['Samsung', 'Samsung Galaxy S23 Ultra 5G', '12 GB/256 GB'],
  ['Samsung', 'Samsung Galaxy A54 5G', '8 GB/128 GB'],
  ['OnePlus', 'OnePlus 13', '16 GB/512 GB'],
  ['OnePlus', 'OnePlus Nord 4', '12 GB/256 GB'],
  ['Oppo', 'OPPO Reno11 5G', '8 GB/256 GB'],
  ['Oppo', 'OPPO Find X8 Pro 5G', '16 GB/512 GB'],
  ['Vivo', 'Vivo V30 Pro', '8 GB/256 GB'],
  ['Realme', 'Realme 12 Pro 5G', '12 GB/256 GB'],
  ['Google', 'Google Pixel 8', '8 GB/128 GB'],
  ['Nothing', 'Nothing Phone 2', '12 GB/256 GB'],
  ['Xiaomi', 'Xiaomi Redmi Note 13 Pro 5G', '8 GB/256 GB'],
  ['Xiaomi', 'Xiaomi 17T', '12 GB/512 GB'],
  ['Xiaomi', 'Xiaomi 17 Ultra', '16 GB/512 GB'],
  ['Xiaomi', 'Xiaomi Redmi Turbo 5', '12 GB/256 GB'],
];

interface Row { brand: string; model: string; storage: string; reference: number | null; source: string | null; combo: number; cashifyEq: number | null; fhoneify: number | null }

function snapshot(): Row[] {
  const rows: Row[] = [];
  for (const [brand, model, storage] of SAMPLE) {
    const device = findCatalogDevice(brand, model, storage);
    const ref = device ? resolveReference({ device }) : null;
    for (const combo of [0, 1, 2] as const) {
      const row: Row = { brand, model, storage, reference: ref?.cashifyGetUptoReference ?? null, source: ref?.source ?? (device ? null : 'not-in-catalog'), combo, cashifyEq: null, fhoneify: null };
      if (ref) {
        const r = priceDevice(brand, model, ref.cashifyGetUptoReference, COMBOS[combo], BENCHMARK_SEMANTICS);
        row.cashifyEq = r.cashifyConditionEquivalent;
        row.fhoneify = r.fhoneifyPrice;
      }
      rows.push(row);
    }
  }
  return rows;
}

const args = process.argv.slice(2);
const rows = snapshot();
const outIdx = args.indexOf('--out');
const cmpIdx = args.indexOf('--compare');
if (outIdx >= 0) {
  writeFileSync(args[outIdx + 1], JSON.stringify(rows, null, 2) + '\n');
  console.log(`wrote ${rows.length} rows to ${args[outIdx + 1]}`);
}
if (cmpIdx >= 0) {
  const before: Row[] = JSON.parse(readFileSync(args[cmpIdx + 1], 'utf8'));
  const pct = (a: number | null, b: number | null) => (a && b ? `${(((b - a) / a) * 100).toFixed(1)}%` : '-');
  console.log('| Model (variant) | combo | ref | before eq | after eq | Δ eq | before Fhoneify | after Fhoneify | Δ |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  let changed = 0;
  for (const after of rows) {
    const b = before.find((x) => x.model === after.model && x.storage === after.storage && x.combo === after.combo);
    if (b && (b.cashifyEq !== after.cashifyEq || b.fhoneify !== after.fhoneify)) changed++;
    console.log(`| ${after.model} (${after.storage}) | ${after.combo} | ${after.reference ?? '-'} | ${b?.cashifyEq ?? '-'} | ${after.cashifyEq ?? '-'} | ${pct(b?.cashifyEq ?? null, after.cashifyEq)} | ${b?.fhoneify ?? '-'} | ${after.fhoneify ?? '-'} | ${pct(b?.fhoneify ?? null, after.fhoneify)} |`);
  }
  console.log(`\n${changed} of ${rows.length} rows changed`);
}
if (outIdx < 0 && cmpIdx < 0) console.table(rows);
