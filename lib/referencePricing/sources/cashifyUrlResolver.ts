/**
 * Where to point the Cashify reader for a device, strongest identifier first:
 *
 *  1. the catalog's curated, variant-specific `cashifyLink`;
 *  2. the existing scraper's hand-maintained URL dictionaries
 *     (server/data/{apple,samsung,xiaomi,oppo,vivo}_urls.json), keyed exactly
 *     the way scrapeCashifyPrice() keys them - these fix brands whose Cashify
 *     slugs don't follow the obvious pattern (e.g. "used-iphone-6-plus");
 *  3. a generated URL (see buildCashifyUrl).
 *
 * No tier is trusted on its own: whatever page loads is identity-verified, so
 * a stale dictionary entry is rejected, never believed.
 */
import fs from 'fs';
import path from 'path';
import { DeviceIdentity, deviceKey } from '../types';
import { buildCashifyUrl } from './cashifyIdentity';

const DICTIONARIES = ['apple_urls.json', 'samsung_urls.json', 'xiaomi_urls.json', 'oppo_urls.json', 'vivo_urls.json'];

export function loadCashifyUrlDictionary(dataDir = path.join(process.cwd(), 'server', 'data')): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of DICTIONARIES) {
    const full = path.join(dataDir, file);
    if (!fs.existsSync(full)) continue;
    try {
      Object.assign(merged, JSON.parse(fs.readFileSync(full, 'utf8')));
    } catch {
      // A corrupt dictionary only loses tier 2 for its brand; tier 3 still
      // applies and every page is verified anyway.
    }
  }
  return merged;
}

/** The same key scrapeCashifyPrice() builds: "brand model-without-brand". */
export function dictionaryKey(device: DeviceIdentity): string {
  const brand = device.brand.toLowerCase();
  const model = device.model.toLowerCase();
  const clean = model.startsWith(brand) ? model.substring(brand.length).trim() : model;
  return `${brand} ${clean}`.trim();
}

export function createCashifyUrlResolver(params: {
  curatedLinks: Map<string, string>;
  dictionary: Record<string, string>;
}): (device: DeviceIdentity) => { url: string; tier: 'catalog' | 'dictionary' | 'generated' } {
  return (device) => {
    const curated = params.curatedLinks.get(deviceKey(device));
    if (curated) return { url: curated, tier: 'catalog' };
    const fromDictionary = params.dictionary[dictionaryKey(device)];
    if (fromDictionary) return { url: fromDictionary, tier: 'dictionary' };
    return { url: buildCashifyUrl(device), tier: 'generated' };
  };
}
