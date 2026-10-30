/** Final team intake. Reference is an explicitly labelled flawless-base proxy,
 * not a claim that the historic database reference was captured. No database I/O. */
import fs from 'node:fs';
import path from 'node:path';
import { loadCaseRecords, toMeasurements } from './import-new-data';
import type { Measurement } from './evidenceLib';

export const FINAL_DATA_DIR = path.resolve(__dirname, '../../data/pricing-evidence/final-data-2026-10-30');
export const FINAL_MEASUREMENTS_FILE = path.resolve(__dirname, '../../data/pricing-evidence/measurements-2026-10-30.jsonl');

export function importFinalData() {
  const raw = loadCaseRecords(path.join(FINAL_DATA_DIR, 'case-records.jsonl'));
  const summary = JSON.parse(fs.readFileSync(path.join(FINAL_DATA_DIR, 'summary.json'), 'utf8'));
  if (raw.length !== summary.records_after_case_export_dedup || raw.filter(r => r.status === 'priced').length !== 4334) throw new Error('final intake counts changed: re-audit');
  const records = raw.map(r => ({ ...r, inputs: { ...r.inputs, age: r.inputs.age?.replace(/^"|"$/g, '') ?? null } }));
  const priced = records.filter(r => r.status === 'priced' && r.model.startsWith('iPhone'));
  const groupKey = (r: typeof records[number]) => `${r.archive}|${r.member}|${r.storage_gb}`;
  // The baseline is an actual case 00 of the same report and capacity. A
  // supplementary report without one is retained in the audit, not guessed.
  const baselineGroups = new Set(priced.filter(r => r.case_id === '0').map(groupKey));
  const eligible = records.filter(r => r.status !== 'priced' || baselineGroups.has(groupKey(r)));
  const { measurements, skipped } = toMeasurements(eligible, { referenceOffsets: {}, baselineCaseId: '0' });
  const bySource = new Map(records.map(r => [`${r.archive}|${r.member}|${r.model}|${r.storage_gb}|${r.case_id}`, r]));
  const unique = new Map<string, Measurement>();
  for (const m of measurements) {
    const source = bySource.get(`${m.archive}|${m.member}|${m.model_key}|${m.storage_gb}|${m.case_id}`);
    if (!source) throw new Error(`measurement lost its source: ${m.measurement_id}`);
    if (m.deviations.length === 0 && m.base !== m.variant_get_upto) throw new Error(`unexplained clean-price loss: ${m.measurement_id}`);
    m.family = `final_${m.family.replace(/^new_/, '')}`;
    m.get_upto_basis = 'report_flawless_base_proxy_not_verified_database_reference';
    m.flags.push('reference_proxy');
    if (source) {
      m.payout = (source as any).payout ?? null;
      m.processing_fee = (source as any).processing ?? null;
    }
    const key = [m.config_key, m.variant_get_upto, m.base, m.observed_date ?? 'unknown'].join('|');
    const prior = unique.get(key);
    if (prior) { prior.also_in.push(`${m.archive}::${m.member}::${m.case_id}`); prior.export_duplicate_count++; }
    else unique.set(key, m);
  }
  return { measurements: [...unique.values()], report: {
    sourceRecords: raw.length, pricedRecords: priced.length,
    missingSameReportBaseline: priced.filter(r => !baselineGroups.has(groupKey(r))).map(r => ({ model: r.model, storage: r.storage_gb, archive: r.archive, case: r.case_id })),
    measurementsBeforeSemanticDedup: measurements.length, measurements: unique.size, repeatedMeasurements: measurements.length - unique.size, skipped,
  } };
}

if (require.main === module) {
  const { measurements, report } = importFinalData();
  fs.writeFileSync(FINAL_MEASUREMENTS_FILE, measurements.map(m => JSON.stringify(m)).join('\n') + '\n');
  fs.writeFileSync(path.join(FINAL_DATA_DIR, 'import-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
