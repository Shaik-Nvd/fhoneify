/** Offline rollback checks for cache-off hybrid and explicit legacy mode. */
import assert from 'node:assert/strict';
import { createPricingService } from '../../lib/pricing/pricingService';
import { PRICING_ENGINE_VERSION } from '../../lib/pricing/engine';
import { createExactFinalQuoteIndex } from '../../lib/pricing/exactFinalQuote';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { resolvePricingReleaseConfig } from '../../lib/pricing/releaseConfig';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
process.env.DATABASE_URL = sentinel;
process.env.DIRECT_URL = sentinel;
process.env.JWT_SECRET = 'agent-z-rollback-jwt-secret-for-offline-tests';
process.env.QUOTE_SIGNING_SECRET = 'agent-z-rollback-signing-secret-for-offline-tests';
Object.assign(process.env, { NODE_ENV: 'test' });

const secret = process.env.QUOTE_SIGNING_SECRET;
const at = new Date('2026-10-03T12:00:00Z');
const observedAt = '2026-10-03T11:00:00Z';
const device = findCatalogDevice('OnePlus', 'OnePlus Nord', '8 GB/128 GB');
assert(device, 'fixture device must exist');
const key = deviceKey(device);
const reference: ReferencePriceRecord = { ...device, deviceKey: key, source: 'cashify', currentPrice: 8340,
  matchConfidence: 'exact', status: 'fresh', lastVerifiedAt: observedAt, lastAttemptedAt: observedAt,
  lastFailureAt: null, lastFailureError: null, consecutiveFailures: 0,
  createdAt: observedAt, updatedAt: observedAt };
const repository = {
  async get() { return reference; }, async listAll() { return [reference]; },
  async upsert() { throw new Error('Writes disabled'); }, async appendHistory() { throw new Error('Writes disabled'); },
  async getHistory() { return []; },
};
const profiles = new InMemoryQuestionnaireProfileStore();
profiles.profiles.set(questionnaireModelKey(device), { brand: device.brand, model: device.model,
  modelKey: questionnaireModelKey(device), warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED',
  questionLabels: [], status: 'OK', statusDetail: null, sourceUrl: null, variantsChecked: 1,
  parserVersion: 'agent-z-rollback-fixture', observedAt });
const route = { brand: device.brand, model: device.model, storage: device.storage, observedAt,
  evidenceSha256: 'a'.repeat(64), semantics: { warrantyMode: 'NOT_ASKED' as const, billMode: 'NOT_ASKED' as const, ageMode: 'NOT_ASKED' as const },
  boxMode: 'ASKED' as const, chargerMode: 'ASKED' as const, sPenMode: 'NOT_ASKED' as const, eSimMode: 'NOT_ASKED' as const };
const diagnostics = { calls: true, touch: true, originalScreen: true, defects: [],
  screenCondition: 'No scratches on screen', screenSpots: 'No spots on screen', screenLines: 'No line(s) on Display',
  screenDiscoloration: 'No Discoloration', bodyScratches: 'No scratches', bodyDents: 'No dents',
  bodyPanel: 'No defect on side or back panel', bodyBent: 'Phone not bent', hardware: [], accessories: ['box', 'charger'],
  warranty: null, validBill: null, eSim: null, mobileAge: null };
const exactIndex = createExactFinalQuoteIndex([{ id: 'rollback-fixture:clean', brand: device.brand, model: device.model,
  storage: device.storage, getUpto: 8340, sellingPrice: 7000, observedAt, screenshotSha256: 'b'.repeat(64),
  route: { warranty: 'NOT_ASKED', validBill: 'NOT_ASKED', mobileAge: 'NOT_ASKED', eSim: 'NOT_ASKED',
    box: 'ASKED', charger: 'ASKED', sPen: 'NOT_ASKED' }, diagnostics,
  provenance: { screenshotVerified: true, planMatched: true, routeComplete: true, source: 'test-only', role: 'FLOW_TEST_ONLY' } }]);

const make = (mode: 'legacy' | 'hybrid', withCache = false) => createPricingService({
  repository, questionnaireStore: profiles, signingSecret: secret, now: () => at, tokenTtlSeconds: 900,
  strictReferenceMode: true, referenceLookupTimeoutMs: 100, snapshot: {}, pricingMode: mode,
  releaseRouteEvidence: [route], ...(withCache ? { exactFinalQuoteIndex: exactIndex, exactFinalQuoteOfferPolicy: 'bounded-net' as const } : {}),
  logger: { info() {}, warn() {}, error() {} },
});
const input = { brand: device.brand, model: device.model, storage: device.storage, diagnostics };

async function main() {
  assert.equal(resolvePricingReleaseConfig({ PRICING_RELEASE_CANDIDATE: 'off' }).mode, 'legacy',
    'PRICING_RELEASE_CANDIDATE=off selects explicit legacy rollback');
  const [{ createLead }, { pricingService, pricingRelease }, { default: prisma }] = await Promise.all([
    import('../../server/modules/quote/controller'),
    import('../../server/modules/quote/pricing'),
    import('../../server/lib/prisma'),
  ]);
  assert.equal(process.env.DATABASE_URL, sentinel);
  prisma.$connect = async () => { throw new Error('Database connections are disabled in this test'); };
  const persisted: any[] = [];
  Object.defineProperty(prisma.lead, 'create', { value: async ({ data }: any) => {
    persisted.push(structuredClone(data));
    return { ...data, id: `memory-${persisted.length}` };
  } });

  const cachedHybrid = make('hybrid', true);
  const cacheOffHybrid = make('hybrid');
  const legacyRollback = make('legacy');
  const candidate = await cachedHybrid.quote(input);
  assert(candidate.ok && candidate.internal.exactFinalQuote, 'cache-on hybrid must issue the exact cached offer');
  const fallback = await cacheOffHybrid.quote(input);
  assert(fallback.ok && !fallback.internal.exactFinalQuote, 'cache-off hybrid must retain ordinary quote availability');
  assert.notEqual(fallback.pricingVersion, candidate.pricingVersion, 'disabling cache changes quote version');

  const accepted = await cacheOffHybrid.verifyLeadPrice({ ...input, quoteToken: fallback.quoteToken, clientQuotedPrice: fallback.fhoneifyPrice });
  assert(accepted.ok && accepted.audit.priceSource === 'quote_token', 'fresh cache-off hybrid token remains acceptable');
  const savedLeads = [{ quotedPrice: accepted.price, pricing: structuredClone(accepted.audit) }];
  const before = structuredClone(savedLeads);

  const staleAfterCacheOff = await cacheOffHybrid.verifyLeadPrice({ ...input, quoteToken: candidate.quoteToken, clientQuotedPrice: candidate.fhoneifyPrice });
  assert(staleAfterCacheOff.ok);
  assert.equal(staleAfterCacheOff.audit.priceSource, 'recomputed', 'old cache-on token is not accepted after cache rollback');
  assert.equal(staleAfterCacheOff.audit.tokenRejectedReason, 'pricing_version_changed');
  assert.deepEqual(savedLeads, before, 'a previously accepted lead snapshot remains unchanged');

  const legacyQuote = await legacyRollback.quote(input);
  assert(legacyQuote.ok && legacyQuote.pricingVersion === PRICING_ENGINE_VERSION, 'legacy rollback issues a fresh legacy-version token');
  const freshLegacy = await legacyRollback.verifyLeadPrice({ ...input, quoteToken: legacyQuote.quoteToken,
    clientQuotedPrice: legacyQuote.fhoneifyPrice });
  assert(freshLegacy.ok && freshLegacy.audit.priceSource === 'quote_token', 'fresh legacy token remains acceptable');
  const oldHybridInLegacy = await legacyRollback.verifyLeadPrice({ ...input, quoteToken: candidate.quoteToken,
    clientQuotedPrice: candidate.fhoneifyPrice });
  assert(oldHybridInLegacy.ok && oldHybridInLegacy.audit.priceSource === 'recomputed', 'old hybrid token is rejected after legacy rollback');
  assert.equal(oldHybridInLegacy.audit.tokenRejectedReason, 'pricing_version_changed');

  const submit = async (token?: string, price?: number) => {
    let status = 200;
    const res = { status(code: number) { status = code; return this; }, json() { return this; } };
    await createLead({ body: { phone: '0000000000', ...input, answers: diagnostics,
      ...(token === undefined ? {} : { quoteToken: token }), ...(price === undefined ? {} : { quotedPrice: price }) } } as any, res as any);
    return status;
  };
  const previousMode = pricingRelease.mode;
  try {
    pricingRelease.mode = 'hybrid';
    Object.assign(pricingService, { verifyLeadPrice: cachedHybrid.verifyLeadPrice });
    assert.equal(await submit(candidate.quoteToken, candidate.fhoneifyPrice), 200);
    const acceptedExactRecord = structuredClone(persisted[0]);

    pricingRelease.mode = 'hybrid';
    Object.assign(pricingService, { verifyLeadPrice: cacheOffHybrid.verifyLeadPrice });
    const writesBeforeCacheRollback = persisted.length;
    assert.equal(await submit(candidate.quoteToken, candidate.fhoneifyPrice), 409, 'old exact token cannot persist after cache-off rollback');
    assert.equal(await submit(undefined, fallback.fhoneifyPrice), 409, 'cache-off hybrid still requires a signed token');
    assert.equal(persisted.length, writesBeforeCacheRollback);
    assert.equal(await submit(fallback.quoteToken, fallback.fhoneifyPrice), 200, 'fresh cache-off hybrid token is accepted');
    const acceptedRecord = structuredClone(persisted.at(-1));

    pricingRelease.mode = 'legacy';
    Object.assign(pricingService, { verifyLeadPrice: legacyRollback.verifyLeadPrice });
    const writesBeforeLegacyRollback = persisted.length;
    assert.equal(await submit(candidate.quoteToken, candidate.fhoneifyPrice), 409, 'old hybrid token cannot persist after legacy rollback');
    assert.equal(await submit(undefined, legacyQuote.fhoneifyPrice), 409, 'legacy HTTP mode also requires a signed token');
    assert.equal(persisted.length, writesBeforeLegacyRollback);
    assert.equal(await submit(legacyQuote.quoteToken, legacyQuote.fhoneifyPrice), 200, 'fresh legacy token is accepted');
    assert.deepEqual(persisted[writesBeforeLegacyRollback - 1], acceptedRecord, 'previously accepted cache-off lead is unchanged');
    assert.deepEqual(persisted[0], acceptedExactRecord, 'previously accepted exact lead is unchanged by either rollback');
  } finally { pricingRelease.mode = previousMode; }

  console.log('PASS cache-off hybrid and legacy rollback preserve fresh-token acceptance, reject old-version tokens without writes, and leave accepted lead data unchanged');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
