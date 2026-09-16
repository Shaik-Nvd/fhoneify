/** READ-ONLY: proves the live quote flow reads reference prices from Supabase
 * and applies the unchanged pricing engine to them. generateQuote keeps quotes
 * in an in-memory map; nothing here writes to the database.
 *
 *   npx tsx scripts/reference-pricing/verify-live-quote.ts */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { getReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { deviceKey } from '../../lib/referencePricing/types';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';

const PERFECT = {
  calls: true, touch: true, originalScreen: true, defects: [], screenCondition: null, screenSpots: null,
  screenLines: null, screenDiscoloration: null, bodyScratches: null, bodyDents: null, bodyPanel: null,
  bodyBent: null, hardware: [], accessories: ['box', 'bill'], warranty: true, validBill: true, eSim: null,
  mobileAge: 'below3',
};

async function main() {
  const { generateQuote } = await import('../../server/modules/quote/service');
  const repo = getReferencePriceRepository();
  console.log('repository backend:', repo.constructor.name);

  const prisma = new PrismaClient();
  for (const [model, storage] of [['OPPO Find X9s', '12 GB/512 GB'], ['Oneplus 15R', '12 GB/512 GB']]) {
    const d = (SEED_DEVICES as any[]).find((x) => x.model === model && x.storage === storage);
    const key = deviceKey({ brand: d.brand, model: d.model, storage: d.storage });
    const row = await prisma.referencePrice.findUnique({ where: { deviceKey: key } });
    const viaRepo = await repo.get(key);
    const quote: any = await generateQuote(d.id, 'like_new', undefined, PERFECT);
    const expected = calculateFhoneifyPrice(d.brand, d.model, row!.currentPrice, PERFECT as any).fhoneifyPrice;
    console.log(JSON.stringify({
      device: `${model} ${storage}`,
      supabaseRow: { currentPrice: row!.currentPrice, source: row!.source, status: row!.status, lastVerifiedAt: row!.lastVerifiedAt },
      repositoryPrice: viaRepo!.currentPrice,
      seedBasePrice: d.basePrice,
      quote: { estimatedPrice: quote.estimatedPrice, referenceStatus: quote.referenceStatus, referenceSource: quote.referenceSource },
      engineFromSupabasePrice: expected,
      quoteMatchesEngineOnSupabasePrice: quote.estimatedPrice === expected,
    }, null, 1));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
