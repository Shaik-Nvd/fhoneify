/**
 * Catalog loading and stratification attributes for the experiment planner.
 *
 * Reads only committed, offline files:
 *   - lib/seed_devices.ts                 (the catalog the quote flow uses)
 *   - lib/cashify_prices.generated.json   (Cashify "Get Upto" export)
 *   - lib/cashify_prices.meta.json        (freshness of each export row)
 *   - optionally a questionnaire snapshot JSON passed by path (a read-only
 *     export of CashifyQuestionnaireProfile; never fetched by this tool)
 *
 * The pure part (`buildModelIndex`) takes plain arrays so tests never touch
 * the real catalog.
 */
import { classifyPricingFamily } from '../../lib/pricing/families';
import type { QuestionMode } from './factors';

export interface RawCatalogRow {
  id?: string;
  brand: string;
  model: string;
  storage: string;
  ram?: string;
  cashifyLink?: string;
}

export interface GetUptoRow {
  price: number;
  status: string; // 'fresh' | 'refresh_failed' | ...
  lastVerifiedAt?: string;
}

/** Per-model questionnaire metadata, keyed by deviceKey or brand|model. */
export interface QuestionnaireSnapshotRow {
  warrantyMode?: QuestionMode;
  billMode?: QuestionMode;
  status?: string;
}

export type PriceBand = 'B1_lt5k' | 'B2_5k_10k' | 'B3_10k_20k' | 'B4_20k_40k' | 'B5_ge40k' | 'B0_unpriced';

/** Fixed rupee bands, roughly doubling. Fixed (not quantile) bands keep the
 * stratum boundaries stable across catalog refreshes, so a model does not
 * silently change stratum because other models were added. */
export function priceBand(price: number | null): PriceBand {
  if (price == null || !(price > 0)) return 'B0_unpriced';
  if (price < 5000) return 'B1_lt5k';
  if (price < 10000) return 'B2_5k_10k';
  if (price < 20000) return 'B3_10k_20k';
  if (price < 40000) return 'B4_20k_40k';
  return 'B5_ge40k';
}

export const PRICE_BANDS: PriceBand[] = ['B1_lt5k', 'B2_5k_10k', 'B3_10k_20k', 'B4_20k_40k', 'B5_ge40k'];

export interface Variant {
  deviceKey: string;
  brand: string;
  model: string;
  storage: string;
  ram: string | null;
  seedId: string | null;
  cashifyLink: string | null;
  getUpto: number | null;
  getUptoStatus: string;
  getUptoVerifiedAt: string | null;
}

export type DeviceClass = 'foldable' | 'premium_variant' | 'standard';

export interface ModelEntry {
  modelKey: string; // brand|model, lowercased
  brand: string;
  model: string;
  variants: Variant[];
  /** The variant used for the model's full experiment block: the fresh
   * variant with the median Get Upto (ties -> lower key); the first variant
   * when no variant has a fresh offline price. */
  representative: Variant;
  /** False when no variant has a fresh offline Get Upto: the model has no
   * price band and is only used to satisfy coverage rules. */
  representativeFresh: boolean;
  /** Candidate grouping from Fhoneify's own code - a hypothesis about how
   * Cashify groups devices, NOT evidence that Cashify does. */
  fhoneifyFamily: string;
  series: string;
  generation: number | null;
  /** 0 = oldest third of its series, 1 = middle, 2 = newest; null if the
   * series has fewer than 3 distinct generations. */
  eraTercile: 0 | 1 | 2 | null;
  deviceClass: DeviceClass;
  band: PriceBand;
  warrantyMode: QuestionMode;
  billMode: QuestionMode;
  /** Model-level special cases hard-coded somewhere in Fhoneify. Each tag is
   * a candidate exception to test, not a known Cashify rule. */
  exceptionTags: string[];
}

const lower = (s: unknown) => String(s ?? '').trim().toLowerCase();

export const deviceKeyOf = (brand: string, model: string, storage: string) =>
  `${lower(brand)}|${lower(model)}|${lower(storage)}`;

/** Same key lib/cashify_prices.generated.json is written with
 * (scripts/reference-pricing/export-cashify-prices.ts). */
export const legacyPriceKey = (model: string, storage: string) =>
  `${model}-${storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

/** Series + generation number, e.g. "Apple iPhone 13 Pro" -> iphone / 13,
 * "Samsung Galaxy S23 Ultra" -> galaxy s / 23. Heuristic; used only to
 * spread the sample across old and new models inside a series. */
export function seriesAndGeneration(brand: string, model: string): { series: string; generation: number | null } {
  let m = lower(model);
  const b = lower(brand);
  if (m.startsWith(b + ' ')) m = m.slice(b.length + 1);
  m = m.replace(/\b5g\b|\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  const match = m.match(/^(.*?)(\d+)/);
  if (!match) return { series: `${b}:${m.split(' ')[0] || m}`, generation: null };
  const prefix = match[1].replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return { series: `${b}:${prefix || '_'}`, generation: Number(match[2]) };
}

export function deviceClassOf(model: string): DeviceClass {
  const m = lower(model);
  if (/\bfold|\bflip|\brazr|oneplus open|\bopen\b/.test(m)) return 'foldable';
  if (/ultra|pro max|pro\+|\bpro\b|\bplus\b/.test(m)) return 'premium_variant';
  return 'standard';
}

/** Model-level exceptions Fhoneify's code already hard-codes. Sources:
 * lib/pricing/families.ts (named-model families), app/quote/page.tsx
 * (hasChargerInBox, hasSPen, age-skip models). */
export function exceptionTagsOf(brand: string, model: string, family: string): string[] {
  const b = lower(brand);
  const m = lower(model);
  const tags: string[] = [];
  if (/(^|\/ )(A34|A35|S24 Ultra|S26 Ultra|Find X9s|Find X9 Ultra|Find X9 Pro|Reno16c|Reno16)$/.test(family)) tags.push(`named_family:${family}`);
  if (family.includes('bill override')) tags.push('oneplus_bill_override');
  if (b === 'nothing' || b === 'cmf') tags.push(m === 'nothing phone 3' ? 'charger_in_box_exception' : 'no_charger_in_box');
  if (b === 'samsung' && /z flip|z fold|s21|s22|s23|s24|s25|s26/.test(m) && !/fold ?8/.test(m)) tags.push('no_charger_in_box');
  if (b === 'samsung' && !/fold ?8/.test(m) && (m.includes('note') || (m.includes('s') && m.includes('ultra')))) tags.push('s_pen');
  if (b === 'apple' && (m.includes('17e') || m.includes('16e'))) tags.push('age_skip_brand_new');
  if (b === 'samsung' && m.includes('flip7 fe')) tags.push('age_skip_brand_new');
  if (b === 'apple' && m.includes('15 pro max')) tags.push('age_forced_above11');
  if (b === 'apple' && (m.includes('17') || m.includes('air'))) tags.push('esim_question_candidate');
  return tags;
}

export interface BuildInputs {
  rows: RawCatalogRow[];
  prices: Record<string, number>;
  priceMeta: Record<string, { status?: string; lastVerifiedAt?: string }>;
  questionnaire?: Record<string, QuestionnaireSnapshotRow>;
}

export interface ModelIndex {
  models: ModelEntry[];
  variantCount: number;
  skippedRows: number;
  duplicateRows: number;
}

export function buildModelIndex(input: BuildInputs): ModelIndex {
  const seen = new Set<string>();
  const byModel = new Map<string, Variant[]>();
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const row of input.rows) {
    const brand = String(row?.brand ?? '').trim();
    const model = String(row?.model ?? '').trim();
    const storage = String(row?.storage ?? '').trim();
    if (!brand || !model || !storage) { skippedRows++; continue; }
    const key = deviceKeyOf(brand, model, storage);
    if (seen.has(key)) { duplicateRows++; continue; }
    seen.add(key);
    const pk = legacyPriceKey(model, storage);
    const price = input.prices[pk];
    const meta = input.priceMeta[pk];
    const v: Variant = {
      deviceKey: key, brand, model, storage,
      ram: row.ram ? String(row.ram) : null,
      seedId: row.id ?? null,
      cashifyLink: row.cashifyLink || null,
      getUpto: typeof price === 'number' && price > 0 ? price : null,
      getUptoStatus: typeof price === 'number' && price > 0 ? (meta?.status ?? 'unknown') : 'missing',
      getUptoVerifiedAt: meta?.lastVerifiedAt ?? null,
    };
    const mk = `${lower(brand)}|${lower(model)}`;
    if (!byModel.has(mk)) byModel.set(mk, []);
    byModel.get(mk)!.push(v);
  }

  const models: ModelEntry[] = [];
  for (const [modelKey, variants] of byModel) {
    variants.sort((a, b) => (a.deviceKey < b.deviceKey ? -1 : 1));
    const fresh = variants.filter((v) => v.getUpto != null && v.getUptoStatus === 'fresh')
      .sort((a, b) => a.getUpto! - b.getUpto! || (a.deviceKey < b.deviceKey ? -1 : 1));
    // Without a fresh offline price the first variant stands in; the
    // collector reads the live Get Upto on the page either way.
    const representative = fresh.length ? fresh[Math.floor((fresh.length - 1) / 2)] : variants[0];
    const representativeFresh = fresh.length > 0;
    const { brand, model } = variants[0];
    const fam = classifyPricingFamily(brand, model);
    const fhoneifyFamily = `${fam.engine} / ${fam.family}`;
    const { series, generation } = seriesAndGeneration(brand, model);
    const q = input.questionnaire?.[representative.deviceKey] ?? input.questionnaire?.[modelKey];
    models.push({
      modelKey, brand, model, variants, representative, representativeFresh,
      fhoneifyFamily, series, generation, eraTercile: null,
      deviceClass: deviceClassOf(model),
      band: representativeFresh ? priceBand(representative.getUpto) : 'B0_unpriced',
      warrantyMode: q?.warrantyMode ?? 'UNKNOWN',
      billMode: q?.billMode ?? 'UNKNOWN',
      exceptionTags: exceptionTagsOf(brand, model, fhoneifyFamily),
    });
  }

  // Era terciles inside each series, by generation number.
  const bySeries = new Map<string, ModelEntry[]>();
  for (const m of models) {
    if (m.generation == null) continue;
    if (!bySeries.has(m.series)) bySeries.set(m.series, []);
    bySeries.get(m.series)!.push(m);
  }
  for (const list of bySeries.values()) {
    const gens = [...new Set(list.map((m) => m.generation!))].sort((a, b) => a - b);
    if (gens.length < 3) continue;
    for (const m of list) {
      const r = gens.indexOf(m.generation!) / (gens.length - 1);
      m.eraTercile = r < 1 / 3 ? 0 : r < 2 / 3 ? 1 : 2;
    }
  }

  models.sort((a, b) => (a.modelKey < b.modelKey ? -1 : 1));
  return { models, variantCount: seen.size, skippedRows, duplicateRows };
}

/** Loads the real committed catalog files. Only used by the CLI. */
export async function loadRealInputs(questionnairePath?: string): Promise<BuildInputs> {
  const fs = await import('fs');
  const path = await import('path');
  const root = path.resolve(__dirname, '..', '..');
  const { SEED_DEVICES } = await import('../../lib/seed_devices');
  const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  return {
    rows: SEED_DEVICES as RawCatalogRow[],
    prices: read('lib/cashify_prices.generated.json'),
    priceMeta: read('lib/cashify_prices.meta.json'),
    questionnaire: questionnairePath ? JSON.parse(fs.readFileSync(questionnairePath, 'utf8')) : undefined,
  };
}
