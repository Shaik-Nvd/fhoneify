import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { evaluateDeduction, modelKey, round10, runnerFaults, storageKey, type DeductionRule, type RunnerCalibration, type RunnerProfile } from '../../lib/pricing/cashifyRunnerModel/model';
import type { RunnerMeasurement } from './import-cashify-runner-data';

export interface FitPoint { reference: number; value: number; storage: string }
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const residual = (rule: DeductionRule, points: FitPoint[]) => Math.max(...points.map(p => Math.abs(round10(evaluateDeduction(rule, p.reference, p.storage)) - p.value)));

/** Model/storage observations select the simplest supported form. No final quote table. */
export function fitRule(points: FitPoint[], shape?: DeductionRule['form']): DeductionRule {
  if (!points.length) throw new Error('Cannot fit empty observations');
  if (points.some(p => !Number.isFinite(p.reference) || p.reference <= 0 || !Number.isFinite(p.value) || p.value < -10)) throw new Error('Invalid deduction observations');
  const support = points.length;
  const fixed: DeductionRule = { form: 'fixed', value: round10(mean(points.map(p => p.value))), support, residual: 0 };
  const pct: DeductionRule = { form: 'pct', value: points.reduce((s, p) => s + p.reference * p.value, 0) / points.reduce((s, p) => s + p.reference ** 2, 0), support, residual: 0 };
  const candidates = [fixed, pct];
  const mx = mean(points.map(p => p.reference)), my = mean(points.map(p => p.value));
  const variance = points.reduce((s, p) => s + (p.reference - mx) ** 2, 0);
  if (variance > 0) {
    const slope = points.reduce((s, p) => s + (p.reference - mx) * (p.value - my), 0) / variance;
    if (slope >= 0) candidates.push({ form: 'affine', value: my - slope * mx, slope, support, residual: 0 });
    const cap = Math.max(...points.map(p => p.value));
    const uncapped = points.filter(p => p.value < cap - 10);
    if (uncapped.length) candidates.push({ form: 'capped', value: cap,
      slope: uncapped.reduce((s, p) => s + p.reference * p.value, 0) / uncapped.reduce((s, p) => s + p.reference ** 2, 0), support, residual: 0 });
  }
  for (const candidate of candidates) candidate.residual = residual(candidate, points);
  const selected = candidates.find(c => (!shape || shape === c.form) && c.residual <= 10);
  if (selected) return selected;
  // During holdout, structure may be frozen from discovery before coefficients
  // are refitted. A single remaining point cannot identify an affine/capped rule.
  if (shape && shape !== 'byStorage') {
    const candidate = candidates.find(c => c.form === shape);
    if (candidate) return candidate;
  }
  const values: Record<string, number> = {};
  for (const p of points) {
    if (values[p.storage] !== undefined && Math.abs(values[p.storage] - p.value) > 10) throw new Error('Conflicting repair measurements at one storage');
    values[p.storage] = round10(p.value);
  }
  const fallback = fixed.residual <= pct.residual ? fixed : pct;
  return { form: 'byStorage', value: 0, values, fallback: { form: fallback.form as 'fixed' | 'pct', value: fallback.value }, support, residual: 0 };
}

export function fitCalibration(all: RunnerMeasurement[], brand: 'Nothing' | 'OnePlus', structure?: RunnerCalibration): RunnerCalibration {
  const rows = all.filter(r => r.brand === brand && r.status === 'quoted');
  if (!rows.length) throw new Error(`No private ${brand} measurements supplied; refusing to overwrite calibration`);
  const grouped = new Map<string, RunnerMeasurement[]>();
  for (const row of rows) { const key = modelKey(row.model); grouped.set(key, [...grouped.get(key) ?? [], row]); }
  const profiles: Record<string, RunnerProfile> = {};
  for (const [key, ms] of [...grouped].sort()) {
    const hasAge = ms.some(m => m.hasAge);
    const profile: RunnerProfile = { model: ms[0].model, brand, hasAge, variants: {}, rules: {} };
    const buckets = new Map<string, FitPoint[]>();
    const add = (id: string, row: RunnerMeasurement, value: number) => {
      const point = { reference: row.reference, value, storage: storageKey(row.storage) };
      const prior = buckets.get(id) ?? [];
      if (!prior.some(p => p.storage === point.storage && p.value === point.value)) buckets.set(id, [...prior, point]);
    };
    for (const m of ms) {
      const sk = storageKey(m.storage);
      if (!profile.variants[sk]) profile.variants[sk] = { accessories: m.offeredAccessories, scrap: NaN };
      if (m.diagnostics.calls === false) profile.variants[sk].scrap = m.base!;
      if (hasAge && (m.caseId.startsWith('age-') || m.diagnostics.warranty === false || m.diagnostics.validBill === false)) {
        const age = m.diagnostics.warranty === false || m.diagnostics.validBill === false ? 'above11' : m.diagnostics.mobileAge;
        if (age && age !== 'below3') add(`age:${age}`, m, m.reference - m.base!);
      }
    }
    for (const [id, points] of buckets) profile.rules[id] = fitRule(points, structure?.profiles[key]?.rules[id]?.form);
    for (const m of ms) {
      const faults = runnerFaults(m.diagnostics);
      if (m.caseId === 'baseline' || m.caseId.startsWith('physical-control') || m.caseId.startsWith('age-') || m.diagnostics.calls === false ||
        m.diagnostics.warranty === false || m.diagnostics.validBill === false) continue;
      const loss = m.reference - m.base!;
      if (faults.length === 1) {
        let id = faults[0];
        const forcesAge = ['original', 'touch', 'screen:0', 'panel', 'bent'].includes(id);
        const age = hasAge && forcesAge ? round10(evaluateDeduction(profile.rules['age:above11'], m.reference, storageKey(m.storage))) : 0;
        if (id === 'screen:0') id = 'crackedTotal';
        add(id, m, loss - age);
      } else if (faults.length === 0 && m.caseId.startsWith('accessory')) {
        const missing = m.offeredAccessories.filter(a => !m.diagnostics.accessories.includes(a));
        if (missing.length) add(missing.length > 1 ? 'both' : missing[0], m, loss);
      } else if (faults.length > 1) throw new Error('Combination source requires separate validation, not single-fault fitting');
    }
    // Fit original display repair before decomposing cracked glass's incremental repair.
    for (const [id, points] of buckets) if (id !== 'crackedTotal') profile.rules[id] = fitRule(points, structure?.profiles[key]?.rules[id]?.form);
    const cracked = buckets.get('crackedTotal');
    if (cracked) profile.rules.crackedExtra = fitRule(cracked.map(p => ({ ...p,
      value: p.value - round10(evaluateDeduction(profile.rules.original, p.reference, p.storage)) })), structure?.profiles[key]?.rules.crackedExtra?.form);
    profiles[key] = profile;
  }
  // The supplied 9RT run stopped after the functional tests. Its uncollected
  // repairs stay explicitly inferred from the same-generation 9R, never zero.
  if (brand === 'OnePlus') {
    const partial = profiles[modelKey('OnePlus 9RT 5G')];
    const donor = profiles[modelKey('OnePlus 9R 5G')];
    if (partial && donor) {
      for (const [id, rule] of Object.entries(donor.rules)) if (!partial.rules[id]) partial.rules[id] = { ...rule, support: 0, inferredFrom: donor.model };
      for (const variant of Object.values(partial.variants)) if (!Number.isFinite(variant.scrap)) {
        variant.scrap = Math.min(...Object.values(donor.variants).map(v => v.scrap));
        variant.scrapInferredFrom = donor.model;
      }
    }
  }
  for (const profile of Object.values(profiles)) if (Object.values(profile.variants).some(v => !Number.isFinite(v.scrap))) throw new Error(`${profile.model}: missing measured calls scrap and no approved sibling fallback`);
  return { version: 'cashify-runner-rules-v1', sourceHash: createHash('sha256').update(JSON.stringify(rows)).digest('hex'), profiles };
}

if (require.main === module) {
  const brand = process.argv.find(a => a.startsWith('--brand='))?.slice(8) ?? process.argv[process.argv.indexOf('--brand') + 1];
  if (brand !== 'Nothing' && brand !== 'OnePlus') throw new Error('--brand Nothing|OnePlus required');
  const input = process.argv.find(a => a.startsWith('--input='))?.slice(8) ?? `data/pricing-evidence/${brand === 'Nothing' ? 'nothing-2026-11-08' : 'oneplus-2026-11-09'}/measurements.jsonl`;
  if (!fs.existsSync(input)) throw new Error('Private source corpus absent; calibration unchanged');
  const measurements = fs.readFileSync(input, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const calibration = fitCalibration(measurements, brand);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.resolve(`lib/pricing/cashifyRunnerModel/calibration.${brand.toLowerCase()}.json`), JSON.stringify(calibration, null, 2) + '\n');
    const scopes: Record<string, object> = {};
    for (const name of ['nothing', 'oneplus']) {
      const data: RunnerCalibration = JSON.parse(fs.readFileSync(`lib/pricing/cashifyRunnerModel/calibration.${name}.json`, 'utf8'));
      for (const [key, profile] of Object.entries(data.profiles)) scopes[key] = { hasAge: profile.hasAge,
        variants: Object.fromEntries(Object.entries(profile.variants).map(([storage, v]) => [storage, { accessories: v.accessories }])) };
    }
    fs.writeFileSync('lib/pricing/cashifyRunnerModel/scope.json', JSON.stringify(scopes, null, 2) + '\n');
  }
  console.log(JSON.stringify({ brand, models: Object.keys(calibration.profiles).length, rules: Object.values(calibration.profiles).reduce((n, p) => n + Object.keys(p.rules).length, 0), written: process.argv.includes('--write') }));
}
