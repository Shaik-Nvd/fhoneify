import fs from 'node:fs';
import path from 'node:path';
import { replayService } from './replay-service';
import { loadMeasurements, hasUnknownInput } from './evidenceLib';
import { FINAL_DATA_DIR, FINAL_MEASUREMENTS_FILE } from './import-final-data';

async function run() {
  const ms = loadMeasurements(FINAL_MEASUREMENTS_FILE).filter(m => !hasUnknownInput(m));
  const rows = await replayService(ms);
  const summarize = (rr: typeof rows) => {
    const priced = rr.filter(r => r.ok), abs = priced.map(r => Math.abs(r.error!)).sort((a, b) => a - b);
    return { cases: rr.length, priced: priced.length, inspection: rr.length - priced.length,
      mae: abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length), p95: abs[Math.floor(abs.length * .95)] ?? 0, max: abs.at(-1) ?? 0,
      within20: abs.filter(x => x <= 20).length / Math.max(1, abs.length), within100: abs.filter(x => x <= 100).length / Math.max(1, abs.length),
      over100: priced.filter(r => r.error! > 100).length, arithmeticErrors: priced.filter(r => r.price !== r.expectedPrice).length };
  };
  const report = { overall: summarize(rows), byModel: Object.fromEntries([...new Set(ms.map(m => m.model_key))].sort().map(k => [k, summarize(rows.filter(r => r.m.model_key === k))])),
    worst: rows.filter(r => r.ok).sort((a, b) => Math.abs(b.error!) - Math.abs(a.error!)).slice(0, 25).map(r => ({ model: r.m.model_key, storage: r.m.storage_gb, deviations: r.m.deviations, observed: r.m.base, equivalent: r.equivalent, error: r.error, archive: r.m.archive, member: r.m.member, case: r.m.case_id })) };
  const label = process.argv.find(a => a.startsWith('--label='))?.slice(8) ?? 'current';
  fs.writeFileSync(path.join(FINAL_DATA_DIR, `service-${label}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.overall));
  console.log(Object.entries(report.byModel).map(([k, s]) => `${k}: ${s.priced}/${s.cases}, MAE ${s.mae.toFixed(1)}, max ${s.max}`).join('\n'));
}
run().catch(e => { console.error(e); process.exitCode = 1; });
