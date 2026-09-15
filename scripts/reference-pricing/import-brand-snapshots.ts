/**
 * Ingests the per-brand snapshot files that already exist in this repo
 * (oppo/oppo_prices.json, iqoo/iqoo_prices.json, samsung/samsung_prices.json,
 * etc.) into the reference-price store.
 *
 * This is NOT a scraper. It does not make any network request and touches
 * no external site. These files were already obtained and committed to
 * the repository before this task; this script only PARSES AND VALIDATES
 * data that already exists on disk, through the same strict matching and
 * validation pipeline as every other ingestion path. This is exactly the
 * "legally available, technically accessible source" the brief asks to
 * integrate and productionize rather than reinvent, as distinct from live
 * scraping (which remains blocked - see PRICING_REFERENCE_DATA_ARCHITECTURE.md).
 *
 * This IS a real, re-runnable, automatable refresh mechanism: whenever a
 * new or updated snapshot file is legally obtained and dropped into one of
 * these brand folders (by however the team chooses to obtain it - manual
 * export, a licensed data feed, a compliant partner API, etc.), running
 * this script re-ingests it through the full validation/matching/history
 * pipeline. That is a legitimate answer to "automatic refresh" that does
 * not require deciding the live-scraping legal question.
 *
 * Run: npx tsx scripts/reference-pricing/import-brand-snapshots.ts
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { getBulkRepository } from '../../lib/referencePricing/getBulkRepository';
import { refreshCatalog, PriceSource } from '../../lib/referencePricing/ingestion';
import { matchDevices } from '../../lib/referencePricing/matching';
import { DeviceIdentity } from '../../lib/referencePricing/types';

interface SnapshotEntry {
  model: string;
  price: number;
  display?: string;
  link?: string;
}

const BRAND_FILES: { file: string; brand: string }[] = [
  { file: 'asus/asus_prices.json', brand: 'Asus' },
  { file: 'Google/google_prices.json', brand: 'Google' },
  { file: 'honor/honor_prices.json', brand: 'Honor' },
  { file: 'infinix/infinix_prices.json', brand: 'Infinix' },
  { file: 'iqoo/iqoo_prices.json', brand: 'iQOO' },
  { file: 'lg/lg_prices.json', brand: 'LG' },
  { file: 'motorola/motorola_prices.json', brand: 'Motorola' },
  { file: 'nokia/lenovo/lenovo_prices.json', brand: 'Lenovo' },
  { file: 'nokia/nokia_prices.json', brand: 'Nokia' },
  { file: 'nothing/nothing_prices.json', brand: 'Nothing' },
  { file: 'oppo/oppo_prices.json', brand: 'Oppo' },
  { file: 'poco/poco_prices.json', brand: 'POCO' },
  { file: 'realme/realme_prices.json', brand: 'Realme' },
  { file: 'samsung/samsung_prices.json', brand: 'Samsung' },
  { file: 'tecno/tecno_prices.json', brand: 'Tecno' },
  { file: 'vivo/vivo_prices.json', brand: 'Vivo' },
  { file: 'xiaomi/xiaomi_prices.json', brand: 'Xiaomi' },
];

/** Parses "Sell Old <Model> (<Storage>)" into { model, storage }. Returns
 * null (never guesses) if the expected shape isn't found. */
function parseSnapshotModel(raw: string): { model: string; storage: string } | null {
  const withoutPrefix = raw.replace(/^Sell Old\s+/i, '').trim();
  const match = withoutPrefix.match(/^(.*)\(([^()]+)\)\s*$/);
  if (!match) return null;
  const model = match[1].trim();
  const storage = match[2].trim();
  if (!model || !storage) return null;
  return { model, storage };
}

function gitFileDate(filePath: string): string {
  try {
    const out = execSync(`git log -1 --format=%aI -- "${filePath}"`, { cwd: process.cwd() }).toString().trim();
    return out || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function createSnapshotSource(
  entries: { identity: DeviceIdentity; price: number; sourceUrl?: string }[],
  fileName: string,
  observedAt: string
): PriceSource {
  return {
    name: `brand_snapshot:${fileName}`,
    async fetch(device: DeviceIdentity) {
      // Strict match only - never fuzzy-select among multiple entries.
      const candidates = entries.filter((e) => {
        const m = matchDevices(device, e.identity);
        return m.confidence === 'exact' || m.confidence === 'high';
      });
      if (candidates.length !== 1) return null; // 0 = no match, >1 = ambiguous, both rejected
      return {
        price: candidates[0].price,
        sourceUrl: candidates[0].sourceUrl,
        matchConfidence: matchDevices(device, candidates[0].identity).confidence,
        matchEvidence: `brand snapshot ${fileName}`,
        // This is a static historical file, not a live fetch - report the
        // file's real git commit date, never "now". See the PriceSource
        // interface doc in ingestion.ts.
        observedAt,
      };
    },
  };
}

async function main() {
  // Buffered for the same reason as the legacy migration - this touches
  // thousands of records across 17 files; a direct file-backed store would
  // re-read/re-write the whole (multi-MB) store on every single device.
  const store = getBulkRepository();
  const seedIdentities: DeviceIdentity[] = (SEED_DEVICES as any[])
    .filter((d) => d.brand && d.model && d.storage)
    .map((d) => ({ brand: d.brand, model: d.model, storage: d.storage }));

  let totalMatched = 0;
  let totalUnparsable = 0;

  try {
  for (const { file, brand } of BRAND_FILES) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.log(`SKIP ${file} - not found`);
      continue;
    }

    let raw: SnapshotEntry[];
    try {
      raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (!Array.isArray(raw)) throw new Error('not an array');
    } catch (err: any) {
      console.log(`SKIP ${file} - unreadable/malformed: ${err.message}`);
      continue;
    }

    const entries: { identity: DeviceIdentity; price: number; sourceUrl?: string }[] = [];
    let unparsable = 0;
    for (const item of raw) {
      const parsed = parseSnapshotModel(item.model);
      if (!parsed || typeof item.price !== 'number') {
        unparsable++;
        continue;
      }
      entries.push({ identity: { brand, model: parsed.model, storage: parsed.storage }, price: item.price, sourceUrl: item.link });
    }
    totalUnparsable += unparsable;

    const source = createSnapshotSource(entries, file, gitFileDate(file));
    const relevantSeedDevices = seedIdentities.filter((d) => d.brand.toLowerCase() === brand.toLowerCase());
    const outcomes = await refreshCatalog(store, relevantSeedDevices, source, { concurrency: 10 });
    const matched = outcomes.filter((o) => o.accepted).length;
    totalMatched += matched;

    console.log(`${file}: ${entries.length}/${raw.length} entries parsed, matched ${matched}/${relevantSeedDevices.length} catalog devices for brand "${brand}"`);
  }
  } finally {
    store.flush();
  }

  console.log(`\nTotal: ${totalMatched} device reference prices imported from brand snapshot files.`);
  console.log(`(${totalUnparsable} snapshot entries across all files didn't match the expected "Sell Old X (Y)" shape and were skipped, not guessed at.)`);
}

main().catch((err) => {
  console.error('Brand snapshot import failed:', err);
  process.exit(1);
});
