/**
 * Catalog-wide finite property matrix. Offline only: reads checked-in catalog
 * and reference snapshots, never connects to or writes a database.
 */
import assert from 'node:assert/strict';
import referenceStore from '../../server/data/reference-prices/store.json';
import snapshot from '../../lib/cashify_prices.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { applyCompetitorUplift } from '../../lib/pricingCalculator';
import { classifyPricingFamily, pricingFamilyKey } from '../../lib/pricing/families';
import { priceDevice, resolveBaseMarketPrice } from '../../lib/pricing/engine';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { VALIDATION_PROFILES } from '../pricing/validation-profiles';

const records = (referenceStore as { records: Record<string, ReferencePriceRecord> }).records;
const validDevices = SEED_DEVICES.filter((device) =>
  Boolean(device.brand && device.model && device.storage)
  && Number.isFinite(device.basePrice)
  && device.basePrice > 0);
const failures: Array<{ device: string; family: string; message: string }> = [];
const families = new Set<string>();
const sources = new Map<string, number>();
let quotesGenerated = 0;

for (const device of validDevices) {
  const family = pricingFamilyKey(device.brand, device.model);
  families.add(family);
  const base = resolveBaseMarketPrice({
    device,
    repositoryRecord: records[deviceKey(device)] ?? null,
    snapshot: snapshot as Record<string, number>,
    now: new Date('2026-09-20T12:00:00+05:30'),
  });

  try {
    assert.ok(base && Number.isFinite(base.price) && base.price > 0, 'no valid catalog/reference price');
    sources.set(base.source, (sources.get(base.source) ?? 0) + 1);
    const calculated = Object.fromEntries(Object.entries(VALIDATION_PROFILES).map(([name, diagnostics]) => {
      const first = priceDevice(device.brand, device.model, base.price, diagnostics);
      const second = priceDevice(device.brand, device.model, base.price, diagnostics);
      quotesGenerated += 2;
      assert.deepEqual(second, first, `${name}: non-deterministic result`);
      assert.ok(Number.isFinite(first.cashifyBasePrice) && first.cashifyBasePrice >= 0, `${name}: invalid Cashify-equivalent`);
      assert.ok(Number.isFinite(first.fhoneifyPrice) && first.fhoneifyPrice >= 100, `${name}: invalid final quote`);
      assert.equal(first.fhoneifyPrice, applyCompetitorUplift(base.price, first.cashifyBasePrice), `${name}: uplift mismatch`);
      return [name, first.cashifyBasePrice];
    }));

    assert.ok(calculated.P0_PERFECT >= calculated.P2_MINOR_SCREEN, 'minor damage increases quote');
    assert.ok(calculated.P2_MINOR_SCREEN >= calculated.P2_HEAVY_SCREEN, 'heavier screen damage increases quote');
    assert.ok(calculated.P2_HEAVY_SCREEN >= calculated.P3_SCREEN_FUNCTIONAL, 'adding a functional fault increases quote');
    assert.ok(calculated.P0_PERFECT >= calculated.P3_FUNCTIONAL, 'functional fault increases quote');
    assert.ok(calculated.P0_PERFECT >= calculated.P4_BODY, 'body damage increases quote');
    assert.ok(calculated.P3_SCREEN_FUNCTIONAL >= calculated.P5_SEVERE_MULTI, 'severe multi-damage increases quote');
    assert.ok(calculated.P0_PERFECT >= calculated.P1_OLD_NO_DAMAGE, 'old/out-of-warranty exceeds young/in-warranty');
  } catch (error: any) {
    failures.push({
      device: `${device.brand} | ${device.model} | ${device.storage}`,
      family,
      message: error.message,
    });
  }
}

const affectedFamilies = [...new Set(failures.map((failure) => failure.family))].sort();
console.log(JSON.stringify({
  rawCatalogRows: SEED_DEVICES.length,
  devicesTested: validDevices.length,
  familiesTested: families.size,
  profilesPerDevice: Object.keys(VALIDATION_PROFILES).length,
  quotesGenerated,
  referenceSources: Object.fromEntries([...sources.entries()].sort()),
  failures: failures.length,
  affectedFamilies,
  failureDetails: failures.slice(0, 50),
}, null, 2));

assert.equal(failures.length, 0, `${failures.length} catalog property failure(s) across ${affectedFamilies.length} families`);
console.log(`PASS: ${validDevices.length} valid catalog devices, ${quotesGenerated} deterministic quotes, ${families.size} pricing families`);
