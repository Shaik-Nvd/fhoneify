/**
 * Replays the final team intake through the production quote service.
 *
 *   npx tsx scripts/pricing-evidence/replay-final-data.ts [--label=<name>] [--reference=proxy|database]
 *
 * --reference=proxy (default): each quote is priced at its report-derived flawless baseline (a proxy, not a verified database value).
 * --reference=database: each quote is priced at the verified database reference of its variant (read-only snapshot of 2026-10-25 in
 * new-data-2026-10-28/db-reference-gaps.json); variants without one are excluded and counted. The error is always against the
 * observed Cashify base price, so the two cohorts separate rule error from reference drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import { replayService } from './replay-service';
import { EVIDENCE_DIR, loadMeasurements, hasUnknownInput } from './evidenceLib';
import { FINAL_DATA_DIR, FINAL_MEASUREMENTS_FILE } from './import-final-data';

export function databaseReferences(): Map<string, number> {
  const gaps = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, 'new-data-2026-10-28/db-reference-gaps.json'), 'utf8'));
  return new Map(gaps.rows.map((r: { model: string; storageGb: number; databaseReference: number }) => [`${r.model}|${r.storageGb}`, r.databaseReference]));
}

async function run() {
  const basis = process.argv.find(a => a.startsWith('--reference='))?.slice(12) ?? 'proxy';
  if (basis !== 'proxy' && basis !== 'database') throw new Error(`unknown --reference=${basis}`);
  let ms = loadMeasurements(FINAL_MEASUREMENTS_FILE).filter(m => !hasUnknownInput(m));
  const db = databaseReferences();
  const variants = [...new Set(ms.map(m => `${m.model_key}|${m.storage_gb}`))];
  const coverage = {
    variants: variants.length,
    withDatabaseReference: variants.filter(v => db.has(v)).length,
    proxyEqualsDatabase: variants.filter(v => db.has(v) && ms.filter(m => `${m.model_key}|${m.storage_gb}` === v).every(m => m.variant_get_upto === db.get(v))).length,
    withoutDatabaseReference: variants.filter(v => !db.has(v)),
  };
  if (basis === 'database') ms = ms.filter(m => db.has(`${m.model_key}|${m.storage_gb}`)).map(m => ({ ...m, variant_get_upto: db.get(`${m.model_key}|${m.storage_gb}`)! }));
  const rows = await replayService(ms);
  const summarize = (rr: typeof rows) => {
    const priced = rr.filter(r => r.ok), abs = priced.map(r => Math.abs(r.error!)).sort((a, b) => a - b);
    return { cases: rr.length, priced: priced.length, inspection: rr.length - priced.length,
      mae: abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length), p95: abs[Math.floor(abs.length * .95)] ?? 0, max: abs.at(-1) ?? 0,
      within20: abs.filter(x => x <= 20).length / Math.max(1, abs.length), within100: abs.filter(x => x <= 100).length / Math.max(1, abs.length),
      over100: priced.filter(r => r.error! > 100).length, arithmeticErrors: priced.filter(r => r.price !== r.expectedPrice).length };
  };
  const report = { referenceBasis: basis === 'proxy' ? 'report_flawless_base_proxy' : 'verified_database_reference_2026-10-25', coverage,
    overall: summarize(rows), byModel: Object.fromEntries([...new Set(ms.map(m => m.model_key))].sort().map(k => [k, summarize(rows.filter(r => r.m.model_key === k))])),
    worst: rows.filter(r => r.ok).sort((a, b) => Math.abs(b.error!) - Math.abs(a.error!)).slice(0, 25).map(r => ({ model: r.m.model_key, storage: r.m.storage_gb, deviations: r.m.deviations, reference: r.m.variant_get_upto, observed: r.m.base, equivalent: r.equivalent, error: r.error, archive: r.m.archive, member: r.m.member, case: r.m.case_id })) };
  const label = process.argv.find(a => a.startsWith('--label='))?.slice(8) ?? 'current';
  fs.writeFileSync(path.join(FINAL_DATA_DIR, `service-${label}${basis === 'database' ? '-database' : ''}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ referenceBasis: report.referenceBasis, ...report.overall }));
  console.log(JSON.stringify(coverage));
  console.log(Object.entries(report.byModel).map(([k, s]) => `${k}: ${s.priced}/${s.cases}, MAE ${s.mae.toFixed(1)}, max ${s.max}`).join('\n'));
}
if (require.main === module) run().catch(e => { console.error(e); process.exitCode = 1; });
