/**
 * Replays every primary measured quote of every runner corpus through the current calibrations at its
 * test-day reference (pure model, no service). Prints per-brand within-INR-20 counts and the worst rows.
 */
import fs from 'node:fs';
import { runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { evaluateRunner } from '../../lib/pricing/cashifyRunnerModel/model';
import { runnerStorageIdentity } from '../../lib/pricing/cashifyRunnerModel/identity';
const out: Record<string, { n: number; within20: number; refused: number; worst: number }> = {}; const bad: any[] = [];
const seen = new Set<string>();
for (const d of fs.readdirSync('data/pricing-evidence').filter(d => /^[a-z]+-2026-11-\d\d$/.test(d)).sort().reverse()) {
  const f = `data/pricing-evidence/${d}/measurements.jsonl`; if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').trim().split('\n')) {
    const r = JSON.parse(line); if (r.status !== 'quoted' || r.primary === false) continue;
    const id = r.model + '|' + r.storage + '|' + JSON.stringify(r.diagnostics); if (seen.has(id)) continue; seen.add(id);
    const p = runnerScope(r.model); if (!p) continue;
    const s = out[p.brand] ??= { n: 0, within20: 0, refused: 0, worst: 0 }; s.n++;
    try { const e = evaluateRunner(p, r.reference, r.diagnostics, r.storage).price - r.base; if (Math.abs(e) <= 20) s.within20++; else bad.push({ model: r.model, storage: r.storage, case: r.caseId, label: r.label, e }); s.worst = Math.max(s.worst, Math.abs(e)); }
    catch (e: any) { s.refused++; }
  }
}
console.table(out); console.log('outside 20:', bad.length); console.log(bad.slice(0, 15).map(b => JSON.stringify(b)).join('\n'));
