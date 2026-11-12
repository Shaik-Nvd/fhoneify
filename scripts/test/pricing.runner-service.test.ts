import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { runnerQuote, runnerScope } from '../../lib/pricing/cashifyRunnerModel';
import { PERFECT_CONDITION_DIAGNOSTICS } from '../../lib/pricing/perfectCondition';
import { verifyQuoteToken } from '../../lib/pricing/quoteToken';

const secret = 'runner-service-fixture-not-a-production-secret';
const at = new Date('2026-11-11T08:00:00Z');
const service = createPricingService({ repository: { async get(key: string) { return { deviceKey: key, currentPrice: 25000, source: 'cashify',
  status: 'fresh', lastVerifiedAt: at.toISOString() } as any; }, async listAll() { return []; }, async upsert() { throw new Error('read only'); } } as any,
  pricingMode: 'hybrid', signingSecret: secret, tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100, snapshot: {},
  now: () => at, logger: { info() {}, warn() {}, error() {} } });
(async () => {
  for (const [brand, model, storage] of [
    ['Nothing', 'Nothing Phone 1', '8 GB/128 GB'], ['Nothing', 'CMF by Nothing Phone 2 Pro 5G', '8 GB/128 GB'],
    ['OnePlus', 'OnePlus 8', '8 GB/128 GB'], ['OnePlus', 'OnePlus 12R', '8 GB/128 GB'],
    ['OnePlus', 'Oneplus Open', '16 GB/512 GB'], ['OnePlus', 'OnePlus 9RT 5G', '12 GB/256 GB'],
  ]) {
    const profile = runnerScope(model)!; assert(profile);
    for (const hardware of [[], ['back_camera'], ['outer_screen'], ['hinge'], ['wifi', 'back_camera']]) {
      if ((hardware.includes('hinge') || hardware.includes('outer_screen')) && model !== 'Oneplus Open') continue;
      const diagnostics = { ...PERFECT_CONDITION_DIAGNOSTICS, warranty: true, validBill: true, mobileAge: '3to6', hardware,
        accessories: ['box', 'charger'], disableRunnerEvidence: true }; // public extras cannot select a historical calculator
      const q = await service.quote({ brand, model, storage, diagnostics }); assert(q.ok, model);
      const expected = runnerQuote(model, storage, 25000, diagnostics)!;
      assert.equal(q.internal.cashifyConditionEquivalent, expected.price);
      assert(q.internal.runnerModel);
      assert.equal(q.internal.payoutCeiling.equivalentBasis, 'base');
      assert.equal(q.fhoneifyPrice, expected.price + 1000);
      assert.equal(q.questionnaire.warrantyMode, profile.hasAge ? 'ASKED' : 'NOT_ASKED');
      if (model === 'OnePlus 9RT 5G') assert.equal(q.questionnaire.chargerMode, 'ASKED', 'inferred storage keeps its model questionnaire');
      const expired = verifyQuoteToken(q.quoteToken, secret, Math.floor(at.getTime() / 1000) + 901); assert(!expired.ok);
      const tampered = verifyQuoteToken(q.quoteToken + 'x', secret, Math.floor(at.getTime() / 1000)); assert(!tampered.ok);
    }
  }
  assert.equal(runnerQuote('Nothing Unknown Future Device', '8 GB/128 GB', 25000, PERFECT_CONDITION_DIAGNOSTICS), null);
  console.log('PASS runner service: old/new/fold, raw questionnaire, no public opt-out, inferred storage and signed-token guards');
})().catch(error => { console.error(error); process.exitCode = 1; });
