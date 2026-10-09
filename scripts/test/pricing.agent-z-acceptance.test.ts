import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createPricingService } from '../../lib/pricing/pricingService';
import { existingExactFinalQuoteEvidence, existingExactFinalQuoteIndex } from '../pricing/exact-final-quote-evidence';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { customerPayout } from '../../lib/pricing/payout';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
const signingSecret = 'agent-z-in-memory-quote-signing-secret';
Object.assign(process.env, {
  DATABASE_URL: sentinel,
  DIRECT_URL: sentinel,
  JWT_SECRET: 'agent-z-in-memory-jwt-secret',
  QUOTE_SIGNING_SECRET: signingSecret,
  NODE_ENV: 'test',
  ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false',
  CASHIFY_FINAL_QUOTE_MAX_ATTEMPTS: '0',
  QUOTE_PRICE_RATE_LIMIT: '1000',
  QUOTE_LEAD_RATE_LIMIT: '1000',
});

async function main() {
  const source = existingExactFinalQuoteEvidence().find((row) => row.id.endsWith('FM037_BOXREF_BOXNO'))!;
  assert(source, 'expected deterministic FM037 quote evidence');
  const device = findCatalogDevice(source.brand, source.model, source.storage)!;
  assert(device, 'expected matching catalog device');
  const key = `${device.brand.toLowerCase()}|${device.model.toLowerCase()}|${device.storage.toLowerCase()}`;
  let reference: any = {
    deviceKey: key,
    brand: device.brand,
    model: device.model,
    storage: device.storage,
    source: 'cashify',
    currentPrice: source.getUpto,
    matchConfidence: 'exact',
    status: 'fresh',
    lastVerifiedAt: '2026-10-04T09:47:35.751Z',
    lastAttemptedAt: '2026-10-04T09:47:35.751Z',
    lastFailureAt: null,
    lastFailureError: null,
    consecutiveFailures: 0,
    createdAt: '2026-09-15T18:35:33.045Z',
    updatedAt: '2026-10-04T09:47:35.751Z',
  };
  const at = new Date('2026-10-07T18:28:00Z');
  const route = loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json')
    .find((row) => row.brand === device.brand && row.model === device.model);
  assert(route, 'expected route evidence for the fixture');
  const profiles = new InMemoryQuestionnaireProfileStore();
  profiles.profiles.set(questionnaireModelKey(device), {
    ...route.semantics,
    brand: device.brand,
    model: device.model,
    modelKey: questionnaireModelKey(device),
    questionLabels: [],
    status: 'OK',
    statusDetail: null,
    sourceUrl: null,
    variantsChecked: 1,
    parserVersion: 'agent-z-http-review',
    observedAt: '2026-09-24T18:53:45.536Z',
  });

  const service = createPricingService({
    repository: {
      async get() { return reference; },
      async listAll() { return [reference]; },
      async upsert() { throw new Error('Database writes are disabled in this test'); },
      async appendHistory() { throw new Error('Database writes are disabled in this test'); },
      async getHistory() { return []; },
    },
    questionnaireStore: profiles,
    releaseRouteEvidence: loadReleaseRouteEvidence('scripts/pricing/fixtures/release-route-evidence-2026-10-03-expansion.json'),
    pricingMode: 'hybrid',
    exactFinalQuoteIndex: existingExactFinalQuoteIndex(),
    exactFinalQuoteOfferPolicy: 'bounded-net',
    signingSecret,
    tokenTtlSeconds: 900,
    strictReferenceMode: true,
    referenceLookupTimeoutMs: 100,
    snapshot: {},
    catalog: [device],
    now: () => at,
    logger: { info() {}, warn() {}, error() {} },
  });

  const [{ default: express }, { default: prisma }, { pricingService, pricingRelease }, { default: router }] = await Promise.all([
    import('express'),
    import('../../server/lib/prisma'),
    import('../../server/modules/quote/pricing'),
    import('../../server/modules/quote/routes'),
  ]);
  assert.equal(process.env.DATABASE_URL, sentinel);
  prisma.$connect = async () => { throw new Error('Database connections are disabled in this test'); };
  const leads: any[] = [];
  Object.defineProperty(prisma.lead, 'create', {
    value: async ({ data }: any) => {
      leads.push(data);
      return { ...data, id: `in-memory-${leads.length}` };
    },
  });
  pricingRelease.mode = 'hybrid';
  pricingService.quote = service.quote;
  pricingService.getUpto = service.getUpto;
  pricingService.verifyLeadPrice = service.verifyLeadPrice;

  const app = express();
  app.use(express.json());
  app.use('/api/quote', router);
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  const post = async (path: string, body: any) => {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  };
  const identity = { brand: device.brand, model: device.model, storage: device.storage };
  const quoteRequest = { ...identity, diagnostics: source.diagnostics };
  const writesBeforeFreshQuote: any[] = [];

  try {
    const first = await post('/api/quote/price', quoteRequest);
    assert.equal(first.status, 200);
    const displayed = first.body.data;
    assert.equal(displayed.fhoneifyPrice, 6102);
    assert.equal(displayed.internal, undefined);

    // Simulate the reference refresh between display and pickup submission.
    reference = { ...reference, currentPrice: reference.currentPrice + 10 };
    const current = await service.verifyLeadPrice({
      ...quoteRequest,
      quoteToken: displayed.quoteToken,
      clientQuotedPrice: displayed.fhoneifyPrice,
    });
    assert(current.ok);
    assert.equal(current.price, 6458);

    const observations: any[] = [];
    const record = async (name: string, body: any, expected?: number) => {
      const response = await post('/api/quote/leads', body);
      observations.push({ name, status: response.status, code: response.body.code ?? null, leadWrites: leads.length });
      if (leads.length !== writesBeforeFreshQuote.length) writesBeforeFreshQuote.push({ name, storedPrice: leads.at(-1).quotedPrice });
      if (expected !== undefined) {
        assert.equal(response.status, expected, `${name}: expected HTTP ${expected}, got ${response.status} (${response.body.code ?? response.body.message ?? 'no code'})`);
      }
      return response;
    };

    for (const couponApplied of [false, true]) {
      for (const omitPrice of [false, true]) {
        const body: any = {
          ...identity,
          phone: '0000000000',
          answers: source.diagnostics,
          quoteToken: displayed.quoteToken,
          couponApplied,
          ...(omitPrice ? {} : { quotedPrice: displayed.fhoneifyPrice }),
        };
        await record(`stale-original-price-coupon-${couponApplied}-omit-${omitPrice}`, body, 409);
      }
      await record(`stale-token-updated-6458-coupon-${couponApplied}`, {
        ...identity, phone: '0000000000', answers: source.diagnostics,
        quoteToken: displayed.quoteToken, quotedPrice: 6458, couponApplied,
      }, 409);
      for (const token of ['invalid-signature', ''] as const) {
        await record(`${token ? 'invalid' : 'empty'}-token-updated-6458-coupon-${couponApplied}`, {
          ...identity, phone: '0000000000', answers: source.diagnostics,
          quoteToken: token, quotedPrice: 6458, couponApplied,
        }, 409);
      }
    }

    for (const couponApplied of [false, true]) for (const omitPrice of [false, true]) {
      await record('omitted-token-coupon-'+couponApplied+'-omit-price-'+omitPrice, {
        ...identity, phone: '0000000000', answers: source.diagnostics, couponApplied,
        ...(omitPrice ? {} : {quotedPrice: 6458}),
      }, 409);
    }
    assert.equal(leads.length, 0, 'all rejected attempts must precede persistence');

    // Issuing the fresh quote itself must not persist a lead. Record any earlier
    // tokenless write separately so the test can still exercise fresh acceptance.
    const writesBeforeFreshIssue = leads.length;
    const fresh = await post('/api/quote/price', quoteRequest);
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.data.fhoneifyPrice, 6458);
    assert.equal(leads.length, writesBeforeFreshIssue, 'issuing the fresh quote must not persist a lead');

    for (const couponApplied of [false, true]) {
      const accepted = await post('/api/quote/leads', {
        ...identity, phone: '0000000000', answers: source.diagnostics,
        quoteToken: fresh.body.data.quoteToken, quotedPrice: fresh.body.data.fhoneifyPrice, couponApplied,
      });
      assert.equal(accepted.status, 200);
      const stored = leads.at(-1);
      assert.equal(stored.quotedPrice, fresh.body.data.fhoneifyPrice);
      assert.deepEqual(stored.answers.pricing.customerPayout, customerPayout(fresh.body.data.fhoneifyPrice, couponApplied));
    }

    console.log(JSON.stringify({
      initialDisplayedGross: displayed.fhoneifyPrice,
      recalculatedGross: current.price,
      staleAndInvalidAttempts: observations,
      writesBeforeFreshQuote: writesBeforeFreshQuote.length,
      freshGross: fresh.body.data.fhoneifyPrice,
      acceptedFreshWrites: leads.length,
      databaseConnections: 0,
    }));
    assert.equal(writesBeforeFreshIssue, 0, 'nothing persists before a fresh quote is accepted');
    assert.equal(leads.length, 2, 'fresh quote accepted in both coupon modes');
    const hybridMode = pricingRelease.mode;
    try {
      pricingRelease.mode = 'legacy';
      const legacy = await post('/api/quote/leads', {...identity, phone: '0000000000', answers: source.diagnostics});
      assert.equal(legacy.status, 200, 'explicit legacy rollback keeps tokenless compatibility');
      assert.equal(leads.length, 3);
    } finally { pricingRelease.mode = hybridMode; }
    console.log('PASS hybrid requires fresh acceptance; explicit legacy-mode tokenless compatibility retained');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
