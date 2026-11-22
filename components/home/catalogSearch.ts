'use client';

/** One sellable model from /api/catalog-index (built from lib/seed_devices.ts). */
export interface CatalogModel {
  brand: string;
  model: string;
  storages: string[];
  /** Lower-cased, punctuation-free "brand model" used for matching. */
  haystack: string;
}

let pending: Promise<CatalogModel[]> | null = null;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    // "s24" and "s 24", "iphone13" and "iphone 13" should match the same.
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .trim();

/** Loads the model list once; the home page calls this on first interaction or when idle. */
export function loadCatalog(): Promise<CatalogModel[]> {
  if (!pending) {
    pending = fetch('/api/catalog-index')
      .then((r) => {
        if (!r.ok) throw new Error(`catalog ${r.status}`);
        return r.json();
      })
      .then((data: { models?: [string, string, string[]][] }) =>
        (data.models ?? []).map(([brand, model, storages]) => ({
          brand,
          model,
          storages,
          haystack: ` ${normalize(model.startsWith(brand) ? model : `${brand} ${model}`)} `,
        })),
      )
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

/**
 * Every query word must appear as the start of a word in the model name.
 * Models whose name starts with the query rank first, then shorter names
 * (so "iphone 15" shows the iPhone 15 before the iPhone 15 Pro Max).
 */
export function searchCatalog(catalog: CatalogModel[], query: string, limit = 7): CatalogModel[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const phrase = ` ${words.join(' ')}`;
  const scored: { m: CatalogModel; score: number }[] = [];
  for (const m of catalog) {
    if (!words.every((w) => m.haystack.includes(` ${w}`))) continue;
    const brandless = ` ${normalize(m.model.startsWith(m.brand) ? m.model.slice(m.brand.length) : m.model)} `;
    let score = m.haystack.length;
    if (brandless.startsWith(phrase) || m.haystack.startsWith(phrase)) score -= 1000;
    else if (m.haystack.includes(phrase)) score -= 500;
    scored.push({ m, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.m);
}
