/**
 * Local calibration capture for a quote that is being manually compared with
 * Cashify. It never writes a database record and never prints a quote token.
 *
 * npm run pricing:capture-comparison -- --brand Apple --model "Apple iPhone 16 Pro" --storage "256 GB" --answers-file answers.json
 * npm run pricing:capture-comparison -- --brand Apple --model "Apple iPhone 16 Pro" --storage "256 GB" --answers-file answers.json --coupon-applied --live-api
 */
import fs from 'node:fs';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { explainQuote } from '../../lib/pricing/explain';
import { resolveReference } from '../../lib/pricing/engine';
import { customerPayout } from '../../lib/pricing/payout';
import { deviceKey } from '../../lib/referencePricing/types';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const brand = arg('brand');
  const model = arg('model');
  const storage = arg('storage');
  const answersFile = arg('answers-file');
  if (!brand || !model || !storage || !answersFile) {
    throw new Error('Required: --brand, --model, --storage, and --answers-file');
  }

  const device = findCatalogDevice(brand, model, storage);
  if (!device) throw new Error('Device not found. Use the exact brand/model/storage strings from the quote page.');

  const parsed = parseDiagnostics(JSON.parse(fs.readFileSync(answersFile, 'utf8')));
  if (!parsed.ok) throw new Error(`Invalid answers: ${parsed.error}`);

  const { getReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
  const record = await getReferencePriceRepository().get(deviceKey(device));
  const base = resolveReference({ device, repositoryRecord: record });
  if (!base) throw new Error('No usable reference price for this device.');

  const explanation = explainQuote(device.brand, device.model, base.cashifyGetUptoReference, parsed.value);
  let liveApiFinalPrice: number | null = null;
  if (flag('live-api')) {
    const url = `${(process.env.PRODUCTION_API_URL || 'https://fhoneify-api.onrender.com').replace(/\/$/, '')}/api/quote/price`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: device.brand, model: device.model, storage: device.storage, diagnostics: parsed.value }),
      signal: AbortSignal.timeout(90_000),
    });
    const body: any = await response.json().catch(() => null);
    if (!response.ok || typeof body?.data?.fhoneifyPrice !== 'number') {
      throw new Error(`Live API did not return a price (HTTP ${response.status}).`);
    }
    // Deliberately discard the signed quote token returned by the API.
    liveApiFinalPrice = body.data.fhoneifyPrice;
  }

  const couponApplied = flag('coupon-applied');
  const payout = customerPayout(explanation.finalPrice, couponApplied);
  console.log(JSON.stringify({
    device: { brand: device.brand, model: device.model, storage: device.storage },
    normalizedPricingAnswers: parsed.value,
    referencePrice: base.cashifyGetUptoReference,
    reference: {
      source: base.source,
      status: base.referenceStatus,
      lastVerifiedAt: base.referenceLastVerifiedAt,
    },
    explanation: {
      perfectConditionCashifyEquivalent: explanation.perfectConditionCashifyEquivalent,
      steps: explanation.steps,
      cashifyEquivalent: explanation.cashifyEquivalent,
      uplift: explanation.uplift,
      finalPrice: explanation.finalPrice,
      ignoredAnswers: explanation.ignoredAnswers,
    },
    customerVisiblePayout: payout,
    couponApplied,
    liveApiFinalPrice,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(`capture failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { disconnectReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
    await disconnectReferencePriceRepository();
  });
