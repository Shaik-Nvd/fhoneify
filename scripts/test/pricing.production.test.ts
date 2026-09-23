/**
 * Suite E - production pricing system (lib/pricing/*).
 *
 * Protects what sits AROUND the unchanged methodology: diagnostics
 * validation, base-price resolution, output guardrails, signed quote
 * tokens, server-verified lead prices, and ingestion timestamp handling.
 *
 * Fully isolated: an in-memory repository stands in for Postgres, so this
 * suite never reads or writes live data.
 *
 * Run: npm run test:pricing:production
 */
import assert from 'node:assert/strict';
import { calculateFhoneifyPrice, DiagnosticsType } from '../../lib/pricingCalculator';
import { parseDiagnostics } from '../../lib/pricing/diagnostics';
import { findCatalogDevice } from '../../lib/pricing/catalog';
import {
  PERFECT_CONDITION_DIAGNOSTICS,
  PricingInvariantError,
  computeGetUpto,
  materializedSnapshotKey,
  maxPlausiblePrice,
  priceDevice,
  resolveReference,
} from '../../lib/pricing/engine';
import { canonicalDiagnosticsHash, signQuoteToken, verifyQuoteToken } from '../../lib/pricing/quoteToken';
import { createPricingService, PricingServiceDeps } from '../../lib/pricing/pricingService';
import { refreshDevice, PriceSource } from '../../lib/referencePricing/ingestion';
import type { ReferencePriceRepository } from '../../lib/referencePricing/store';
import {
  _resetReferencePriceRepositoryCacheForTests,
  disconnectReferencePriceRepository,
  getReferenceStoreHealth,
  warmReferencePriceRepository,
} from '../../lib/referencePricing/getStore';
import { deviceKey, ReferencePriceHistoryEntry, ReferencePriceRecord } from '../../lib/referencePricing/types';
import { SEED_DEVICES } from '../../lib/seed_devices';
import snapshot from '../../lib/cashify_prices.json';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

class InMemoryRepository implements ReferencePriceRepository {
  records = new Map<string, ReferencePriceRecord>();
  history = new Map<string, ReferencePriceHistoryEntry[]>();
  getBehavior: 'normal' | 'throw' | 'hang' = 'normal';

  async get(key: string) {
    if (this.getBehavior === 'throw') throw new Error('connection refused');
    if (this.getBehavior === 'hang') return new Promise<never>(() => {});
    return this.records.get(key) ?? null;
  }
  async upsert(record: ReferencePriceRecord) {
    this.records.set(record.deviceKey, { ...record });
  }
  async listAll() {
    return [...this.records.values()];
  }
  async appendHistory(key: string, entry: ReferencePriceHistoryEntry) {
    this.history.set(key, [...(this.history.get(key) ?? []), entry]);
  }
  async getHistory(key: string) {
    return this.history.get(key) ?? [];
  }
}

const silentLogger = { info() {}, warn() {}, error() {} };
const SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';

function diag(overrides: Partial<DiagnosticsType> = {}): DiagnosticsType {
  return {
    calls: true, touch: true, originalScreen: true,
    defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
    bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
    hardware: [], accessories: ['box', 'bill'],
    warranty: true, validBill: true, eSim: null, mobileAge: 'below3',
    ...overrides,
  };
}

const DAMAGED = diag({
  touch: false, originalScreen: false, warranty: false, validBill: false, accessories: [],
  defects: ['broken_screen', 'body_scratch', 'panel_missing'], bodyScratches: 'More than 2 scratches',
  bodyDents: 'Major dent(s) or more than 2', hardware: ['battery_service', 'back_camera', 'face'], mobileAge: 'above11',
});
const NOT_WORKING = diag({ calls: false, touch: false, warranty: false, validBill: false, accessories: [], mobileAge: 'above11' });

function record(device: { brand: string; model: string; storage: string }, overrides: Partial<ReferencePriceRecord> = {}): ReferencePriceRecord {
  const at = new Date().toISOString();
  return {
    deviceKey: deviceKey(device), brand: device.brand, model: device.model, storage: device.storage,
    source: 'test', sourceUrl: 'https://example.test/device', currentPrice: 50000, matchConfidence: 'exact',
    status: 'fresh', lastVerifiedAt: at, lastAttemptedAt: at, lastFailureAt: null, lastFailureError: null,
    consecutiveFailures: 0, createdAt: at, updatedAt: at, ...overrides,
  };
}

const catalog = SEED_DEVICES as any[];
const snapshotPrices = snapshot as Record<string, number>;
const snapshotDevice = catalog.find((d) => snapshotPrices[materializedSnapshotKey(d.model, d.storage)] > 0);
const basePriceOnlyDevice = catalog.find((d) => !snapshotPrices[materializedSnapshotKey(d.model, d.storage)] && d.basePrice > 0);

function service(overrides: Partial<PricingServiceDeps> = {}) {
  const repository = new InMemoryRepository();
  const svc = createPricingService({
    repository, signingSecret: SECRET, tokenTtlSeconds: 3600, strictReferenceMode: false,
    referenceLookupTimeoutMs: 50, logger: silentLogger, ...overrides,
  });
  return { svc, repository: (overrides.repository as InMemoryRepository) ?? repository };
}

async function run() {
  assert.ok(snapshotDevice, 'fixture: expected a catalog device with a snapshot price');
  assert.ok(basePriceOnlyDevice, 'fixture: expected a catalog device priced only by basePrice');

  console.log('=== Diagnostics validation ===\n');

  await test('a full quote-page payload parses and keeps every value', () => {
    const input = { ...diag({ hardware: ['battery_service'], bodyScratches: '1-2 scratches' }), charger: false };
    const parsed = parseDiagnostics(input);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, input);
  });

  await test('missing fields default to null / [] and absent charger stays absent (Samsung/Vivo depend on it)', () => {
    const parsed = parseDiagnostics({ calls: true });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.touch, null);
    assert.deepEqual(parsed.value.hardware, []);
    assert.ok(!('charger' in parsed.value));
  });

  await test('a non-array hardware field is rejected (used to crash the engine via forEach)', () => {
    const parsed = parseDiagnostics({ hardware: 'battery_service' });
    assert.equal(parsed.ok, false);
  });

  await test('oversized lists and strings are rejected', () => {
    assert.equal(parseDiagnostics({ defects: Array.from({ length: 41 }, (_, i) => `d${i}`) }).ok, false);
    assert.equal(parseDiagnostics({ mobileAge: 'x'.repeat(121) }).ok, false);
  });

  await test('unknown keys are stripped and duplicate entries collapsed', () => {
    const parsed = parseDiagnostics({ hardware: ['front_camera', 'front_camera'], injected: 1 });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.hardware, ['front_camera']);
    assert.ok(!('injected' in parsed.value));
  });

  console.log('\n=== Engine: methodology preserved, guardrails hold ===\n');

  await test('priceDevice returns exactly what calculateFhoneifyPrice returns across the whole catalog (3 condition profiles)', () => {
    let checked = 0;
    for (const device of catalog) {
      const base = resolveReference({ device });
      if (!base) continue;
      for (const profile of [PERFECT_CONDITION_DIAGNOSTICS, DAMAGED, NOT_WORKING]) {
        const expected = calculateFhoneifyPrice(device.brand, device.model, base.cashifyGetUptoReference, profile);
        let actual;
        try {
          actual = priceDevice(device.brand, device.model, base.cashifyGetUptoReference, profile);
        } catch (err: any) {
          throw new Error(`${device.brand} ${device.model} ${device.storage} @ ${base.cashifyGetUptoReference}: ${err.message} ${JSON.stringify(err.details ?? {})}`);
        }
        assert.deepEqual(actual, expected);
        checked++;
      }
    }
    assert.ok(checked > 6000, `expected to check the full catalog, checked ${checked}`);
  });

  await test('every catalog device resolves a base price (nothing falls through to an invented number)', () => {
    const unresolved = catalog.filter((d) => !resolveReference({ device: d }));
    assert.equal(unresolved.length, 0, `unresolved: ${unresolved.slice(0, 3).map((d) => d.model).join(', ')}`);
  });

  await test('resolution order: repository record > materialized snapshot > catalog basePrice', () => {
    const device = { brand: snapshotDevice.brand, model: snapshotDevice.model, storage: snapshotDevice.storage, basePrice: 1 };
    const rec = record({ brand: snapshotDevice.brand, model: device.model, storage: device.storage }, { currentPrice: 77777, source: 'cashify' });
    assert.equal(resolveReference({ device, repositoryRecord: rec })?.source, 'reference_repository');
    assert.equal(resolveReference({ device, repositoryRecord: rec })?.cashifyGetUptoReference, 77777);
    assert.equal(resolveReference({ device })?.source, 'materialized_snapshot');
    assert.equal(resolveReference({ device: { brand: 'X', model: 'No Such Phone', storage: '1GB', basePrice: 4321 } })?.source, 'catalog_base_price');
    assert.equal(resolveReference({ device: { brand: 'X', model: 'No Such Phone', storage: '1GB' } }), null);
  });

  await test('missing, zero-priced, or never-verified repository records are ignored, not priced', () => {
    const device = { brand: 'X', model: 'No Such Phone', storage: '1GB', basePrice: 4321 };
    const identity = { brand: 'X', model: device.model, storage: device.storage };
    for (const bad of [{ status: 'missing' as const }, { currentPrice: 0 }, { lastVerifiedAt: null }]) {
      assert.equal(resolveReference({ device, repositoryRecord: record(identity, bad) })?.source, 'catalog_base_price');
    }
  });

  await test('reference status is re-derived at read time, not trusted from the stored field', () => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    const rec = record({ brand: 'X', model: 'Y', storage: 'Z' }, { status: 'fresh', lastVerifiedAt: old });
    assert.equal(resolveReference({ device: { brand: 'X', model: 'Y', storage: 'Z' }, repositoryRecord: rec })?.referenceStatus, 'stale');
  });

  await test('iPhone Air keeps its historical snapshot-key alias', () => {
    assert.equal(materializedSnapshotKey('Apple iPhone Air', '256GB'), 'apple-iphone-17-air-256gb');
  });

  await test('"Get upto" is the Cashify Get Upto plus the capped uplift, with no deductions', () => {
    assert.equal(computeGetUpto(120000), 122000, '4% tier capped at ₹2,000');
    assert.equal(computeGetUpto(45570), 47570, '6% tier capped at ₹2,000');
    assert.equal(computeGetUpto(27220), 28853, '6% tier');
    assert.equal(computeGetUpto(13550), 14634, '8% tier');
    const perfect = calculateFhoneifyPrice('Apple', 'iPhone 17 Pro Max', 120000, PERFECT_CONDITION_DIAGNOSTICS);
    assert.ok(perfect.fhoneifyPrice <= computeGetUpto(120000), 'no final offer exceeds the Get Upto');
    assert.ok(perfect.cashifyConditionEquivalent <= 120000, 'no Cashify equivalent exceeds the Cashify Get Upto');
  });

  await test('legacy pre-inflated snapshot values are converted, live Cashify values are used as-is', () => {
    const device = { brand: 'Apple', model: 'Apple iPhone 15', storage: '512GB' };
    const legacy = resolveReference({ device, snapshot: { 'apple-iphone-15-512gb': 59927 }, snapshotSources: {} })!;
    assert.equal(legacy.semantics, 'legacy_pre_inflated_base');
    assert.ok(Math.abs(legacy.cashifyGetUptoReference - 45570) < 1000, `legacy 59,927 must convert to ~Cashify ₹45,570, got ${legacy.cashifyGetUptoReference}`);
    const live = resolveReference({ device, repositoryRecord: record(device, { currentPrice: 45570, source: 'cashify' }) })!;
    assert.equal(live.semantics, 'cashify_get_upto');
    assert.equal(live.cashifyGetUptoReference, 45570);
    const migrated = resolveReference({ device, repositoryRecord: record(device, { currentPrice: 59927, source: 'legacy_migration:lib/cashify_prices.json' }) })!;
    assert.equal(migrated.cashifyGetUptoReference, legacy.cashifyGetUptoReference);
  });

  await test('non-positive or non-finite base prices are refused', () => {
    for (const bad of [0, -5, NaN, Infinity]) {
      assert.throws(() => priceDevice('Apple', 'iPhone 14', bad, diag()), PricingInvariantError);
    }
  });

  await test('ceiling allows the fixed ₹1,200 non-working price on very cheap devices', () => {
    const result = priceDevice('Apple', 'iPhone 6', 400, NOT_WORKING);
    assert.ok(result.fhoneifyPrice <= maxPlausiblePrice(400));
  });

  console.log('\n=== Quote tokens ===\n');

  const payload = { v: 1 as const, dk: 'apple|iphone 14|128gb', dh: 'hash', p: 15077, pv: 'test', iat: 1000, exp: 2000 };

  await test('a signed token verifies and returns its payload', () => {
    const result = verifyQuoteToken(signQuoteToken(payload, SECRET), SECRET, 1500);
    assert.ok(result.ok);
    assert.deepEqual(result.payload, payload);
  });

  await test('a tampered price, a wrong secret, an expired or malformed token are all rejected', () => {
    const token = signQuoteToken(payload, SECRET);
    const [, signature] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ ...payload, p: 99999 })).toString('base64url')}.${signature}`;
    assert.deepEqual(verifyQuoteToken(forged, SECRET, 1500), { ok: false, reason: 'bad_signature' });
    assert.deepEqual(verifyQuoteToken(token, `${SECRET}-other`, 1500), { ok: false, reason: 'bad_signature' });
    assert.deepEqual(verifyQuoteToken(token, SECRET, 2000), { ok: false, reason: 'expired' });
    assert.deepEqual(verifyQuoteToken('not-a-token', SECRET, 1500), { ok: false, reason: 'malformed' });
  });

  await test('diagnostics hash ignores array order but changes with any answer', () => {
    const a = diag({ hardware: ['wifi', 'speaker'] });
    const b = diag({ hardware: ['speaker', 'wifi'] });
    assert.equal(canonicalDiagnosticsHash(a), canonicalDiagnosticsHash(b));
    assert.notEqual(canonicalDiagnosticsHash(a), canonicalDiagnosticsHash(diag({ hardware: ['wifi'] })));
  });

  console.log('\n=== Pricing service ===\n');

  const identity = { brand: snapshotDevice.brand, model: snapshotDevice.model, storage: snapshotDevice.storage };

  await test('quote issues a signed token and exposes no internal figures publicly', async () => {
    const { svc } = service();
    const result = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(result.ok);
    const expected = calculateFhoneifyPrice(identity.brand, identity.model, resolveReference({ device: identity })!.cashifyGetUptoReference, diag());
    assert.equal(result.fhoneifyPrice, expected.fhoneifyPrice);
    const verified = verifyQuoteToken(result.quoteToken, SECRET, Math.floor(Date.now() / 1000));
    assert.ok(verified.ok && verified.payload.p === result.fhoneifyPrice);
    assert.ok(!JSON.stringify(verified).includes(String(expected.cashifyConditionEquivalent)) || expected.cashifyConditionEquivalent === expected.fhoneifyPrice);
  });

  await test('brand/model/storage matching is case- and whitespace-insensitive only', async () => {
    assert.ok(findCatalogDevice(` ${identity.brand.toUpperCase()} `, identity.model.toLowerCase(), identity.storage));
    const { svc } = service();
    const result = await svc.quote({ ...identity, model: `${identity.model} Pro Ultra`, diagnostics: diag() });
    assert.equal(result.ok || result.code, 'DEVICE_NOT_FOUND');
  });

  await test('the repository price wins over the snapshot when present', async () => {
    const repository = new InMemoryRepository();
    await repository.upsert(record(identity, { currentPrice: 61000 }));
    const { svc } = service({ repository });
    const result = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(result.ok);
    assert.equal(result.internal.baseSource, 'reference_repository');
    assert.equal(result.fhoneifyPrice, calculateFhoneifyPrice(identity.brand, identity.model, 61000, diag()).fhoneifyPrice);
  });

  await test('a failing or hanging repository degrades to the snapshot instead of failing the quote', async () => {
    for (const behavior of ['throw', 'hang'] as const) {
      const repository = new InMemoryRepository();
      repository.getBehavior = behavior;
      const { svc } = service({ repository });
      const result = await svc.quote({ ...identity, diagnostics: diag() });
      assert.ok(result.ok, `${behavior}: expected a quote`);
      assert.equal(result.referenceLookupDegraded, true);
      assert.equal(result.internal.baseSource, 'materialized_snapshot');
    }
  });

  await test('strict reference mode refuses devices priced only by catalog basePrice', async () => {
    const device = { brand: basePriceOnlyDevice.brand, model: basePriceOnlyDevice.model, storage: basePriceOnlyDevice.storage };
    assert.ok((await service().svc.quote({ ...device, diagnostics: diag() })).ok);
    const strict = await service({ strictReferenceMode: true }).svc.quote({ ...device, diagnostics: diag() });
    assert.equal(strict.ok || strict.code, 'REFERENCE_PRICE_UNAVAILABLE');
  });

  await test('invalid diagnostics are refused with INVALID_DIAGNOSTICS', async () => {
    const result = await service().svc.quote({ ...identity, diagnostics: { calls: 'yes' } });
    assert.equal(result.ok || result.code, 'INVALID_DIAGNOSTICS');
  });

  await test('a secret shorter than 32 characters is refused at startup', () => {
    assert.throws(() => service({ signingSecret: 'short' }));
  });

  console.log('\n=== Lead price verification ===\n');

  await test('an inflated client price is never stored - the server recomputes and flags the mismatch', async () => {
    const { svc } = service();
    const result = await svc.verifyLeadPrice({ ...identity, diagnostics: DAMAGED, clientQuotedPrice: 9_999_999 });
    assert.ok(result.ok);
    assert.equal(result.price, (await svc.quote({ ...identity, diagnostics: DAMAGED }) as any).fhoneifyPrice);
    assert.equal(result.audit.priceSource, 'recomputed');
    assert.equal(result.audit.clientPriceMismatch, true);
  });

  await test('a valid token locks the quoted price even if the reference price moves before the lead', async () => {
    const repository = new InMemoryRepository();
    await repository.upsert(record(identity, { currentPrice: 60000 }));
    const { svc } = service({ repository });
    const quoted = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(quoted.ok);

    await repository.upsert(record(identity, { currentPrice: 30000 }));
    const lead = await svc.verifyLeadPrice({ ...identity, diagnostics: diag(), quoteToken: quoted.quoteToken, clientQuotedPrice: quoted.fhoneifyPrice });
    assert.ok(lead.ok);
    assert.equal(lead.price, quoted.fhoneifyPrice);
    assert.equal(lead.audit.priceSource, 'quote_token');
    assert.ok(lead.audit.currentPrice! < quoted.fhoneifyPrice, 'audit should record the drifted current price');
  });

  await test('a good-condition token cannot be reused for a damaged-condition lead', async () => {
    const { svc } = service();
    const quoted = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(quoted.ok);
    const lead = await svc.verifyLeadPrice({ ...identity, diagnostics: DAMAGED, quoteToken: quoted.quoteToken });
    assert.ok(lead.ok);
    assert.equal(lead.audit.tokenRejectedReason, 'diagnostics_mismatch');
    assert.ok(lead.price < quoted.fhoneifyPrice);
  });

  await test('a token for one device cannot price another device', async () => {
    const { svc } = service();
    const other = { brand: basePriceOnlyDevice.brand, model: basePriceOnlyDevice.model, storage: basePriceOnlyDevice.storage };
    const quoted = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(quoted.ok);
    const lead = await svc.verifyLeadPrice({ ...other, diagnostics: diag(), quoteToken: quoted.quoteToken });
    assert.ok(lead.ok);
    assert.equal(lead.audit.tokenRejectedReason, 'device_mismatch');
  });

  await test('an expired token falls back to the current price', async () => {
    let clock = new Date('2026-09-16T00:00:00Z');
    const { svc } = service({ now: () => clock, tokenTtlSeconds: 60 });
    const quoted = await svc.quote({ ...identity, diagnostics: diag() });
    assert.ok(quoted.ok);
    clock = new Date('2026-09-16T00:05:00Z');
    const lead = await svc.verifyLeadPrice({ ...identity, diagnostics: diag(), quoteToken: quoted.quoteToken });
    assert.ok(lead.ok);
    assert.equal(lead.audit.tokenRejectedReason, 'expired');
    assert.equal(lead.audit.priceSource, 'recomputed');
  });

  await test('an unknown device without a valid token cannot become a lead', async () => {
    const result = await service().svc.verifyLeadPrice({ brand: 'Nope', model: 'Nope', storage: 'Nope', diagnostics: diag(), clientQuotedPrice: 50000 });
    assert.equal(result.ok || result.code, 'DEVICE_NOT_FOUND');
  });

  console.log('\n=== Ingestion timestamps ===\n');

  const ingestDevice = { brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/512 GB' };
  const source = (observation: Awaited<ReturnType<PriceSource['fetch']>>): PriceSource => ({ name: 'test-source', fetch: async () => observation });

  await test('same instant in a different timezone format does not strip an existing source URL', async () => {
    const repo = new InMemoryRepository();
    await repo.upsert(record(ingestDevice, { currentPrice: 45000, lastVerifiedAt: '2026-07-08T20:39:20.000Z', sourceUrl: 'https://www.cashify.in/x9s' }));
    await refreshDevice(repo, ingestDevice, source({ price: 45000, matchConfidence: 'exact', observedAt: '2026-07-09T02:09:20+05:30' }));
    assert.equal((await repo.get(deviceKey(ingestDevice)))!.sourceUrl, 'https://www.cashify.in/x9s');
  });

  await test('an older observation is not promoted even when its string sorts later', async () => {
    const repo = new InMemoryRepository();
    await repo.upsert(record(ingestDevice, { currentPrice: 45000, lastVerifiedAt: '2026-07-08T21:00:00.000Z' }));
    // 02:00+05:30 is 20:30Z - thirty minutes OLDER, but "2026-07-09..." > "2026-07-08...".
    await refreshDevice(repo, ingestDevice, source({ price: 30000, matchConfidence: 'exact', observedAt: '2026-07-09T02:00:00+05:30' }));
    assert.equal((await repo.get(deviceKey(ingestDevice)))!.currentPrice, 45000);
  });

  await test('a genuinely newer observation still replaces the current value', async () => {
    const repo = new InMemoryRepository();
    await repo.upsert(record(ingestDevice, { currentPrice: 45000, lastVerifiedAt: '2026-07-08T20:39:20.000Z', sourceUrl: 'https://www.cashify.in/x9s' }));
    await refreshDevice(repo, ingestDevice, source({ price: 41000, matchConfidence: 'exact', observedAt: '2026-08-01T00:00:00+05:30' }));
    assert.equal((await repo.get(deviceKey(ingestDevice)))!.currentPrice, 41000);
  });

  await test('an unparseable observedAt is recorded as a failure, never promoted', async () => {
    const repo = new InMemoryRepository();
    await repo.upsert(record(ingestDevice, { currentPrice: 45000 }));
    const outcome = await refreshDevice(repo, ingestDevice, source({ price: 1, matchConfidence: 'exact', observedAt: 'yesterday' }));
    assert.equal(outcome.accepted, false);
    assert.equal((await repo.get(deviceKey(ingestDevice)))!.currentPrice, 45000);
  });

  console.log('\n=== Startup warm-up ===\n');

  await test('file-backed store reports healthy without any connection attempt', async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    _resetReferencePriceRepositoryCacheForTests();
    try {
      const health = await warmReferencePriceRepository();
      assert.equal(health.backend, 'file');
      assert.equal(health.connected, true);
      assert.deepEqual(getReferenceStoreHealth(), health);
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
      _resetReferencePriceRepositoryCacheForTests();
    }
  });

  await test('an unreachable database fails warm-up honestly instead of throwing or claiming health', async () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/nodb?connect_timeout=1';
    _resetReferencePriceRepositoryCacheForTests();
    try {
      const health = await warmReferencePriceRepository(4000);
      assert.equal(health.backend, 'postgres');
      assert.equal(health.connected, false, 'must not report a connection it never made');
      assert.ok(health.error, 'must record why');
      // Shutdown path must stay safe after a failed warm-up.
      await disconnectReferencePriceRepository();
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
      _resetReferencePriceRepositoryCacheForTests();
    }
  });

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run();
