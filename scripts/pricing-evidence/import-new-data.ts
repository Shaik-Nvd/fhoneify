/**
 * Converts the audited 2026-10-28 Cashify case records (data/pricing-evidence/new-data-2026-10-28/case-records.jsonl)
 * into the Measurement shape the calibration and validation tooling already consumes.
 *
 *   npx tsx scripts/pricing-evidence/import-new-data.ts           # writes measurements-2026-10-28.jsonl
 *   npx tsx scripts/pricing-evidence/import-new-data.ts --check   # only asserts the counts
 *
 * Rules (docs/PRICING_NEW_DATA_2026_10_28.md):
 *  - only records with status 'priced' become measurements; pending/prepared and unavailable records are counted, never priced;
 *  - the variant reference of a record is the flawless quote of the SAME report and capacity (a proxy for the Get Upto in force
 *    that day, labelled get_upto_basis 'report_flawless_base'); it is not a verified database reference;
 *  - base = selling + IMEI fee; where the fee was not captured the standard INR 20 is used and flagged;
 *  - Samsung records are retained in the source file and ignored here.
 * The importer fails loudly: an unexpected count, status, or a capacity without exactly one flawless quote throws.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CLEAN_OFFSET, UNAVAILABLE_OPTION_FLAG, type Measurement } from './evidenceLib';

export const NEW_DATA_DIR = path.resolve(__dirname, '../../data/pricing-evidence/new-data-2026-10-28');
export const NEW_MEASUREMENTS_FILE = path.resolve(__dirname, '../../data/pricing-evidence/measurements-2026-10-28.jsonl');

/** Counts of the audited file. A different count means the file changed or a format was dropped: stop and re-audit. */
export const EXPECTED = { records: 6795, priced: 5218, pending: 1396, unavailable: 181, pricedIphone: 4948, pricedSamsung: 270 };

interface CaseRecord {
  model: string; storage_gb: number; case_id: string; family: string; selling: number | null; base: number | null; imei: number | null;
  inputs: { calls: boolean | null; touch: boolean | null; originalScreen: boolean | null; warranty: boolean | null; validBill: boolean | null; box: boolean | null; charger: boolean | null; age: string | null; esim: string | null; codes: string[] };
  status: string; archive: string; member: string; line: number; date: string | null; raw_sha256: string; sources: { archive: string; member: string; line: number }[];
}

export function loadCaseRecords(file = path.join(NEW_DATA_DIR, 'case-records.jsonl')): CaseRecord[] {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

export function assertCounts(records: CaseRecord[]): void {
  const by = (f: (r: CaseRecord) => boolean) => records.filter(f).length;
  const got = {
    records: records.length, priced: by(r => r.status === 'priced'), pending: by(r => r.status === 'pending'), unavailable: by(r => r.status === 'unavailable'),
    pricedIphone: by(r => r.status === 'priced' && r.model.startsWith('iPhone')), pricedSamsung: by(r => r.status === 'priced' && r.model.startsWith('Samsung')),
  };
  const unknown = records.filter(r => !['priced', 'pending', 'unavailable'].includes(r.status));
  if (unknown.length) throw new Error(`unsupported record status: ${[...new Set(unknown.map(r => r.status))].join(', ')}`);
  for (const k of Object.keys(EXPECTED) as (keyof typeof EXPECTED)[]) {
    if (got[k] !== EXPECTED[k]) throw new Error(`new-data import count mismatch: ${k} expected ${EXPECTED[k]}, found ${got[k]}`);
  }
}

const isIdeal = (i: CaseRecord['inputs']) =>
  i.calls === true && i.touch === true && i.originalScreen === true && i.warranty !== false && i.validBill !== false && i.box === true &&
  i.charger !== false && (i.age == null || i.age === 'Below 3 months') && (i.esim == null || i.esim === 'single esim') && i.codes.length === 0;

const yn = (v: boolean | null): string => (v === true ? 'yes' : v === false ? 'no' : 'not_asked');
const AGE_LABEL: Record<string, string> = { 'Below 3 months': 'Below 3 months', '3 months - 6 months': '3 months - 6 months', '6 months - 11 months': '6 months - 11 months', 'Above 11 months': 'Above 11 months' };
const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);
const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

export function toMeasurements(records: CaseRecord[], options: { referenceOffsets?: Record<string, number>; baselineCaseId?: string } = {}): { measurements: Measurement[]; skipped: { reason: string; count: number }[] } {
  const referenceOffsets = options.referenceOffsets ?? CLEAN_OFFSET;
  const priced = records.filter(r => r.status === 'priced' && r.model.startsWith('iPhone'));
  // one flawless quote per (report member, capacity): the reference proxy
  const groups = new Map<string, CaseRecord[]>();
  for (const r of priced) { const k = `${r.archive}::${r.member}::${r.storage_gb}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
  const baselineOf = new Map<string, number>();
  for (const [k, rs] of groups) {
    const prices = new Set(rs.filter(r => options.baselineCaseId != null ? r.case_id === options.baselineCaseId : isIdeal(r.inputs)).map(r => r.selling));
    if (prices.size !== 1) throw new Error(`report ${k} has ${prices.size} distinct flawless quotes; expected exactly one`);
    baselineOf.set(k, [...prices][0]!);
  }
  const out: Measurement[] = [];
  const seen = new Set<string>();
  for (const r of priced) {
    const i = r.inputs;
    const deviations: string[] = [];
    if (i.calls === false) deviations.push('Q01');
    if (i.touch === false) deviations.push('Q02');
    if (i.originalScreen === false) deviations.push('Q03');
    if (i.warranty === false) deviations.push('WARRANTY_NO');
    if (i.validBill === false) deviations.push('BILL_NO');
    if (i.age && i.age !== 'Below 3 months') deviations.push(`AGE:${AGE_LABEL[i.age] ?? i.age}`);
    if (i.box === false) deviations.push('BOX_NO');
    if (i.charger === false) deviations.push('CHARGER_NO');
    if (i.esim === 'dual esim') deviations.push('ESIM_DUAL');
    const codes = [...i.codes].sort();
    deviations.push(...codes);
    const selling = r.selling!;
    const flaws: string[] = [];
    const fee = r.imei ?? 20;
    if (r.imei == null) flaws.push('imei_fee_assumed_20');
    const base = r.base ?? selling + fee;
    const reference = baselineOf.get(`${r.archive}::${r.member}::${r.storage_gb}`)! + fee + (referenceOffsets[r.model] ?? 0);
    const configKey = [r.model, r.storage_gb, yn(i.calls), yn(i.touch), yn(i.originalScreen), yn(i.warranty), yn(i.validBill), yn(i.box), yn(i.charger), i.age ?? 'not_shown', i.esim ?? 'not_asked', codes.join(',')].join('|');
    // exact repeats inside one report (template cases that repeat the same selection) are one observation, not two
    const dedupKey = `${r.archive}::${r.member}::${configKey}::${selling}::${r.date}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const input = (value: string, basis: string) => ({ value, basis });
    out.push({
      measurement_id: sha(`${r.model}:${r.archive}:${r.member}:${r.storage_gb}:${r.case_id}:${r.raw_sha256}`), obs_id: sha(`${r.archive}:${r.member}:${r.line}`),
      archive: r.archive, member: r.member, case_id: String(r.case_id), family: `new_${r.family}`,
      model_key: r.model, model_label: null, storage: storageLabel(r.storage_gb), storage_gb: r.storage_gb, ram_gb: null,
      observed_date: r.date, date_basis: r.date ? 'report_header' : 'unknown',
      variant_get_upto: reference, get_upto_basis: referenceOffsets[r.model] ? 'report_flawless_base_plus_clean_offset' : 'report_flawless_base',
      outcome: 'NUMERIC_QUOTE', selling, base, payout: null, processing_fee: null, imei_fee: fee,
      inputs: {
        calls: input(yn(i.calls), 'explicit'), touch: input(yn(i.touch), 'explicit'), original_screen: input(yn(i.originalScreen), 'explicit'),
        warranty: input(yn(i.warranty), i.warranty == null ? 'question_not_recorded' : 'explicit'), bill: input(yn(i.validBill), i.validBill == null ? 'question_not_recorded' : 'explicit'),
        box: input(yn(i.box), 'explicit'), charger: input(yn(i.charger), i.charger == null ? 'not_offered' : 'explicit'),
        esim: input(i.esim === 'dual esim' ? 'Dual eSIM' : i.esim === 'single esim' ? 'Single eSIM' : 'not_asked', i.esim == null ? 'not_offered' : 'explicit'),
        age: input(i.age ?? 'not_shown', i.age == null ? 'not_shown' : 'explicit'),
      },
      defect_codes: codes, deviations, class: deviations.length === 0 ? 'baseline' : deviations.length === 1 ? 'single_defect' : 'combo',
      n_dev: deviations.length, config_key: configKey, config_id: sha(configKey), also_in: [], export_duplicate_count: 1, flags: flaws,
    });
  }
  // A fault choice that changes nothing at one capacity but is priced at others was most likely not offered there: a no-change control, not a
  // zero-priced fault. The control and every combination in the same report that contains the choice are flagged and kept out of fitting.
  const single = out.filter(m => m.deviations.length === 1 && /^[FSDCP]/.test(m.deviations[0]));
  const pricedElsewhere = new Set(single.filter(m => m.variant_get_upto - m.base! >= 100).map(m => `${m.model_key}|${m.deviations[0]}`));
  const controls = new Set(single.filter(m => Math.abs(m.variant_get_upto - m.base!) <= 10 && pricedElsewhere.has(`${m.model_key}|${m.deviations[0]}`))
    .map(m => `${m.archive}|${m.member}|${m.storage_gb}|${m.deviations[0]}`));
  let flagged = 0;
  for (const m of out) {
    for (const code of m.defect_codes) if (controls.has(`${m.archive}|${m.member}|${m.storage_gb}|${code}`)) { m.flags.push(`${UNAVAILABLE_OPTION_FLAG}:${code}`); flagged++; break; }
  }
  const skipped = [
    { reason: 'pending/prepared (no price recorded)', count: records.filter(r => r.status === 'pending').length },
    { reason: 'unavailable (option not offered)', count: records.filter(r => r.status === 'unavailable').length },
    { reason: 'Samsung (retained, out of scope)', count: records.filter(r => r.status === 'priced' && !r.model.startsWith('iPhone')).length },
    { reason: 'exact repeat inside one report', count: priced.length - out.length },
    { reason: 'kept as measurements but excluded from fitting: fault choice apparently not offered at that capacity', count: flagged },
  ];
  return { measurements: out, skipped };
}

if (require.main === module) {
  const records = loadCaseRecords();
  assertCounts(records);
  const { measurements, skipped } = toMeasurements(records);
  console.log(`records=${records.length} measurements=${measurements.length}`, JSON.stringify(skipped));
  if (!process.argv.includes('--check')) {
    fs.writeFileSync(NEW_MEASUREMENTS_FILE, measurements.map(m => JSON.stringify(m)).join('\n') + '\n');
    console.log(`wrote ${path.relative(process.cwd(), NEW_MEASUREMENTS_FILE)}`);
  }
}
