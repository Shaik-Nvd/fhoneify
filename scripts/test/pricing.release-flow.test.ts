/** Real HTTP/controllers, injected pricing repositories and a local lead spy.
 * No production database, browser, scraper, or external request is used.
 * --serve keeps the fixture API available on 127.0.0.1:5007 for UI checks.
 */
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPricingService, RELEASE_CANDIDATE_PRICING_VERSION, type PricingServiceDeps } from '../../lib/pricing/pricingService';
import { conditionClass } from '../../lib/pricing/releaseCandidate';
import { PRICING_ENGINE_VERSION } from '../../lib/pricing/engine';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { InMemoryQuestionnaireProfileStore } from '../../lib/referencePricing/questionnaire/store';
import { questionnaireModelKey } from '../../lib/referencePricing/questionnaire/types';
import { customerPayout } from '../../lib/pricing/payout';
import { canonicalDiagnosticsHash, signQuoteToken, verifyQuoteToken } from '../../lib/pricing/quoteToken';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { loadQuoteSession, saveQuoteSession, type SignedQuote } from '../../lib/pricing/quoteSession';
import type { WorkbookRouteEvidence } from '../../lib/pricing/teamWorkbookResearchQuoteService';
import { loadReleaseRouteEvidence } from '../../lib/pricing/releaseRouteEvidence';

const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
process.env.DATABASE_URL = sentinel;
process.env.DIRECT_URL = sentinel;
process.env.JWT_SECRET = 'local-http-fixture-jwt-secret-not-for-production';
process.env.QUOTE_SIGNING_SECRET = 'local-http-fixture-signing-secret-not-for-production';
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.ENABLE_LIVE_MARKET_PRICE_SCRAPE = 'false';
process.env.QUOTE_PRICE_RATE_LIMIT = '1000';
process.env.QUOTE_LEAD_RATE_LIMIT = '1000';

const secret = process.env.QUOTE_SIGNING_SECRET;
const at = new Date('2026-10-03T12:00:00Z');
const observedAt = '2026-10-03T11:00:00Z';
const records = new Map<string, ReferencePriceRecord>();
const profiles = new InMemoryQuestionnaireProfileStore();
const fixtureDevices = [
  ['OnePlus', 'OnePlus Nord', '8 GB/128 GB', 8340],
  ['OnePlus', 'Oneplus Open', '16 GB/512 GB', 51650],
  ['Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', 23980],
  ['Xiaomi', 'Xiaomi Redmi Note 10 Pro Max', '6 GB/128 GB', 9490],
  ['Apple', 'Apple iPhone 12 Pro', '6 GB/256 GB', 24460],
  ['Samsung', 'Samsung Galaxy S23 FE 5G', '8 GB/128 GB', 18060],
] as const;
for (const [brand, model, storage, price] of fixtureDevices) {
  const device = findCatalogDevice(brand, model, storage);
  if (!device) continue;
  const k = deviceKey(device);
  records.set(k, { ...device, deviceKey: k, source: 'cashify', currentPrice: price, matchConfidence: 'exact', status: 'fresh',
    lastVerifiedAt: observedAt, lastAttemptedAt: observedAt, lastFailureAt: null, lastFailureError: null,
    consecutiveFailures: 0, createdAt: observedAt, updatedAt: observedAt });
  profiles.profiles.set(questionnaireModelKey(device), { brand: device.brand, model: device.model, modelKey: questionnaireModelKey(device),
    warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED', questionLabels: [], status: 'OK', statusDetail: null,
    sourceUrl: 'https://www.cashify.in/sell-old-mobile-phone/fixture', variantsChecked: 1, parserVersion: 'local-http-fixture', observedAt });
}
const repository: PricingServiceDeps['repository'] = {
  async get(k) { return records.get(k) ?? null; }, async listAll() { return [...records.values()]; },
  async upsert(r) { records.set(r.deviceKey, r); }, async appendHistory() {}, async getHistory() { return []; },
};
const routeEvidence: WorkbookRouteEvidence[] = [{ brand: 'OnePlus', model: 'OnePlus Nord', storage: '8 GB/128 GB',
  observedAt, evidenceSha256: 'a'.repeat(64), semantics: { warrantyMode: 'NOT_ASKED', billMode: 'NOT_ASKED', ageMode: 'NOT_ASKED' },
  boxMode: 'ASKED', chargerMode: 'ASKED', sPenMode: 'NOT_ASKED', eSimMode: 'NOT_ASKED' }];
const make = (mode?: 'legacy' | 'release-candidate', overrides: Partial<PricingServiceDeps> = {}) => createPricingService({ repository, questionnaireStore: profiles,
  signingSecret: secret, now: () => at, tokenTtlSeconds: 900, strictReferenceMode: true, referenceLookupTimeoutMs: 100,
  snapshot: {}, pricingMode: mode, releaseRouteEvidence: routeEvidence, logger: { info() {}, warn() {}, error() {} }, ...overrides });
const legacy = make('legacy');
const release = make('release-candidate');
const nord = findCatalogDevice('OnePlus', 'OnePlus Nord', '8 GB/128 GB')!;
assert(nord, 'fixture exact Nord variant must exist');
const clean = { calls: true, touch: true, originalScreen: true, defects: [], screenCondition: 'No scratches on screen',
  screenSpots: 'No spots on screen', screenLines: 'No line(s) on Display', screenDiscoloration: 'No Discoloration',
  bodyScratches: 'No scratches', bodyDents: 'No dents', bodyPanel: 'No defect on side or back panel', bodyBent: 'Phone not bent',
  hardware: [], accessories: ['box', 'charger'], warranty: null, validBill: null, eSim: null, mobileAge: null };
const display = { ...clean, defects: ['screen_spot'], screenLines: 'Visible line(s) on display' };
const manualTouch = { ...clean, touch: false };
const requestFor = (diagnostics: unknown) => ({ brand: nord.brand, model: nord.model, storage: nord.storage, diagnostics });
const leads: Array<{ quotedPrice: number; answers: Record<string, unknown>; [key: string]: unknown }> = [];
let active = release;

async function startFixture(port: number): Promise<Server> {
  // Load real server modules only after the sentinel and local secrets exist.
  const [{ default: express }, { default: prisma }, { pricingService }, { default: router }] = await Promise.all([
    import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'), import('../../server/modules/quote/routes'),
  ]);
  assert.equal(process.env.DATABASE_URL, sentinel, 'dotenv must never override the no-database sentinel');
  prisma.$connect = async () => { throw new Error('Fixture prohibits database connections'); };
  Object.defineProperty(prisma.lead, 'create', { value: async (args: unknown) => {
    const data = (args as { data: typeof leads[number] }).data;
    assert(Number.isInteger(data.quotedPrice) && data.quotedPrice > 0, 'only verified positive prices may be stored');
    leads.push(data);
    return { ...data, id: `fixture-lead-${leads.length}`, createdAt: at } as never;
  } });
  pricingService.quote = (input) => active.quote(input);
  pricingService.getUpto = (input) => active.getUpto(input);
  pricingService.verifyLeadPrice = (input) => active.verifyLeadPrice(input);
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (_req.method === 'OPTIONS') { res.status(204).end(); return; }
    next();
  });
  app.get('/health', (_req, res) => res.json({ fixture: true, database: 'disabled', mode: 'release-candidate', leadCount: leads.length }));
  app.use('/api/quote', router);
  return await new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

async function run() {
  const server = await startFixture(process.argv.includes('--serve') ? 5007 : 0);
  const addr = server.address(); assert(addr && typeof addr !== 'string');
  const url = `http://127.0.0.1:${addr.port}`;
  if (process.argv.includes('--serve')) {
    console.log(`LOCAL FIXTURE API ${url}: release mode, sentinel database, in-memory leads only; Nord 8/128 available`);
    return;
  }
  let passed = 0; const failures: string[] = [];
  const check = async (name: string, fn: () => Promise<void> | void) => {
    try { await fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
  };
  const post = async (path: string, body: object) => {
    const response = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as { success: boolean; code?: string; data?: any } };
  };
  const leadFor = (diagnostics: object, token?: string, quotedPrice?: number) => ({ ...requestFor(diagnostics), diagnostics: undefined,
    answers: diagnostics, phone: '0000000000', quoteToken: token, quotedPrice });
  try {
    await check('default legacy still returns the existing engine version', async () => {
      active = make(); const result = await post('/api/quote/price', requestFor(clean));
      assert.equal(result.status, 200); assert.equal(result.body.data.pricingVersion, PRICING_ENGINE_VERSION);
      assert(!('internal' in result.body.data)); assert(result.body.data.fhoneifyPrice > 0);
      const explicit = await legacy.quote(requestFor(clean)); assert(explicit.ok); assert.equal(result.body.data.fhoneifyPrice, explicit.fhoneifyPrice);
    });
    await check('release quote is signed for exact device and parsed answers', async () => {
      active = release; const result = await post('/api/quote/price', requestFor(clean));
      assert.equal(result.status, 200); const data = result.body.data;
      assert.equal(data.pricingVersion, RELEASE_CANDIDATE_PRICING_VERSION); assert(!('internal' in data));
      const verified = verifyQuoteToken(data.quoteToken, secret, at.getTime() / 1000); assert(verified.ok);
      const parsed = parseDiagnostics(clean); assert(parsed.ok);
      assert.equal(verified.payload.dh, canonicalDiagnosticsHash(parsed.value)); assert.equal(verified.payload.p, data.fhoneifyPrice);
      assert.equal(verified.payload.pv, data.pricingVersion);
    });
    await check('reload retains exact token and leads persist server price and unchanged fee', async () => {
      active = release; const quote = await release.quote(requestFor(clean)); assert(quote.ok);
      const signed: SignedQuote = { device: { brand: nord.brand, model: nord.model, storage: nord.storage }, price: quote.fhoneifyPrice,
        getUpto: quote.startingPrice, token: quote.quoteToken, expiresAt: quote.expiresAt, diagnostics: clean, questionnaire: quote.questionnaire,
        pricingVersion: quote.pricingVersion };
      const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null,
        setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
      saveQuoteSession(storage, { ...signed.device, starting: signed, final: signed, answers: clean, couponApplied: false });
      const restored = loadQuoteSession(storage, signed.device, at); assert(restored?.final); assert.equal(restored.final.token, quote.quoteToken);
      assert.equal(restored.final.pricingVersion, quote.pricingVersion);
      const response = await post('/api/quote/leads', leadFor(clean, restored.final.token, 1)); assert.equal(response.status, 200);
      const last = leads.at(-1)!; assert.equal(last.quotedPrice, quote.fhoneifyPrice);
      const pricing = last.answers.pricing as { customerPayout: unknown; clientPriceMismatch: boolean; priceSource: string };
      assert.deepEqual(pricing.customerPayout, customerPayout(quote.fhoneifyPrice, false)); assert(pricing.clientPriceMismatch);
      assert.equal(pricing.priceSource, 'quote_token');
    });
    await check('manual quote returns 422 without any token or binding price', async () => {
      active = release; const response = await post('/api/quote/price', requestFor(manualTouch));
      assert.equal(response.status, 422); assert.equal(response.body.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal(response.body.data, undefined);
    });
    await check('no-token manual lead cannot reach persistence', async () => {
      active = release; const count = leads.length; const response = await post('/api/quote/leads', leadFor(manualTouch));
      assert.equal(response.status, 422); assert.equal(response.body.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal(leads.length, count);
    });
    await check('legacy token cannot bypass current release inspection gate', async () => {
      const old = await legacy.quote(requestFor(manualTouch)); assert(old.ok); active = release;
      const count = leads.length; const response = await post('/api/quote/leads', leadFor(manualTouch, old.quoteToken, old.fhoneifyPrice));
      assert.equal(response.status, 422); assert.equal(response.body.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal(leads.length, count);
    });
    await check('mode/version mismatch recomputes instead of relabelling an old token price', async () => {
      const old = await legacy.quote(requestFor(clean)); const current = await release.quote(requestFor(clean)); assert(old.ok && current.ok);
      const result = await release.verifyLeadPrice({ ...requestFor(clean), quoteToken: old.quoteToken, clientQuotedPrice: old.fhoneifyPrice });
      assert(result.ok); assert.equal(result.price, current.fhoneifyPrice); assert.equal(result.audit.priceSource, 'recomputed');
      assert.equal(result.audit.pricingVersion, RELEASE_CANDIDATE_PRICING_VERSION); assert(result.audit.tokenRejectedReason);
    });
    await check('multiple functional faults cannot be classified as single functional', () => {
      assert.equal(conditionClass({ ...clean, hardware: ['charging', 'back_camera', 'front_camera', 'wifi', 'speaker', 'fingerprint'] }), 'combined');
    });
    await check('multiple body faults cannot be classified as single body', () => {
      assert.equal(conditionClass({ ...clean, bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2' }), 'combined');
    });
    await check('nonworking calls cannot be classified as clean', () => {
      assert.notEqual(conditionClass({ ...clean, calls: false }), 'clean');
    });
    await check('tampered diagnostics reject token and manual fallback without persistence', async () => {
      const quote = await release.quote(requestFor(clean)); assert(quote.ok); active = release;
      const count = leads.length; const response = await post('/api/quote/leads', leadFor(manualTouch, quote.quoteToken, quote.fhoneifyPrice));
      assert.equal(response.status, 422); assert.equal(leads.length, count);
    });
    await check('malformed diagnostics fail before lead persistence', async () => {
      active = release; const count = leads.length;
      const response = await post('/api/quote/leads', leadFor({ ...clean, hardware: 'charging' }));
      assert.equal(response.status, 400); assert.equal(response.body.code, 'INVALID_DIAGNOSTICS'); assert.equal(leads.length, count);
    });
    await check('candidate display needs actual conditional route evidence, not a fabricated fixture route', async () => {
      active = make('release-candidate', { releaseRouteEvidence: [] }); const result = await post('/api/quote/price', requestFor(display));
      assert.equal(result.status, 422); assert.equal(result.body.code, 'MANUAL_INSPECTION_REQUIRED');
    });
    await check('verified exact Nord display quote integrates the supported repair component', async () => {
      active = release; const quote = await release.quote(requestFor(display)); assert(quote.ok);
      assert.equal(quote.internal.cashifyConditionEquivalent, 3640);
      const result = await post('/api/quote/price', requestFor(display)); assert.equal(result.status, 200);
      assert.equal(result.body.data.fhoneifyPrice, quote.fhoneifyPrice);
    });
    await check('unverified reference source never receives a verified candidate quote', async () => {
      const key = deviceKey(nord); const original = records.get(key)!;
      try { records.set(key, { ...original, source: 'legacy_migration' }); const result = await release.quote(requestFor(display));
        assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED'); }
      finally { records.set(key, original); }
    });
    await check('failed stored questionnaire cannot masquerade as verified NOT_ASKED', async () => {
      const key = questionnaireModelKey(nord); const original = profiles.profiles.get(key)!;
      try { profiles.profiles.set(key, { ...original, status: 'FETCH_FAILED' }); const result = await release.quote(requestFor(display));
        assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED'); }
      finally { profiles.profiles.set(key, original); }
    });
    await check('UNKNOWN conditional accessory visibility remains unsupported', async () => {
      const unknown = make('release-candidate', { releaseRouteEvidence: [{ ...routeEvidence[0], chargerMode: 'UNKNOWN' }] });
      const result = await unknown.quote(requestFor(display)); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
    });
    await check('contradictory accessory flags cannot receive a binding quote', async () => {
      const result = await release.quote(requestFor({ ...clean, box: false })); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
    });
    await check('six valid Note15 functional faults return 422, including an old legacy token', async () => {
      const note = findCatalogDevice('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB'); assert(note);
      const diagnostics = { ...clean, hardware: ['charging', 'back_camera', 'front_camera', 'wifi', 'speaker', 'fingerprint'] };
      const input = { brand: note.brand, model: note.model, storage: note.storage, diagnostics };
      const old = await legacy.quote(input); assert(old.ok); active = release; const count = leads.length;
      const quote = await post('/api/quote/price', input); assert.equal(quote.status, 422);
      const lead = await post('/api/quote/leads', { ...input, diagnostics: undefined, answers: diagnostics, phone: '0000000000', quoteToken: old.quoteToken });
      assert.equal(lead.status, 422); assert.equal(leads.length, count);
    });
    await check('reference drift and non-exact identity require revalidation', async () => {
      const key = deviceKey(nord); const original = records.get(key)!;
      try {
        for (const replacement of [{ ...original, currentPrice: original.currentPrice! - 80 }, { ...original, matchConfidence: 'high' as const }]) {
          records.set(key, replacement); const result = await release.quote(requestFor(display)); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
        }
      } finally { records.set(key, original); }
    });
    await check('expired or future-dated route evidence never signs a quote', async () => {
      for (const timestamp of ['2026-08-01T11:00:00Z', '2026-10-04T11:00:00Z']) {
        const service = make('release-candidate', { releaseRouteEvidence: [{ ...routeEvidence[0], observedAt: timestamp }] });
        const result = await service.quote(requestFor(display)); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
      }
    });
    await check('NOT_ASKED cannot absorb an explicitly answered warranty', async () => {
      const result = await release.quote(requestFor({ ...clean, warranty: true })); assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED');
    });
    await check('repository row variant metadata must match its reference key', async () => {
      const key = deviceKey(nord); const original = records.get(key)!;
      try { records.set(key, { ...original, storage: '12 GB/256 GB' }); const result = await release.quote(requestFor(display));
        assert(!result.ok); assert.equal(result.code, 'MANUAL_INSPECTION_REQUIRED'); }
      finally { records.set(key, original); }
    });
    await check('signed token schema rejects nonpositive price and malformed time range', async () => {
      const quote = await release.quote(requestFor(clean)); assert(quote.ok);
      const original = verifyQuoteToken(quote.quoteToken, secret, at.getTime() / 1000); assert(original.ok);
      const payload = original.payload;
      for (const patch of [{ p: 0 }, { p: -1 }, { iat: NaN }, { iat: payload.exp + 1 }, { exp: payload.iat - 1 }, { iat: payload.iat + .5 }]) {
        const token = signQuoteToken({ ...payload, ...patch }, secret);
        assert(!verifyQuoteToken(token, secret, at.getTime() / 1000).ok, 'invalid signed payload must not be accepted');
      }
    });
    await check('release token cannot carry a candidate price into reverted legacy mode', async () => {
      const candidate = await release.quote(requestFor(clean)); const current = await legacy.quote(requestFor(clean)); assert(candidate.ok && current.ok);
      const result = await legacy.verifyLeadPrice({ ...requestFor(clean), quoteToken: candidate.quoteToken, clientQuotedPrice: candidate.fhoneifyPrice });
      assert(result.ok); assert.equal(result.price, current.fhoneifyPrice); assert.equal(result.audit.priceSource, 'recomputed');
      assert.equal(result.audit.pricingVersion, PRICING_ENGINE_VERSION); assert.equal(result.audit.tokenRejectedReason, 'pricing_version_changed');
    });
    await check('expired supported token recomputes without trusting the client number', async () => {
      const quote = await release.quote(requestFor(clean)); assert(quote.ok);
      const later = make('release-candidate', { now: () => new Date(at.getTime() + 900_000) });
      const result = await later.verifyLeadPrice({ ...requestFor(clean), quoteToken: quote.quoteToken, clientQuotedPrice: 1 });
      assert(result.ok); assert.equal(result.price, quote.fhoneifyPrice); assert.equal(result.audit.priceSource, 'recomputed');
      assert.equal(result.audit.tokenRejectedReason, 'expired'); assert(result.audit.clientPriceMismatch);
    });
    await check('exact Note15 single WiFi fault requires inspection without persistence', async () => {
      const note = findCatalogDevice('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB'); assert(note);
      active = release; const count = leads.length; const answers = { ...clean, hardware: ['wifi'] };
      const input = { brand: note.brand, model: note.model, storage: note.storage };
      const quote = await post('/api/quote/price', { ...input, diagnostics: answers });
      assert.equal(quote.status, 422); assert.equal(quote.body.code, 'MANUAL_INSPECTION_REQUIRED');
      const lead = await post('/api/quote/leads', { ...input, phone: '0000000000', answers });
      assert.equal(lead.status, 422); assert.equal(leads.length, count);
    });
    await check('unrecognized age, eSIM, parent and hardware cannot become clean quotes', async () => {
      active = release; const count = leads.length;
      for (const patch of [{ mobileAge: 'invented age' }, { eSim: 'Triple eSIM' }, { defects: ['invented_parent'] }, { hardware: ['invented_fault'] }]) {
        const answers = { ...clean, ...patch };
        assert.equal(conditionClass(answers), 'unknown');
        const quote = await post('/api/quote/price', requestFor(answers)); assert.equal(quote.status, 422);
        const lead = await post('/api/quote/leads', leadFor(answers)); assert.equal(lead.status, 422);
      }
      assert.equal(leads.length, count);
    });
    await check('RC legacy bucket endpoint cannot price missing answers or six-fault Note15', async () => {
      const priorMode = process.env.PRICING_RELEASE_CANDIDATE; active = release; const count = leads.length;
      const note = findCatalogDevice('Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB'); assert(note);
      try {
        process.env.PRICING_RELEASE_CANDIDATE = 'on';
        const missing = await post('/api/quote', { deviceId: nord.id, condition: 'like_new' });
        assert.equal(missing.status, 422); assert.equal(missing.body.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal(missing.body.data, undefined);
        const answers = { ...clean, hardware: ['charging', 'back_camera', 'front_camera', 'wifi', 'speaker', 'fingerprint'] };
        const severe = await post('/api/quote', { deviceId: note.id, condition: 'like_new', answers });
        assert.equal(severe.status, 422); assert.equal(severe.body.code, 'MANUAL_INSPECTION_REQUIRED'); assert.equal(severe.body.data, undefined);
        assert.equal(leads.length, count);
      } finally {
        if (priorMode === undefined) delete process.env.PRICING_RELEASE_CANDIDATE; else process.env.PRICING_RELEASE_CANDIDATE = priorMode;
      }
    });
    await check('eligible RC bucket request delegates the authoritative quote, independent of bucket multiplier', async () => {
      const priorMode = process.env.PRICING_RELEASE_CANDIDATE; active = release; const count = leads.length;
      try {
        process.env.PRICING_RELEASE_CANDIDATE = 'on';
        const exact = await post('/api/quote/price', requestFor(display)); assert.equal(exact.status, 200);
        for (const condition of ['like_new', 'poor']) {
          const bucket = await post('/api/quote', { deviceId: nord.id, condition, answers: display });
          assert.equal(bucket.status, 200); assert.deepEqual(bucket.body.data, exact.body.data);
          assert.equal(bucket.body.data.estimatedPrice, undefined); assert.equal(bucket.body.data.quoteId, undefined);
        }
        assert.equal(leads.length, count);
      } finally {
        if (priorMode === undefined) delete process.env.PRICING_RELEASE_CANDIDATE; else process.env.PRICING_RELEASE_CANDIDATE = priorMode;
      }
    });
    await check('reviewed route loader preserves UNKNOWN and rejects missing fields without a default route', () => {
      const reviewed = loadReleaseRouteEvidence(path.resolve(__dirname, '../pricing/fixtures/release-route-evidence-2026-10-02.json'));
      assert.equal(reviewed.length, 8); assert.deepEqual(loadReleaseRouteEvidence(), []);
      const folder = mkdtempSync(path.join(tmpdir(), 'fhoneify-local-route-test-'));
      const file = path.join(folder, 'routes.json');
      const row = { ...routeEvidence[0], source: 'VERIFIED_COLLECTOR_TRACE', status: 'OK', chargerMode: 'UNKNOWN' };
      try {
        writeFileSync(file, JSON.stringify({ version: 'fixture', rows: [row] }));
        assert.equal(loadReleaseRouteEvidence(file)[0].chargerMode, 'UNKNOWN');
        const { chargerMode: _omitted, ...missingField } = row;
        writeFileSync(file, JSON.stringify({ version: 'fixture', rows: [missingField] }));
        assert.throws(() => loadReleaseRouteEvidence(file), 'a missing visibility field must not become NOT_ASKED');
      } finally { unlinkSync(file); rmdirSync(folder); }
    });
    console.log(`Release flow: ${passed} passed, ${failures.length} failed; ${leads.length} in-memory leads, zero database writes.`);
    if (failures.length) throw new Error(`Release flow regressions: ${failures.join('; ')}`);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
