import { referenceBonus } from '../../lib/pricing/referenceBonus';
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';
import { createPricingService } from '../../lib/pricing/pricingService';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey } from '../../lib/referencePricing/types';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { customerPayout } from '../../lib/pricing/payout';
import { replayTeamText } from '../pricing/replay-team-text-20261018';
import fixture from '../pricing/fixtures/team-text-2026-10-18.json';
import { appleEvidenceQuote } from '../../lib/pricing/appleCashifyModel';
import { supportedApple512Fallback } from '../../lib/pricing/appleVariantDispatch';

const device = findCatalogDevice('Apple', 'Apple iPhone 15 Pro Max', '512GB')!;
const parsed = parseDiagnostics({ calls: true, touch: true, originalScreen: true, warranty: false,
  validBill: true, eSim: 'Single eSIM', hardware: ['face', 'battery_service'], accessories: [], defects: [] });
assert(parsed.ok);
const answers = parsed.value;
const time = '2026-10-19T00:00:00.000Z';
const noWrite = async () => { throw new Error('No persistence permitted'); };
function service(mode: 'hybrid' | 'legacy', reference = 72480, clock = time) {
  const record = { ...device, deviceKey: deviceKey(device), source: 'cashify', currentPrice: reference,
    matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: time, lastAttemptedAt: time,
    lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0, createdAt: time, updatedAt: time };
  return createPricingService({ repository: { get: async () => record as any, listAll: async () => [],
    upsert: noWrite, appendHistory: noWrite, getHistory: async () => [] }, catalog: [device], snapshot: {},
    pricingMode: mode, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
    signingSecret: 'apple512-isolation-offline-signing-secret', tokenTtlSeconds: 900,
    now: () => new Date(clock), logger: { info() {}, warn() {}, error() {} } });
}

// These are dispatch/isolation integration checks. The fitted deduction values and
// observed single-fault goldens are independently exercised by apple-reference-rules.
const ruleExpected = (diagnostics: any, reference = 72480) => {
  const q = appleEvidenceQuote(device.model, device.storage, reference, diagnostics);
  assert(q && q.source === 'model');
  return { equivalent: q.outcome.price, quote: Math.round(q.outcome.price + referenceBonus(reference)) };
};
const controls = [
  { name: 'reported Single eSIM', edit: {}, oldExplicit: 39988, oldHybrid: 39988 },
  { name: 'unobserved eSIM null', edit: { eSim: null }, oldExplicit: 39988, oldHybrid: 39988 },
  { name: 'bent body', edit: { bodyBent: 'Bent/ curved panel' }, oldExplicit: 36390, oldHybrid: 36390 },
  { name: 'display lines', edit: { screenLines: 'Visible line(s) on display' }, oldExplicit: 19635, oldHybrid: 19635 },
  { name: 'display spots', edit: { screenSpots: 'Large/ heavy visible spots on screen' }, oldExplicit: 19635, oldHybrid: 19635 },
  { name: 'unseen hardware', edit: { hardware: ['face', 'battery_service', 'wifi'] }, oldExplicit: 19635, oldHybrid: 19635 },
  { name: 'unsupported eSIM', edit: { eSim: 'Dual eSIM' }, oldExplicit: 36223, oldHybrid: 36223 },
  { name: 'changed reference', edit: {}, reference: 72481, oldExplicit: 39988, oldHybrid: 39988 },
];
for (const control of controls) {
  test(`calculator uses reference rules for ${control.name}`, () => {
    const q = calculateFhoneifyPrice(device.brand, device.model, control.reference ?? 72480,
      { ...answers, ...control.edit }, undefined, device.storage);
    assert.equal(q.fhoneifyPrice, ruleExpected({ ...answers, ...control.edit }, control.reference ?? 72480).quote);
  });
  test(`legacy rollback service preserves pre-release ${control.name}`, async () => {
    const q = await service('legacy', control.reference).quote({ ...device, diagnostics: { ...answers, ...control.edit } });
    assert(q.ok); assert.equal(q.fhoneifyPrice, ruleExpected({ ...answers, ...control.edit }, control.reference ?? 72480).quote);
    assert(!q.pricingVersion.includes('apple512-oow-router'));
  });
}

test('supported hybrid uses fitted rules, reference bonus and signed coupon allowance', async () => {
  const q = await service('hybrid').quote({ ...device, diagnostics: answers });
  assert(q.ok); assert.equal(q.fhoneifyPrice, ruleExpected(answers).quote);
  assert.equal(q.internal.cashifyConditionEquivalent, ruleExpected(answers).equivalent);
  assert.equal(customerPayout(q.fhoneifyPrice, false, q.couponHeadroom).payout, q.fhoneifyPrice - 99);
  assert.equal(customerPayout(q.fhoneifyPrice, true, q.couponHeadroom).payout, q.fhoneifyPrice - 99);
});

test('unsupported hybrid answers, changed reference and expiry do not enable corrected dispatch', async () => {
  for (const control of controls.filter(c => !['reported Single eSIM', 'bent body', 'display lines', 'display spots'].includes(c.name))) {
    const q = await service('hybrid', control.reference).quote({ ...device, diagnostics: { ...answers, ...control.edit } });
    assert(q.ok); assert.equal(q.fhoneifyPrice, ruleExpected({ ...answers, ...control.edit }, control.reference ?? 72480).quote, control.name);
    assert(!q.pricingVersion.includes('apple512-oow-router'));
  }
  const expired = await service('hybrid', 72480, '2026-11-01T00:00:00Z').quote({ ...device, diagnostics: answers });
  assert(expired.ok); assert.equal(expired.fhoneifyPrice, ruleExpected(answers).quote);
  for (const control of controls.filter(c => ['bent body', 'display lines', 'display spots'].includes(c.name))) {
    const q = await service('hybrid').quote({ ...device, diagnostics: { ...answers, ...control.edit } });
    assert(q.ok); assert.equal(q.fhoneifyPrice, ruleExpected({ ...answers, ...control.edit }, control.reference ?? 72480).quote, control.name);
    assert(!q.pricingVersion.includes('apple512-oow-router'));
  }
});

test('public diagnostic extras cannot request internal corrected dispatch', async () => {
  const q = await service('hybrid').quote({ ...device, diagnostics: { ...answers, eSim: 'Dual eSIM',
    calculationContext: { apple512OutOfWarrantyDispatch: true } } });
  assert(q.ok); assert.equal(q.fhoneifyPrice, ruleExpected({ ...answers, eSim: 'Dual eSIM' }).quote);
});

test('all 74 historical combinations use current rules and the original-reference bonus without caches', async () => {
  const replay = await replayTeamText();
  const unique = new Map<string, any>();
  for (const row of fixture.rows) {
    if (row.sellingPrice == null || !row.diagnostics.answersComplete) continue;
    const result = replay.rows.find(r => r.id === row.id)!;
    const d = parseDiagnostics(result.fullInput.diagnostics); assert(d.ok);
    if (!supportedApple512Fallback(result.fullInput, d.value, row.referencePrice!, new Date(replay.replayClock))) continue;
    if (result.quoteAmount == null) continue;
    unique.set(JSON.stringify([row.identity, row.referencePrice, row.answers]), result);
  }
  assert.equal(unique.size, 74);
  for (const row of unique.values()) {
    const expected = appleEvidenceQuote(row.identity.model, row.identity.storage, row.referenceUsed, row.fullInput.diagnostics);
    assert(expected && expected.source === 'model');
    assert.equal(row.conditionEquivalent, expected.outcome.price, row.id);
    const bonus = referenceBonus(row.referenceUsed);
    assert.equal(row.quoteAmount, Math.round(row.conditionEquivalent + bonus), row.id);
    assert.equal(row.couponOn.payout, row.couponOff.payout, row.id);
    assert.equal(row.method.exactEvidenceApplied, false, row.id);
  }
});

test('actual old POST endpoint in rollback mode preserves pre-release result without lead persistence', async () => {
  const sentinel = 'postgresql://offline:offline@127.0.0.1:1/none';
  Object.assign(process.env, { DATABASE_URL: sentinel, DIRECT_URL: sentinel, NODE_ENV: 'test',
    JWT_SECRET: 'apple512-offline-jwt', QUOTE_SIGNING_SECRET: 'apple512-offline-signing-secret-32plus',
    PRICING_RELEASE_CANDIDATE: 'off', LOG_LEVEL: 'silent', ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false' });
  const { getReferencePriceRepository } = await import('../../lib/referencePricing/getStore');
  const repository = getReferencePriceRepository();
  const oldGet = repository.get;
  repository.get = async () => ({ ...device, deviceKey: deviceKey(device), currentPrice: 72480, source: 'cashify',
    status: 'fresh', matchConfidence: 'exact', lastVerifiedAt: new Date().toISOString(), consecutiveFailures: 0 }) as any;
  const [{ default: express }, { default: router }, { pricingRelease }, { default: prisma }] = await Promise.all([
    import('express'), import('../../server/modules/quote/routes'), import('../../server/modules/quote/pricing'), import('../../server/lib/prisma')]);
  assert.equal(pricingRelease.mode, 'legacy');
  let writes = 0;
  prisma.$connect = async () => { throw new Error('No database connection permitted'); };
  Object.defineProperty(prisma.lead, 'create', { value: async () => { writes++; throw new Error('No leads permitted'); } });
  const app = express(); app.use(express.json()); app.use('/api/quote', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address(); assert(address && typeof address !== 'string');
    for (const [diagnostics, expectedPrice] of [[answers, ruleExpected(answers).quote], [{ ...answers, bodyBent: 'Bent/ curved panel' }, ruleExpected({ ...answers, bodyBent: 'Bent/ curved panel' }).quote]] as const) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/quote`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: device.id, condition: 'good', answers: diagnostics }) });
      const body = await response.json(); assert.equal(response.status, 200);
      assert.equal(body.data.estimatedPrice, expectedPrice); assert.equal(writes, 0);
    }
  } finally {
    repository.get = oldGet;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
