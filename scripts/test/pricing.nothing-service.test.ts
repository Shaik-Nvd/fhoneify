import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerQuote } from '../../lib/pricing/cashifyRunnerModel';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { customerPayout } from '../../lib/pricing/payout';
import { verifyQuoteToken } from '../../lib/pricing/quoteToken';
import { warrantyVoidedByDiagnostics } from '../../lib/pricing/diagnostics';

const secret = 'nothing-service-offline-fixture-secret-32';
const at = new Date('2026-11-11T00:00:00Z');
let reference = 25000;
const noWrite = async () => { throw new Error('read-only fixture'); };
const service = createPricingService({ repository: {
  async get(key) { return { deviceKey: key, brand: 'Nothing', model: 'Nothing Phone 3a', storage: '8 GB/128 GB',
    currentPrice: reference, source: 'cashify', status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: at.toISOString() } as any; },
  async listAll() { return []; }, upsert: noWrite, appendHistory: noWrite, async getHistory() { return []; },
}, questionnaireStore: { async get() { return { warrantyMode: 'ASKED', billMode: 'ASKED', ageMode: 'NOT_ASKED' } as any; }, async list() { return []; }, upsert: noWrite },
  pricingMode: 'hybrid', signingSecret: secret, tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
  now: () => at, snapshot: {}, logger: { info() {}, warn() {}, error() {} } });
const device = { brand: 'Nothing', model: 'Nothing Phone 3a', storage: '8 GB/128 GB' };
const clean = { ...PERFECT_CONDITION_DIAGNOSTICS, warranty: true, validBill: true, mobileAge: 'below3', accessories: ['box'] };
(async () => {
  for (const ref of [20000, 20001, 50000, 50001, 25000]) {
    reference = ref;
    for (const diagnostics of [clean, { ...clean, mobileAge: '3to6' }, { ...clean, hardware: ['wifi'] },
      { ...clean, originalScreen: false, mobileAge: 'above11', hardware: ['back_camera'] }]) {
      const quote = await service.quote({ ...device, diagnostics }); assert(quote.ok);
      const expected = runnerQuote(device.model, device.storage, reference, diagnostics)!;
      assert.equal(quote.internal.cashifyConditionEquivalent, expected.price, 'hybrid cannot replace the runner rule');
      assert.equal(quote.internal.payoutCeiling.equivalentBasis, 'base');
      const tier = reference <= 20000 ? .08 : reference <= 50000 ? .06 : .04;
      assert.equal(quote.fhoneifyPrice, Math.round(expected.price + Math.min(reference * tier, 1000)));
      assert(quote.fhoneifyPrice <= quote.startingPrice);
      assert.equal(quote.questionnaire.ageMode, 'ASKED', 'conditional age overrides crawled NOT_ASKED');
      const token = verifyQuoteToken(quote.quoteToken, secret, Math.floor(at.getTime() / 1000)); assert(token.ok);
      if (token.ok) assert.equal(token.payload.p, quote.fhoneifyPrice);
      const lead = await service.verifyLeadPrice({ ...device, diagnostics, quoteToken: quote.quoteToken, clientQuotedPrice: quote.fhoneifyPrice });
      assert(lead.ok); assert.equal(lead.price, quote.fhoneifyPrice); assert.equal(lead.audit.priceSource, 'quote_token');
      for (const coupon of [false, true]) assert(customerPayout(quote.fhoneifyPrice, coupon, quote.couponHeadroom).payout <= quote.internal.payoutCeiling.maxCustomerPayout);
      assert.equal(warrantyVoidedByDiagnostics(diagnostics, device), false);
    }
  }
  console.log('PASS Nothing authoritative service, current reference, conditional age, signed lead agreement and coupon bounds');
})().catch(error => { console.error(error); process.exitCode = 1; });
