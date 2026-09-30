/**
 * Deterministic stratified sampling of catalog models.
 *
 * Roles:
 *   ANCHOR     - full factor screen (every applicable factor level, all
 *                candidate pairs, severity ladder). Establishes which factors
 *                matter and how they combine.
 *   CORE       - priority-1 factors + an assigned share of the pair design.
 *                Establishes how deductions vary across brand/price/era.
 *   VALIDATION - held out: baseline + fixed realistic profiles only. Never
 *                used to fit anything.
 *
 * No randomness: every choice is a function of (catalog, seed). Ties are
 * broken by a seeded FNV-1a hash of the model key, so the sample is
 * reproducible and not hand-picked.
 */
import { ModelEntry, PRICE_BANDS, PriceBand } from './catalog';

export type Role = 'ANCHOR' | 'CORE' | 'VALIDATION';

export interface SamplingConfig {
  seed: string;
  /** Cells with at most this many models get 1 training model. */
  smallCellMax: number;
  /** Cells with more than this many models get 3 training models. */
  largeCellMin: number;
  /** Extra training model when a cell's Get Upto coefficient of variation
   * exceeds this (price heterogeneity inside the cell). */
  cvExtraThreshold: number;
  /** Validation models per brand = ceil(fraction x training models in brand). */
  validationFraction: number;
  /** Brands need at least this many eligible models left over to get a
   * validation model. */
  validationMinRemaining: number;
  /** Brands with at least this many eligible models get an anchor. */
  anchorBrandMinModels: number;
  /** Minimum anchors per price band (B1..B5), filled from any brand. */
  anchorsPerBandMin: number;
}

export const DEFAULT_SAMPLING: SamplingConfig = {
  seed: 'fhoneify-cashify-design-v2',
  smallCellMax: 3,
  largeCellMin: 15,
  cvExtraThreshold: 0.35,
  validationFraction: 0.25,
  validationMinRemaining: 2,
  anchorBrandMinModels: 20,
  anchorsPerBandMin: 2,
};

export interface Selection {
  model: ModelEntry;
  role: Role;
  /** Why this model was selected - stratum cell, coverage rule, etc. */
  reasons: string[];
}

export interface SamplingResult {
  selections: Selection[];
  ineligible: Array<{ modelKey: string; reason: string }>;
  cells: Array<{ brand: string; band: PriceBand; models: number; cv: number; allocated: number }>;
}

export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const rank = (seed: string, key: string) => fnv1a(`${seed}|${key}`);

function cv(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
  return mean > 0 ? sd / mean : 0;
}

/**
 * Picks `n` models from `pool`, spreading them over era terciles and
 * Fhoneify families: each pick maximises (new era, new family) coverage
 * relative to what is already chosen, hash-ordered within ties.
 */
export function spreadPick(pool: ModelEntry[], n: number, seed: string, already: ModelEntry[] = []): ModelEntry[] {
  const chosen: ModelEntry[] = [];
  const remaining = [...pool].sort((a, b) => rank(seed, a.modelKey) - rank(seed, b.modelKey));
  const eras = new Set(already.map((m) => m.eraTercile));
  const fams = new Set(already.map((m) => m.fhoneifyFamily));
  while (chosen.length < n && remaining.length) {
    let bestIdx = 0;
    let bestScore = -1;
    remaining.forEach((m, i) => {
      const score = (eras.has(m.eraTercile) ? 0 : 2) + (fams.has(m.fhoneifyFamily) ? 0 : 1);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    const [m] = remaining.splice(bestIdx, 1);
    chosen.push(m);
    eras.add(m.eraTercile);
    fams.add(m.fhoneifyFamily);
  }
  return chosen;
}

export function selectSample(models: ModelEntry[], cfg: SamplingConfig = DEFAULT_SAMPLING): SamplingResult {
  const ineligible: SamplingResult['ineligible'] = [];
  const eligible: ModelEntry[] = [];
  for (const m of models) {
    if (!m.representativeFresh) {
      ineligible.push({
        modelKey: m.modelKey,
        reason: 'no fresh offline Get Upto: excluded from price-band cells, anchors and validation; still eligible to fill a family/exception coverage gap (the collector records the live Get Upto)',
      });
    } else {
      eligible.push(m);
    }
  }

  const chosen = new Map<string, Selection>();
  const add = (m: ModelEntry, role: Role, reason: string) => {
    const s = chosen.get(m.modelKey);
    if (s) { if (!s.reasons.includes(reason)) s.reasons.push(reason); return; }
    chosen.set(m.modelKey, { model: m, role, reasons: [reason] });
  };

  // 1. Brand x price-band cells.
  const cells = new Map<string, ModelEntry[]>();
  for (const m of eligible) {
    const k = `${m.brand}|${m.band}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(m);
  }
  const cellReport: SamplingResult['cells'] = [];
  for (const k of [...cells.keys()].sort()) {
    const pool = cells.get(k)!;
    const [brand, band] = k.split('|') as [string, PriceBand];
    const c = cv(pool.map((m) => m.representative!.getUpto!));
    let n = pool.length <= cfg.smallCellMax ? 1 : pool.length < cfg.largeCellMin ? 2 : 3;
    if (c > cfg.cvExtraThreshold && pool.length > n) n++;
    for (const m of spreadPick(pool, n, cfg.seed)) add(m, 'CORE', `stratum ${brand} x ${band} (${pool.length} models, cv ${c.toFixed(2)})`);
    cellReport.push({ brand, band, models: pool.length, cv: Number(c.toFixed(3)), allocated: n });
  }

  // 2. Coverage: every candidate Fhoneify family, every exception tag, every
  //    device class per brand, every observed questionnaire structure.
  const need = (label: string, predicate: (m: ModelEntry) => boolean, keyOf: (m: ModelEntry) => string) => {
    const groups = new Map<string, ModelEntry[]>();
    for (const m of models) if (predicate(m)) {
      const g = keyOf(m);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(m);
    }
    for (const [g, pool] of [...groups].sort()) {
      if ([...chosen.values()].some((s) => predicate(s.model) && keyOf(s.model) === g)) continue;
      // Prefer a model with a fresh offline price; fall back to an unpriced
      // one only when the whole group is unpriced.
      const priced = pool.filter((m) => m.representativeFresh);
      const [m] = spreadPick(priced.length ? priced : pool, 1, cfg.seed);
      add(m, 'CORE', `coverage: ${label} ${g}${m.representativeFresh ? '' : ' (no fresh offline Get Upto - live value recorded at collection)'}`);
    }
  };
  need('Fhoneify family', () => true, (m) => m.fhoneifyFamily);
  for (const tag of [...new Set(models.flatMap((m) => m.exceptionTags))].sort()) {
    need('exception', (m) => m.exceptionTags.includes(tag), () => tag);
  }
  need('device class', () => true, (m) => `${m.brand}/${m.deviceClass}`);
  need('questionnaire structure', (m) => m.warrantyMode !== 'UNKNOWN' || m.billMode !== 'UNKNOWN',
    (m) => `${m.brand}/w=${m.warrantyMode}/b=${m.billMode}`);

  // 3. Anchors, promoted from training: one per large brand (its most
  //    populated band), then fill each band up to anchorsPerBandMin.
  const training = () => [...chosen.values()];
  const byBrand = new Map<string, ModelEntry[]>();
  for (const m of eligible) {
    if (!byBrand.has(m.brand)) byBrand.set(m.brand, []);
    byBrand.get(m.brand)!.push(m);
  }
  for (const brand of [...byBrand.keys()].sort()) {
    const all = byBrand.get(brand)!;
    if (all.length < cfg.anchorBrandMinModels) continue;
    const bandCounts = new Map<PriceBand, number>();
    for (const m of all) bandCounts.set(m.band, (bandCounts.get(m.band) ?? 0) + 1);
    const topBand = [...bandCounts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    const pool = training().filter((s) => s.model.brand === brand && s.model.band === topBand && s.role === 'CORE').map((s) => s.model);
    const [m] = spreadPick(pool, 1, cfg.seed + ':anchor');
    if (m) { const s = chosen.get(m.modelKey)!; s.role = 'ANCHOR'; s.reasons.push(`anchor: largest band of ${brand}`); }
  }
  for (const band of PRICE_BANDS) {
    const have = training().filter((s) => s.role === 'ANCHOR' && s.model.band === band);
    const need = cfg.anchorsPerBandMin - have.length;
    if (need <= 0) continue;
    // Prefer a brand that has no anchor in this band yet, so a band's
    // anchors never all come from one brand.
    const bandBrands = new Set(have.map((s) => s.model.brand));
    const pool = training().filter((s) => s.role === 'CORE' && s.model.band === band).map((s) => s.model);
    const fresh = pool.filter((m) => !bandBrands.has(m.brand));
    const picks = spreadPick(fresh.length >= need ? fresh : pool, need, cfg.seed + ':band-anchor:' + band, have.map((s) => s.model));
    for (const m of picks) { const s = chosen.get(m.modelKey)!; s.role = 'ANCHOR'; s.reasons.push(`anchor: price band ${band} coverage`); }
  }

  // 4. Validation: held out, from models NOT in training.
  const trainingKeys = new Set(chosen.keys());
  for (const brand of [...byBrand.keys()].sort()) {
    const nTrain = training().filter((s) => s.model.brand === brand).length;
    const remaining = byBrand.get(brand)!.filter((m) => !trainingKeys.has(m.modelKey));
    if (remaining.length < cfg.validationMinRemaining) continue;
    const n = Math.min(remaining.length, Math.max(1, Math.ceil(cfg.validationFraction * nTrain)));
    // Spread validation across bands first, then eras/families.
    const byBand = new Map<PriceBand, ModelEntry[]>();
    for (const m of remaining) {
      if (!byBand.has(m.band)) byBand.set(m.band, []);
      byBand.get(m.band)!.push(m);
    }
    const picks: ModelEntry[] = [];
    const bands = [...byBand.keys()].sort((a, b) => byBand.get(b)!.length - byBand.get(a)!.length || (a < b ? -1 : 1));
    for (let round = 0; picks.length < n && round < n; round++) {
      for (const band of bands) {
        if (picks.length >= n) break;
        const pool = byBand.get(band)!.filter((m) => !picks.includes(m));
        const [m] = spreadPick(pool, 1, cfg.seed + ':validation', picks);
        if (m) picks.push(m);
      }
    }
    for (const m of picks) chosen.set(m.modelKey, { model: m, role: 'VALIDATION', reasons: [`held-out validation for ${brand} (${m.band})`] });
  }

  const selections = [...chosen.values()].sort((a, b) =>
    a.role === b.role ? (a.model.modelKey < b.model.modelKey ? -1 : 1) : a.role < b.role ? -1 : 1);
  return { selections, ineligible, cells: cellReport };
}
