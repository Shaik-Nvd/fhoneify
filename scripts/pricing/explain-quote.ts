/**
 * Transparent quote breakdown, for comparing an identical scenario on Cashify
 * by hand. Uses the real engine only (lib/pricing/explain.ts).
 *
 *   npm run pricing:explain -- --brand Apple --model "Apple iPhone 15" --storage 128GB \
 *       --answers '{"calls":true,"touch":true,"originalScreen":true,"warranty":false,...}'
 *
 * Options
 *   --answers <json>     condition answers exactly as the quote page sends them
 *                        (omitted fields take the page's defaults: null / []).
 *   --answers-file <p>   the same, from a JSON file.
 *   --reference <n>      use this reference price instead of looking it up.
 *   --live-api           also POST the same scenario to the production API and
 *                        compare its price (PRODUCTION_API_URL, default
 *                        https://fhoneify-api.onrender.com).
 *   --json               machine-readable output.
 *
 * Without --reference the reference is resolved exactly as the server does
 * (reference-price repository -> materialized snapshot -> catalog), which
 * reads the database named by DATABASE_URL. Read-only.
 */
import fs from 'fs';
import { explainQuote } from '../../lib/pricing/explain';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { resolveBaseMarketPrice } from '../../lib/pricing/engine';
import { customerPayout } from '../../lib/pricing/payout';
import { deviceKey } from '../../lib/referencePricing/types';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const signed = (n: number) => (n > 0 ? `+${inr(n)}` : n < 0 ? `-${inr(-n)}` : '₹0');

async function main() {
  const brand = arg('brand');
  const model = arg('model');
  const storage = arg('storage');
  if (!brand || !model || !storage) {
    console.error('Required: --brand, --model, --storage (exactly as the quote page shows them)');
    return void (process.exitCode = 2);
  }
  const rawAnswers = arg('answers') ?? (arg('answers-file') ? fs.readFileSync(arg('answers-file')!, 'utf8') : '{}');
  const parsed = parseDiagnostics(JSON.parse(rawAnswers));
  if (!parsed.ok) {
    console.error(`Invalid answers: ${parsed.error}`);
    return void (process.exitCode = 2);
  }
  const diagnostics = parsed.value;

  const device = findCatalogDevice(brand, model, storage);
  if (!device) {
    console.error('Device not found in the catalog (lib/seed_devices.ts). Use the exact brand/model/storage strings.');
    return void (process.exitCode = 2);
  }

  let referencePrice: number;
  let referenceSource: string;
  if (arg('reference')) {
    referencePrice = Number(arg('reference'));
    referenceSource = 'given on the command line';
  } else {
    const { getReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
    const record = await getReferencePriceRepository().get(deviceKey({ brand: device.brand, model: device.model, storage: device.storage }));
    const base = resolveBaseMarketPrice({ device, repositoryRecord: record });
    if (!base) {
      console.error('No reference price for this device.');
      return void (process.exitCode = 1);
    }
    referencePrice = base.price;
    referenceSource = `${base.source}${base.referenceLastVerifiedAt ? `, verified ${base.referenceLastVerifiedAt}` : ''}, status ${base.referenceStatus}`;
  }

  const x = explainQuote(device.brand, device.model, referencePrice, diagnostics);

  let api: { price: number | null; status: number; error?: string } | null = null;
  if (flag('live-api')) {
    const url = (process.env.PRODUCTION_API_URL || 'https://fhoneify-api.onrender.com').replace(/\/$/, '') + '/api/quote/price';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model, storage, diagnostics }),
      signal: AbortSignal.timeout(90000),
    });
    const body: any = await res.json().catch(() => null);
    api = { price: body?.data?.fhoneifyPrice ?? null, status: res.status, error: body?.error };
  }

  if (flag('json')) {
    console.log(JSON.stringify({ device, referenceSource, ...x, payout: customerPayout(x.finalPrice, false), api }, null, 2));
    return;
  }

  console.log(`\nDevice:                          ${device.brand} | ${device.model} | ${device.storage}`);
  console.log(`Reference price:                 ${inr(x.referencePrice)}   (${referenceSource})`);
  console.log(`Perfect-condition baseline:      ${inr(x.perfectConditionCashifyEquivalent)}`);
  for (const s of x.steps) {
    const label = `${s.step[0].toUpperCase()}${s.step.slice(1)} adjustment`;
    console.log(`${label.padEnd(32)} ${signed(s.delta).padStart(10)}  -> ${inr(s.cashifyEquivalent).padStart(9)}   ${JSON.stringify(s.fields)}`);
  }
  console.log('--------------------------------');
  console.log(`Cashify-equivalent:              ${inr(x.cashifyEquivalent)}`);
  console.log(`Fhoneify uplift tier:            ${x.uplift.tierPercent}%`);
  console.log(`Raw uplift:                      ${inr(x.uplift.uncappedRupees)}`);
  console.log(`Cap applied:                     ${x.uplift.capApplied ? 'YES' : 'NO'}`);
  console.log(`Uplift used:                     ${inr(x.uplift.rupees)}`);
  if (x.uplift.floorApplied) console.log('Quote floor:                     ₹100');
  console.log(`Final Fhoneify quote:            ${inr(x.finalPrice)}`);
  const payout = customerPayout(x.finalPrice, false);
  console.log(`shown to customer (no coupon):   ${inr(payout.payout)}   (quote - ${inr(payout.deduction)}; +₹299 with the first-time coupon)`);
  if (x.ignoredAnswers.length) {
    console.log(`\nANSWERS THIS BRAND'S FORMULA IGNORES (₹0 effect on their own):\n  ${x.ignoredAnswers.join('\n  ')}`);
  }
  if (api) {
    const verdict = api.price === x.finalPrice ? 'MATCH' : 'DIFFERENT (the API may use a newer reference, or the scenario differs)';
    console.log(`\nproduction API:                  ${api.price !== null ? inr(api.price) : `HTTP ${api.status} ${api.error ?? ''}`}   ${api.price !== null ? verdict : ''}`);
  }
}

// Close the database pool and let Node exit on its own: calling process.exit()
// while handles are closing aborts on Windows (libuv UV_HANDLE_CLOSING).
main()
  .catch((e) => {
    console.error('explain failed:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { disconnectReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
    await disconnectReferencePriceRepository();
  });
