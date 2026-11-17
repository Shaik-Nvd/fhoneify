/** Offline real-router check using preserved production reads, never fabricated fresh profiles. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';

const sentinel = 'postgresql://offline:offline@127.0.0.1:1/none?connect_timeout=1';
Object.assign(process.env, {
  DATABASE_URL: sentinel, DIRECT_URL: sentinel, JWT_SECRET: 'six-iphone-offline-jwt',
  QUOTE_SIGNING_SECRET: 'six-iphone-offline-signing-secret-32plus', NODE_ENV: 'test',
  ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false', QUOTE_PRICE_RATE_LIMIT: '1000',
  QUOTE_LEAD_RATE_LIMIT: '1000', LOG_LEVEL: 'silent',
});
// Static imports above are Node builtins only: application imports happen after database isolation.
async function main() {
  const [{ createPricingService }, { existingExactFinalQuoteIndex, existingExactFinalQuoteEvidence }, { createExactFinalQuoteIndex },
    { loadReleaseRouteEvidence }, { resolvePricingReleaseConfig }, { findCatalogDevice },
    { customerPayout }, { default: express }, { default: prisma }, { pricingService }, { default: router }] = await Promise.all([
    import('../../lib/pricing/pricingService'), import('../pricing/exact-final-quote-evidence'),
    import('../../lib/pricing/exactFinalQuote'), import('../../lib/pricing/releaseRouteEvidence'),
    import('../../lib/pricing/releaseConfig'), import('../../lib/pricing/catalog'), import('../../lib/pricing/payout'),
    import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'),
    import('../../server/modules/quote/routes'),
  ]);
  assert.equal(process.env.DATABASE_URL, sentinel);
  assert.equal(process.env.DIRECT_URL, sentinel);
  prisma.$connect = async () => { throw new Error('No database connections permitted'); };
  const persisted: any[] = [];
  Object.defineProperty(prisma.lead, 'count', { value: async () => 0, configurable: true }); // coupon history: none, no database
  Object.defineProperty(prisma.lead, 'create', { value: async ({ data }: any) => {
    persisted.push(data); return { ...data, id: `offline-${persisted.length}` };
  } });
  const config = resolvePricingReleaseConfig({}, process.cwd());
  assert.equal(config.mode, 'hybrid');
  // 2026-10-28: the committed release serves iPhones from the calibrated rules; the exact captured-price cache is off (an explicit index is still testable)
  assert.equal(config.exactFinalQuoteCache, false);
  assert.equal(config.exactFinalQuoteOfferPolicy, 'bounded-net');
  const routes = loadReleaseRouteEvidence(config.routeEvidenceFile ?? undefined);
  const packageManifest = path.resolve('..', 'six-iphone-input-claude/files/scripts/pricing/fixtures/exact-captures-2026-10-10.json');
  const candidateManifest = 'scripts/pricing/fixtures/exact-captures-2026-10-10.json';
  // Portable input is the independent RED oracle before the manifest is imported.
  const rows: any[] = JSON.parse(fs.readFileSync(fs.existsSync(candidateManifest) ? candidateManifest : packageManifest, 'utf8').replace(/^\uFEFF/, '')).rows;
  const input = JSON.parse(fs.readFileSync('scripts/test/fixtures/six-iphone-production-inputs-2026-10-11.json', 'utf8').replace(/^\uFEFF/, ''));
  assert.equal(input.references.length, 6);
  assert.equal(input.profiles.length, 4);
  const unique = [...new Map(rows.map(row => [`${row.model}|${row.storage}|${JSON.stringify(row.diagnostics)}`, row])).values()];
  assert.equal(unique.length, 12);
  const at = new Date('2026-10-11T12:00:00Z');
  const catalog = input.references.map((r: any) => findCatalogDevice(r.brand, r.model, r.storage));
  assert(catalog.every(Boolean));
  const proposal = input.references.map((r: any) => {
    const capture = rows.find(row => row.model === r.model && row.storage === r.storage);
    return { ...r, currentPrice: capture.getUpto, lastVerifiedAt: capture.observedAt, updatedAt: capture.observedAt };
  });
  const profileBytesBefore = JSON.stringify(input.profiles);
  const configuredIndex = () => process.env.SIX_IPHONE_TEST_OMIT_IMPORTED_CAPTURE === 'true'
    ? createExactFinalQuoteIndex(existingExactFinalQuoteEvidence().filter(r => !r.id.startsWith('claude-iphone-2026-10-10:')))
    : existingExactFinalQuoteIndex();
  function serviceFor(references: any[], profiles = input.profiles, routeRows = routes, index: any = configuredIndex()) {
    const normal = references.map(r => ({ ...r, status: r.status.toLowerCase(), matchConfidence: r.matchConfidence.toLowerCase(),
      lastAttemptedAt: r.lastVerifiedAt, lastFailureAt: null, lastFailureError: null, createdAt: r.updatedAt }));
    return createPricingService({
      repository: { async get(key: string) { return normal.find(r => r.deviceKey === key) ?? null; },
        async listAll() { return normal; }, async upsert() { throw new Error('No reference writes'); },
        async appendHistory() { throw new Error('No reference writes'); }, async getHistory() { return []; } },
      questionnaireStore: { async get(key: string) { return profiles.find((p: any) => p.modelKey === key) ?? null; },
        async list() { return profiles; }, async upsert() { throw new Error('No profile writes'); } } as any,
      releaseRouteEvidence: routeRows, pricingMode: config.mode, exactFinalQuoteIndex: index,
      exactFinalQuoteOfferPolicy: config.exactFinalQuoteOfferPolicy, signingSecret: 'six-iphone-offline-signing-secret-32plus',
      tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
      snapshot: {}, catalog, now: () => at, logger: { info() {}, warn() {}, error() {} },
    });
  }
  let active = serviceFor(input.references);
  let observed: any;
  pricingService.quote = async req => { const result = await active.quote(req); observed = result; return result; };
  pricingService.verifyLeadPrice = req => active.verifyLeadPrice(req);
  pricingService.getUpto = req => active.getUpto(req);
  const app = express(); app.use(express.json()); app.use('/api/quote', router);
  const server: Server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const addr = server.address(); assert(addr && typeof addr !== 'string');
  const port = addr.port;
  async function post(endpoint: string, body: any) {
    const response = await fetch(`http://127.0.0.1:${port}/api/quote/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any, internal: observed?.ok ? observed.internal : null };
  }
  const request = (row: any) => ({ brand: row.brand, model: row.model, storage: row.storage, diagnostics: row.diagnostics });
  const failures: string[] = [];
  const table: any[] = [];
  try {
    for (const row of unique) {
      active = serviceFor(input.references);
      const before = await post('price', request(row));
      assert.equal(before.status, 200, `production snapshot quote available: ${row.id}`);
      const previous = input.references.find((r: any) => r.model === row.model && r.storage === row.storage);
      const beforeEligible = previous.currentPrice === row.getUpto && process.env.SIX_IPHONE_TEST_OMIT_IMPORTED_CAPTURE !== 'true';
      assert.equal(!!before.internal?.exactFinalQuote, beforeEligible, `actual old reference eligibility: ${row.id}`);
      active = serviceFor(proposal);
      const after = await post('price', request(row));
      assert.equal(after.status, 200, `proposed quote available: ${row.id}`);
      assert.equal(after.body.data.internal, undefined, 'internal fields stripped by actual controller');
      const exact = after.internal?.exactFinalQuote;
      const matches = rows.filter(r => r.model === row.model && r.storage === row.storage && r.getUpto === row.getUpto && JSON.stringify(r.diagnostics) === JSON.stringify(row.diagnostics));
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(matches.map(r => [r.id, r.screenshotSha256, r.sellingPrice, r.observedAt]).sort())).digest('hex');
      if (!exact) failures.push(`${row.id}: exact selection absent`);
      else {
        assert.deepEqual(exact.evidenceIds, matches.map(r => r.id), 'independent lineage IDs');
        assert.equal(exact.fingerprint, fingerprint, 'independent evidence fingerprint');
        assert.equal(after.internal.cashifyConditionEquivalent, row.sellingPrice);
        assert(after.body.data.pricingVersion.endsWith(`+bounded-net+${fingerprint}`));
        for (const couponApplied of [false, true]) {
          const payout = customerPayout(after.body.data.fhoneifyPrice, couponApplied, after.body.data.couponHeadroom);
          assert(payout.payout > row.sellingPrice && payout.payout - row.sellingPrice <= 2000, row.id);
          const lead = await post('leads', { ...request(row), diagnostics: undefined, answers: row.diagnostics,
            phone: '9876500000', quotedPrice: after.body.data.fhoneifyPrice, quoteToken: after.body.data.quoteToken, couponApplied });
          assert.equal(lead.status, 200, 'real lead controller accepts current signed quote into mock persistence');
          const stored = persisted.at(-1);
          assert.equal(stored.quotedPrice, after.body.data.fhoneifyPrice);
          assert.deepEqual(stored.answers.pricing.customerPayout, payout);
        }
      }
      table.push({ id: row.id, selling: row.sellingPrice, beforeGross: before.body.data.fhoneifyPrice, beforeExact: !!before.internal?.exactFinalQuote,
        afterGross: after.body.data.fhoneifyPrice, standard: customerPayout(after.body.data.fhoneifyPrice, false).payout,
        coupon: customerPayout(after.body.data.fhoneifyPrice, true, after.body.data.couponHeadroom).payout, exact: !!exact, evidenceIds: exact?.evidenceIds ?? [] });
    }
    console.log(JSON.stringify({ capturedProfiles: unique.length, configuredRoutes: routes.length, referenceProposal: proposal.map((r: any) => ({ deviceKey: r.deviceKey, currentPrice: r.currentPrice, lastVerifiedAt: r.lastVerifiedAt })), table, exactFailures: failures }, null, 2));
    assert.deepEqual(failures, [], 'all 12 unique capture profiles select exact evidence through configured real router');
    assert.equal(persisted.length, 24);
    assert.equal(JSON.stringify(input.profiles), profileBytesBefore, 'original production profile timestamps unchanged');

    // Exercise eligibility mutations with real router and compare against cache-disabled hybrid.
    let cases = 0;
    for (const row of unique) {
      const conflicts = createExactFinalQuoteIndex([...rows, { ...row, id: row.id + ':conflict', sellingPrice: row.sellingPrice + 1 }]);
      const variants: [string, any[], any[], readonly any[], any][] = [
        ['moved reference', proposal.map((r: any) => r.model === row.model && r.storage === row.storage ? { ...r, currentPrice: r.currentPrice + 1 } : r), input.profiles, routes, existingExactFinalQuoteIndex()],
        ['stale reference', proposal.map((r: any) => r.model === row.model && r.storage === row.storage ? { ...r, lastVerifiedAt: '2026-09-01T00:00:00Z' } : r), input.profiles, routes, existingExactFinalQuoteIndex()],
        ['profile mismatch', proposal, input.profiles.map((p: any) => p.modelKey.includes(row.model.toLowerCase()) ? { ...p, ageMode: 'ASKED' } : p), routes, existingExactFinalQuoteIndex()],
        ['stale profile', proposal, input.profiles.map((p: any) => p.modelKey.includes(row.model.toLowerCase()) ? { ...p, observedAt: '2026-08-01T00:00:00Z' } : p), routes, existingExactFinalQuoteIndex()],
        ['stale route', proposal, input.profiles, routes.map(r => r.model === row.model && r.storage.replace(/\s/g, '') === row.storage ? { ...r, observedAt: '2026-09-01T00:00:00Z' } : r), existingExactFinalQuoteIndex()],
        ['conflicting observation', proposal, input.profiles, routes, conflicts],
      ];
      for (const [name, refs, profiles, routeRows, index] of variants) {
        active = serviceFor(refs, profiles, routeRows, index);
        const missed = await post('price', request(row));
        assert.equal(missed.internal?.exactFinalQuote, undefined, `${name}: exact evidence must miss ${row.id}`);
        assert(!missed.body.data?.pricingVersion.includes('exact-final-selling-cache'), `${name}: no exact public version`);
        // Explicit null avoids the default index argument and represents cache disabled.
        active = serviceFor(refs, profiles, routeRows, null);
        const fallback = await post('price', request(row));
        assert.equal(missed.status, fallback.status, `${name}: hybrid availability preserved`);
        assert.equal(missed.body.data?.fhoneifyPrice, fallback.body.data?.fhoneifyPrice, `${name}: unchanged hybrid fallback`);
        cases++;
      }
    }
    console.log(`PASS 12 exact router profiles, 24 mocked signed lead payouts and ${cases} eligibility fallback cases; zero production connections/writes`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
