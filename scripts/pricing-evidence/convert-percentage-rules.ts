/**
 * Converts measured runner rules that Cashify charges as a share of the reference from 'fixed' to 'pct'.
 *
 * Why: a model tested on one storage gives one reference, where a fixed amount and a percentage fit
 * equally; the fitter picked 'fixed'. Across all multi-storage models Cashify charges these answers as a
 * percentage of the reference (Wi-Fi/Bluetooth/fingerprint 98-99% of models, age 75-86%, bent/loose/panel
 * 74-80%; dents and screen scratches 74% on newer phones). A fixed rule then stays frozen when the weekly
 * refresh moves the reference. Repairs (cameras, display, battery, ports) are fixed rupee amounts on 99% of
 * multi-storage models and are not touched.
 *
 * A rule is converted only when the percentage reproduces every storage it was measured on within INR 10
 * at that storage's test-day reference; otherwise the model's own data says fixed and it stays.
 * fitCalibration applies this to every fit, so a refit reproduces the stored calibration.
 *
 *   node --import tsx scripts/pricing-evidence/convert-percentage-rules.ts [--write]
 */
import fs from 'node:fs';
import { modelKey, storageKey, round10, type RunnerCalibration } from '../../lib/pricing/cashifyRunnerModel/model';

const BOTH = ['hardware:wifi', 'hardware:bluetooth', 'hardware:fingerprint', 'hardware:hinge', 'age:3to6', 'age:6to11', 'age:above11', 'bent', 'loose', 'panel'];
const NEWER_ONLY = ['dent:0', 'dent:1', 'scratch:0'];
export const percentageKey = (key: string, hasAge: boolean) => BOTH.includes(key) || (hasAge && NEWER_ONLY.includes(key));

/** references: modelKey|storageKey -> test-day reference. Mutates and returns counts. */
export function convertPercentageRules(cal: RunnerCalibration, references: Map<string, number>) {
  const s = { converted: 0, keptFixed: 0, noReference: 0 };
  for (const [key, profile] of Object.entries(cal.profiles)) for (const [id, rule] of Object.entries(profile.rules)) {
    if (rule.form !== 'fixed' || rule.inferredFrom || !percentageKey(id, profile.hasAge) || rule.value <= 0) continue;
    const storages = rule.measuredStorages ?? Object.keys(profile.variants);
    const rs = storages.map(st => references.get(key + '|' + st));
    if (!rs.length || rs.some(r => !r)) { s.noReference++; continue; }
    const pct = rs.reduce((a, r) => a + r! * rule.value, 0) / rs.reduce((a, r) => a + r! * r!, 0);
    if (rs.every(r => Math.abs(round10(pct * r!) - rule.value) <= 10)) {
      profile.rules[id] = { ...rule, form: 'pct', value: pct, convertedFrom: { form: 'fixed', value: rule.value, references: Object.fromEntries(storages.map((st, i) => [st, rs[i]!])) } } as any;
      s.converted++;
    } else s.keptFixed++;
  }
  return s;
}

export function referencesFrom(rows: { status: string; primary?: boolean; reference: number | null; model: string; storage: string }[], into = new Map<string, number>()) {
  for (const r of rows) if (r.status === 'quoted' && r.primary !== false && r.reference && r.reference > 0) into.set(modelKey(r.model) + '|' + storageKey(r.storage), r.reference);
  return into;
}

if (require.main === module) {
  const references = new Map<string, number>();
  for (const d of fs.readdirSync('data/pricing-evidence').filter(d => /^[a-z]+-2026-11-\d\d$/.test(d)).sort()) {
    const f = `data/pricing-evidence/${d}/measurements.jsonl`; if (!fs.existsSync(f)) continue;
    referencesFrom(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l)), references);
  }
  const summary: Record<string, object> = {};
  for (const file of fs.readdirSync('lib/pricing/cashifyRunnerModel').filter(f => /^calibration\.(?!generic)\w+\.json$/.test(f))) {
    const path = 'lib/pricing/cashifyRunnerModel/' + file;
    const cal: RunnerCalibration = JSON.parse(fs.readFileSync(path, 'utf8'));
    summary[file] = convertPercentageRules(cal, references);
    if (process.argv.includes('--write')) fs.writeFileSync(path, JSON.stringify(cal, null, 2) + '\n');
  }
  console.table(summary);
}
