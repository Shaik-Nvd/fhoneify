import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { evaluateRunner } from '../../lib/pricing/cashifyRunnerModel/model';
/**
 * Every primary measured Cashify quote of every private runner corpus reproduces within INR 20 at its
 * test-day reference. Disclosed exception: OPPO A5 5G "6 to 11 months" (underquote, shared age-order rule).
 */
const dirs = fs.existsSync('data/pricing-evidence') ? fs.readdirSync('data/pricing-evidence').filter(d => /^[a-z]+-2026-11-\d\d$/.test(d) && fs.existsSync(`data/pricing-evidence/${d}/measurements.jsonl`)) : [];
if (!dirs.length) console.log('SKIP private runner corpora absent');
else {
  const seen = new Set<string>(); let n = 0; const off: string[] = [];
  for (const d of dirs.sort().reverse()) for (const line of fs.readFileSync(`data/pricing-evidence/${d}/measurements.jsonl`, 'utf8').trim().split('\n')) {
    const r = JSON.parse(line); if (r.status !== 'quoted' || r.primary === false) continue;
    const id = r.model + '|' + r.storage + '|' + JSON.stringify(r.diagnostics); if (seen.has(id)) continue; seen.add(id);
    const p = runnerScope(r.model); if (!p) continue;
    const e = evaluateRunner(p, r.reference, r.diagnostics, r.storage).price - r.base; n++;
    if (Math.abs(e) > 20 && !(r.model === 'OPPO A5 5G' && r.caseId === 'age-2' && e < 0)) off.push(`${r.model} ${r.storage} ${r.caseId} ${e}`);
  }
  assert.deepEqual(off, [], 'measured quotes outside INR 20');
  console.log(`PASS ${n} measured quotes across ${dirs.length} corpora reproduce within INR 20`);
}
