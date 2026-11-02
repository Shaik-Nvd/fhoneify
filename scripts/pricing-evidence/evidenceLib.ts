import fs from 'node:fs';
import path from 'node:path';
import type { DiagnosticsType } from '../../lib/pricingCalculator';
import { warrantyVoidedByDiagnostics } from '../../lib/pricing/diagnostics';
import type { QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import { SEED_DEVICES } from '../../lib/seed_devices';

/** Normalized Cashify observation, as written by normalize_cashify_quotes.py + analyze_dataset.py. */
export interface Measurement {
  measurement_id: string;
  obs_id: string;
  archive: string;
  member: string;
  case_id: string;
  family: string;
  model_key: string;
  model_label: string | null;
  storage: string;
  storage_gb: number;
  ram_gb: number | null;
  observed_date: string | null;
  date_basis: string;
  variant_get_upto: number;
  get_upto_basis: string;
  outcome: 'NUMERIC_QUOTE' | 'NO_OFFER';
  selling: number | null;
  base: number | null;
  payout: number | null;
  processing_fee: number | null;
  imei_fee: number | null;
  inputs: Record<'calls' | 'touch' | 'original_screen' | 'warranty' | 'bill' | 'box' | 'charger' | 'esim' | 'age', { value: string; basis: string }>;
  defect_codes: string[];
  deviations: string[];
  class: string;
  n_dev: number;
  config_key: string;
  config_id: string;
  also_in: string[];
  export_duplicate_count: number;
  flags: string[];
}

export const EVIDENCE_DIR = path.resolve(__dirname, '../../data/pricing-evidence');

const readJsonl = (file: string): Measurement[] => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
/** The earlier collection (measurements.jsonl) plus, unless a single file is named, the audited 2026-10-28 import
 * (measurements-2026-10-28.jsonl, written by import-new-data.ts). */
/** Models whose flawless quote sits a fixed amount below the database reference (new-data-2026-10-28/db-reference-gaps.json). The reference
 * proxy of an imported record is its flawless quote PLUS this offset, i.e. the reference the database would have returned. */
export const CLEAN_OFFSET: Record<string, number> = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, 'new-data-2026-10-28/db-reference-gaps.json'), 'utf8')).cleanOffsetByModel;

export function loadMeasurements(file?: string): Measurement[] {
  if (file) return readJsonl(file);
  // plus the quotes recorded live on cashify.in while checking the release (live-check-2026-10-28.py)
  const extras = ['measurements-2026-10-28.jsonl', 'live-check-2026-10-28.jsonl', 'measurements-2026-10-30.jsonl'].map(f => path.join(EVIDENCE_DIR, f));
  const all = [...readJsonl(path.join(EVIDENCE_DIR, 'measurements.jsonl')), ...extras.flatMap(f => (fs.existsSync(f) ? readJsonl(f) : []))];
  const unique = new Map<string, Measurement>();
  for (const m of all) {
    const prior = unique.get(m.measurement_id);
    if (!prior) unique.set(m.measurement_id, m);
    else if (prior.config_key !== m.config_key || prior.base !== m.base || prior.model_key !== m.model_key || prior.storage_gb !== m.storage_gb) {
      throw new Error(`conflicting duplicate measurement ${m.measurement_id}`);
    } else {
      prior.flags = [...new Set([...prior.flags, ...m.flags])];
      prior.also_in = [...new Set([...prior.also_in, ...m.also_in, `${m.archive}::${m.member}::${m.case_id}`])];
      prior.export_duplicate_count += m.export_duplicate_count;
    }
  }
  return [...unique.values()];
}

// ---------------------------------------------------------------------------
// Cashify catalog code -> Fhoneify quote-form answers (the same strings the live
// quote page sends; see app/quote/page.tsx and docs/HANDOFF_CODEX.md).
// ---------------------------------------------------------------------------
export const HARDWARE_ID: Record<string, string> = {
  F01: 'front_camera', F02: 'back_camera', F03: 'volume', F04: 'fingerprint', F05: 'wifi',
  F06: 'speaker', F07: 'silent', F08: 'face', F09: 'power', F10: 'charging', F11: 'audio_receiver',
  F12: 'camera_glass', F13: 'microphone', F14: 'bluetooth', F15: 'vibrator', F16: 'proximity',
  F17: 'battery_service', F18: 'battery_health',
};
export const SCREEN_CONDITION: Record<string, string> = {
  S01: 'Screen cracked/ glass broken', S02: 'Chipped/cracked outside display area',
  S03: 'More than 2 scratches on screen', S04: '1-2 scratches on screen',
};
export const SCREEN_SPOTS: Record<string, string> = {
  D01: 'Large/ heavy visible spots on screen', D02: '3 or more minor spots on screen', D03: '1-2 minor spots on screen',
};
export const SCREEN_LINES: Record<string, string> = { D04: 'Visible line(s) on display', D05: 'Display faded along edges' };
export const SCREEN_DISCOLORATION: Record<string, string> = { D06: 'Major Discoloration', D07: 'Minor Discoloration' };
export const BODY_SCRATCHES: Record<string, string> = { C01: 'More than 2 scratches', C02: '1-2 scratches' };
export const BODY_DENTS: Record<string, string> = { C03: 'Major dent(s) or more than 2', C04: '1-2 minor dents' };
export const BODY_PANEL: Record<string, string> = { P01: 'Cracked/ broken side or back panel', P02: 'Missing side or back panel' };
export const BODY_BENT: Record<string, string> = { P03: 'Bent/ curved panel', P04: 'Loose screen (Gap in screen and body)' };

const AGE_ID: Record<string, 'below3' | '3to6' | '6to11' | 'above11'> = {
  'Below 3 months': 'below3', '3 months - 6 months': '3to6', '6 months - 11 months': '6to11', 'Above 11 months': 'above11',
};

const boolOf = (v: string): boolean | null => (v === 'yes' ? true : v === 'no' ? false : null);

export function modelSemantics(ms: Measurement[]): Map<string, QuestionnaireSemantics & { evidence: string }> {
  const out = new Map<string, QuestionnaireSemantics & { evidence: string }>();
  const byModel = new Map<string, Measurement[]>();
  for (const m of ms) (byModel.get(m.model_key) ?? byModel.set(m.model_key, []).get(m.model_key)!).push(m);
  for (const [model, rows] of byModel) {
    // Only trust "was the question shown" where the source records it per case (TXT = explicit); JSON files carry file defaults.
    const explicit = rows.filter(r => r.family === 'case_txt' || r.family.startsWith('new_'));
    const mode = (key: 'warranty' | 'bill'): 'ASKED' | 'NOT_ASKED' => {
      if (!explicit.length) return 'ASKED';
      return explicit.some(r => r.inputs[key].value === 'yes' || r.inputs[key].value === 'no') ? 'ASKED' : 'NOT_ASKED';
    };
    const warrantyMode = mode('warranty');
    const billMode = mode('bill');
    const asked = rows.filter(r => r.inputs.warranty.value === 'yes');
    const ageMode: 'ASKED' | 'NOT_ASKED' = warrantyMode === 'NOT_ASKED' ? 'NOT_ASKED'
      : asked.some(r => !['not_shown', 'unknown', 'not_asked'].includes(String(r.inputs.age.value))) ? 'ASKED' : (asked.length ? 'NOT_ASKED' : 'ASKED');
    out.set(model, { warrantyMode, billMode, ageMode, evidence: explicit.length ? 'case_txt explicit' : 'json file defaults (assumed ASKED)' } as any);
  }
  return out;
}

/** Flag set by import-new-data.ts on a quote that carries a fault choice Cashify evidently did not offer for that capacity: the quote equals the
 * flawless one while the same choice is priced at other capacities of the model. Such a control is not a zero-priced fault. */
export const UNAVAILABLE_OPTION_FLAG = 'unavailable_option_control';

/** Inputs the source recorded as unknown, or choices that were probably not offered (never replaced by an ideal-condition default). */
export function hasUnknownInput(m: Measurement): boolean {
  return (['calls', 'touch', 'original_screen', 'warranty', 'bill', 'box'] as const).some(k => m.inputs[k].value === 'unknown') ||
    m.flags.some(f => f.startsWith(UNAVAILABLE_OPTION_FLAG));
}

/**
 * The answers the live quote form would send for this Cashify configuration.
 *
 * voidRule 'current' reproduces today's form, which rewrites warranty=true to false for any spots, lines,
 * discoloration, loose screen, etc. (lib/pricing/diagnostics.ts warrantyVoidedByDiagnostics). 'none' sends the
 * customer's warranty answer untouched, which is what the evidence-calibrated engine expects: it decides the
 * age state itself from the answers (Cashify skips its age question only for Q02, Q03, S01, P01, P02, P03).
 */
export function toDiagnostics(m: Measurement, voidRule: 'current' | 'none' = 'current'): DiagnosticsType {
  const i = m.inputs;
  const codes = new Set(m.defect_codes);
  const pick = (table: Record<string, string>): string | null => {
    const hit = Object.keys(table).find(c => codes.has(c));
    return hit ? table[hit] : null;
  };
  const hardware = [...codes].filter(c => c.startsWith('F')).map(c => HARDWARE_ID[c]).filter(Boolean);
  const defects: string[] = [];
  const d: DiagnosticsType = {
    calls: boolOf(i.calls.value),
    touch: boolOf(i.touch.value),
    originalScreen: boolOf(i.original_screen.value),
    defects,
    screenCondition: pick(SCREEN_CONDITION),
    screenSpots: pick(SCREEN_SPOTS),
    screenLines: pick(SCREEN_LINES),
    screenDiscoloration: pick(SCREEN_DISCOLORATION),
    bodyScratches: pick(BODY_SCRATCHES),
    bodyDents: pick(BODY_DENTS),
    bodyPanel: pick(BODY_PANEL),
    bodyBent: pick(BODY_BENT),
    hardware,
    accessories: [],
    warranty: boolOf(i.warranty.value),
    validBill: boolOf(i.bill.value),
    eSim: i.esim.value === 'Single eSIM' || i.esim.value === 'Dual eSIM' ? i.esim.value : null,
    mobileAge: null,
  };
  if (d.screenCondition) defects.push('screen_scratch');
  if (d.screenSpots || d.screenLines || d.screenDiscoloration) defects.push('screen_spot');
  if (d.bodyScratches || d.bodyDents) defects.push('body_scratch');
  if (d.bodyPanel || d.bodyBent) defects.push('panel_missing');
  if (i.box.value === 'yes') d.accessories.push('box');
  if (i.charger.value === 'yes') d.accessories.push('charger');
  if (i.box.value === 'yes' || i.box.value === 'no') d.box = i.box.value === 'yes';
  // The form voids a warranty=true answer that the damage contradicts (app/quote/page.tsx).
  if (voidRule === 'current' && d.warranty === true && warrantyVoidedByDiagnostics(d)) d.warranty = false;
  const age = AGE_ID[String(i.age.value)];
  if (d.warranty === false) d.mobileAge = 'above11';
  else if (d.warranty === true) d.mobileAge = age ?? 'below3';
  return d;
}

export function rupees(n: number | null | undefined): string {
  return n == null ? '-' : `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Cashify's observed fee schedule (processing fee by headline selling price). */
export function cashifyProcessingFee(selling: number): number {
  if (selling <= 3000) return 49;
  if (selling <= 5000) return 69;
  return 99;
}

export function stats(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0, mean: NaN, median: NaN, p90: NaN, p95: NaN, max: NaN };
  const q = (p: number) => v[Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1))];
  return { n, mean: v.reduce((a, b) => a + b, 0) / n, median: n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2, p90: q(0.9), p95: q(0.95), max: v[n - 1] };
}

// ---------------------------------------------------------------------------
// Catalog resolution. The seed catalog spells storage several ways ("256GB",
// "128 GB", "6 GB/128 GB", "12 GB/2 TB"); evidence is matched by model + capacity
// and the way each variant resolved is reported, never silently mapped.
// ---------------------------------------------------------------------------
export interface CatalogHit { id: string; model: string; storage: string; ram: string | null; basePrice: number | null }
const capacityGb = (storage: string): number | null => {
  const m = String(storage).match(/(\d+)\s*(GB|TB)\s*$/i);
  return m ? Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1) : null;
};
export function catalogCandidates(modelKey: string, storageGb: number): CatalogHit[] {
  const wanted = `apple ${modelKey}`.toLowerCase();
  return (SEED_DEVICES as any[])
    .filter(d => String(d.brand).toLowerCase() === 'apple' && String(d.model).toLowerCase() === wanted && capacityGb(d.storage) === storageGb)
    .map(d => ({ id: d.id, model: d.model, storage: d.storage, ram: d.ram ?? null, basePrice: d.basePrice ?? null }));
}
/** First candidate wins, matching findCatalogDevice() / the quote page's allDevices.find(). */
export function resolveCatalog(modelKey: string, storageGb: number): { hit: CatalogHit | null; candidates: CatalogHit[] } {
  const candidates = catalogCandidates(modelKey, storageGb);
  return { hit: candidates[0] ?? null, candidates };
}
