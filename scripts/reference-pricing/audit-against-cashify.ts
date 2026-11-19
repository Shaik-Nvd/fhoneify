/**
 * READ-ONLY audit: compares every catalog variant's stored reference price with
 * the "Get Upto" price on its live Cashify page, fetched over plain HTTP.
 *
 *   node --import tsx scripts/reference-pricing/audit-against-cashify.ts <out.json> [--concurrency 4]
 *
 * Nothing is written to the database. The result file is a private audit
 * artifact: keep it out of the public repository.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { deviceKey } from '../../lib/referencePricing/types';
import { createCashifyUrlResolver, loadCashifyUrlDictionary } from '../../lib/referencePricing/sources/cashifyUrlResolver';
import { splitHeading, parseVariant, canonicalDeviceName } from '../../lib/referencePricing/sources/cashifyIdentity';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const out = process.argv[2];
const concurrency = Number(process.argv[process.argv.indexOf('--concurrency') + 1]) || 4;

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

async function readPage(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      const html = await r.text();
      const h1 = ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const prices = Array.from(new Set(Array.from(html.matchAll(/Get\s*Upto[\s\S]{0,200}?₹\s*([\d,]+)/gi)).map(m => Number(m[1].replace(/,/g, '')))));
      return { status: r.status, finalUrl: r.url, h1, prices };
    } catch (e: any) {
      if (attempt === 2) return { status: 0, finalUrl: url, h1: '', prices: [] as number[], error: e.message };
      await new Promise(res => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.referencePrice.findMany({ select: { deviceKey: true, currentPrice: true, status: true, lastVerifiedAt: true } });
  await prisma.$disconnect();
  const stored = new Map(rows.map(r => [r.deviceKey, r]));

  const curated = new Map<string, string>();
  for (const d of SEED_DEVICES as any[]) if (d.cashifyLink && d.brand) curated.set(deviceKey(d), d.cashifyLink);
  const resolve = createCashifyUrlResolver({ curatedLinks: curated, dictionary: loadCashifyUrlDictionary() });

  const devices = (SEED_DEVICES as any[]).filter(d => d.brand && d.model && d.storage);
  const results: any[] = [];
  let next = 0;
  async function worker() {
    while (next < devices.length) {
      const d = devices[next++];
      const key = deviceKey(d);
      const { url, tier } = resolve(d);
      const page = await readPage(url);
      const heading = splitHeading(page.h1);
      const nameOk = normalize(heading.name) === canonicalDeviceName(d.brand, d.model);
      const want = parseVariant(d.storage), got = parseVariant(heading.embeddedVariant ?? '');
      const variantOk = !!heading.embeddedVariant && want.storage === got.storage && (want.ram === null || want.ram === got.ram);
      const s = stored.get(key);
      results.push({
        brand: d.brand, model: d.model, storage: d.storage, url, tier, http: page.status, h1: page.h1,
        nameOk, variantOk, cashify: page.prices.length === 1 ? page.prices[0] : null, cashifyPrices: page.prices,
        stored: s?.currentPrice ?? null, storedStatus: s?.status ?? null, storedVerifiedAt: s?.lastVerifiedAt ?? null,
        seed: d.basePrice, error: (page as any).error,
      });
      if (results.length % 200 === 0) console.log(`${results.length}/${devices.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  fs.writeFileSync(out, JSON.stringify(results, null, 1));

  const verified = results.filter(r => r.nameOk && r.variantOk && r.cashify);
  const diff = verified.filter(r => r.stored !== r.cashify);
  console.log(JSON.stringify({
    catalog: results.length,
    cashifyPriceVerified: verified.length,
    storedEqualsCashify: verified.length - diff.length,
    storedDiffers: diff.length,
    storedMissingButCashifyHasPrice: diff.filter(r => !r.stored).length,
    noVerifiablePage: results.length - verified.length,
  }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
