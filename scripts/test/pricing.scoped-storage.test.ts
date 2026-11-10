import { referenceBonus } from '../../lib/pricing/referenceBonus';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPricingService } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey } from '../../lib/referencePricing/types';
import { customerPayout } from '../../lib/pricing/payout';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';
import { InspectionRequiredError } from '../../lib/pricing/inspectionRequired';
import { releaseSafetyInspectionReason } from '../../lib/pricing/releaseCandidate';

async function main() {
  const fixture = JSON.parse(fs.readFileSync('scripts/test/fixtures/iphone14-sibling-preservation-2026-10-11.json', 'utf8'));
  let binding = 0, guarded = 0;
  for (const row of fixture.cases) {
    const device = findCatalogDevice('Apple', 'Apple iPhone 14', row.storage)!;
    assert(device);
    const key = deviceKey(device);
    const at = new Date('2026-10-11T12:00:00Z');
    const service = createPricingService({
      repository: { async get() { return { ...device, deviceKey: key, currentPrice: row.reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact',
        lastVerifiedAt: '2026-10-04T08:48:09.147Z', lastAttemptedAt: null, lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: at.toISOString(), updatedAt: at.toISOString() }; },
        async listAll() { return []; }, async upsert() { throw new Error('No writes'); }, async appendHistory() { throw new Error('No writes'); }, async getHistory() { return []; } },
      questionnaireStore: { async get() { return { brand: device.brand, model: device.model, modelKey: 'apple|apple iphone 14', warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED',
        status: 'OK', observedAt: '2026-09-24T15:02:56.160Z', questionLabels: [], statusDetail: null, sourceUrl: null, variantsChecked: 1, parserVersion: 'frozen-profile' }; },
        async list() { return []; }, async upsert() { throw new Error('No writes'); } },
      catalog: [device], signingSecret: 'offline-scoped-storage-test-secret', tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
      pricingMode: 'hybrid', snapshot: {}, now: () => at, logger: { info() {}, warn() {}, error() {} },
    });
    const result = await service.quote({ brand: device.brand, model: device.model, storage: device.storage, diagnostics: row.diagnostics });
    // This fixture records the pre-calibration sibling behavior. Preserve its
    // inputs, but validate service wiring against today's rules, not old prices.
    let expected;
    try {
      expected = calculateFhoneifyPrice(device.brand, device.model, row.reference, row.diagnostics,
        { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' }, device.storage, { catalogStorage: device.storage });
    } catch (error) {
      if (!(error instanceof InspectionRequiredError)) throw error;
    }
    const safetyReason = releaseSafetyInspectionReason(device, row.diagnostics, true);
    assert.equal(result.ok, Boolean(expected) && !safetyReason, `${row.storage} ${row.condition}: current rules and safety availability`);
    if (result.ok) {
      assert.equal(result.internal.cashifyConditionEquivalent, expected!.cashifyConditionEquivalent, `${row.storage} ${row.condition}: current condition rule`);
      const bonus = referenceBonus(row.reference);
      assert.equal(result.fhoneifyPrice, Math.max(100, Math.round(expected!.cashifyConditionEquivalent + bonus)), 'approved reference bonus applied once');
      for (const coupon of [false, true]) {
        const payout = customerPayout(result.fhoneifyPrice, coupon, result.couponHeadroom);
        assert.equal(payout.payout, result.fhoneifyPrice - payout.deduction, 'coupon cannot stack above the reference bonus');
      }
      binding++;
    } else { assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED'); guarded++; }
  }
  console.log(`PASS ${binding} binding and ${guarded} guarded sibling cases match current rules, bonus, and safety availability`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
