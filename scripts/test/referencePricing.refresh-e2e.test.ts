/**
 * End-to-end proof of the whole chain, with nothing mocked except the browser:
 *
 *   Cashify page
 *     -> existing scraper's snapshot contract
 *     -> exact device/variant matching
 *     -> price validation
 *     -> reference-price repository (real ingestion + real refresh job)
 *     -> quote service (the REAL generateQuote, what POST /api/quote calls)
 *     -> calculateFhoneifyPrice / applyCompetitorUplift (untouched)
 *     -> final Fhoneify customer quote
 *
 * Both original problem devices are covered explicitly: OPPO Find X9s 12/512
 * and OnePlus 15R 12/512.
 *
 * ISOLATION: the repository is pinned to a temp file store BEFORE the quote
 * service is imported. Unsetting DATABASE_URL alone is not enough - importing
 * server/lib/prisma constructs a PrismaClient, and Prisma walks parent
 * directories looking for a .env, which silently re-injects the production
 * DATABASE_URL. Pinning the repository makes "this test cannot touch
 * production" structural.
 *
 * Run: npm run test:pricing:refresh-e2e
 */
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { FileReferencePriceStore } from '../../lib/referencePricing/store';
import { _setReferencePriceRepositoryForTests, getReferencePriceRepository } from '../../lib/referencePricing/getStore';
import { deviceKey, DeviceIdentity } from '../../lib/referencePricing/types';
import { createCashifyPriceSource } from '../../lib/referencePricing/sources/cashifySource';
import { CashifyPageSnapshot } from '../../lib/referencePricing/sources/cashifyIdentity';
import { runRefreshJob } from '../../lib/referencePricing/refreshJob';
import { loadRefreshCatalog, buildCashifyLinkIndex } from '../../lib/referencePricing/catalog';
import { calculateFhoneifyPrice } from '../../lib/pricingCalculator';
import { SEED_DEVICES } from '../../lib/seed_devices';

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'fhoneify-e2e-'));
const STORE_PATH = path.join(TMP_ROOT, 'store.json');
const store = new FileReferencePriceStore(STORE_PATH);

// MUST happen before importing the quote service.
_setReferencePriceRepositoryForTests(store);

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

function seedDevice(model: string, storage: string) {
  const d = (SEED_DEVICES as any[]).find((x) => x.model === model && x.storage === storage);
  if (!d) throw new Error(`fixture device missing from the catalog: ${model} (${storage})`);
  return d;
}

/** What Cashify's page shows today for each device, as the existing scraper
 * would report it. These are the ONLY fabricated values in this test - they
 * stand in for the browser, not for any pricing behaviour. */
const CASHIFY_PAGES: Record<string, CashifyPageSnapshot> = {};

/** A flawless-device diagnostics answer set, matching the shape the existing
 * pricing regression suite uses. Used only to feed the UNCHANGED engine. */
const PERFECT_DIAGNOSTICS = {
  calls: true, touch: true, originalScreen: true,
  defects: [], screenCondition: null, screenSpots: null, screenLines: null, screenDiscoloration: null,
  bodyScratches: null, bodyDents: null, bodyPanel: null, bodyBent: null,
  hardware: [], accessories: ['box', 'bill'],
  warranty: true, validBill: true, eSim: null, mobileAge: 'below3',
};

function publishPage(device: DeviceIdentity, priceText: string, over: Partial<CashifyPageSnapshot> = {}) {
  CASHIFY_PAGES[deviceKey(device)] = {
    url: `https://www.cashify.in/sell-old-mobile-phone/used-${device.model.toLowerCase().replace(/\s+/g, '-')}`,
    deviceName: device.model,
    selectedVariant: device.storage,
    priceText,
    ...over,
  };
}

async function run() {
  const oppoSeed = seedDevice('OPPO Find X9s', '12 GB/512 GB');
  const oneplusSeed = seedDevice('Oneplus 15R', '12 GB/512 GB');
  const oppo: DeviceIdentity = { brand: oppoSeed.brand, model: oppoSeed.model, storage: oppoSeed.storage };
  const oneplus: DeviceIdentity = { brand: oneplusSeed.brand, model: oneplusSeed.model, storage: oneplusSeed.storage };

  // Decoys that must NEVER satisfy a request for the devices above.
  const oppo256 = seedDevice('OPPO Find X9s', '12 GB/256 GB');
  const oneplus256 = seedDevice('Oneplus 15R', '12 GB/256 GB');

  // The quote service must be imported AFTER the repository is pinned.
  const { generateQuote } = await import('../../server/modules/quote/service');

  const catalog = loadRefreshCatalog();
  const linkIndex = buildCashifyLinkIndex(catalog.entries);

  const source = createCashifyPriceSource({
    fetchSnapshot: async (device) => CASHIFY_PAGES[deviceKey(device)] ?? null,
    resolveUrl: (device) => linkIndex.get(deviceKey(device)),
  });

  console.log('\n=== Isolation: this test cannot reach production ===\n');

  await test('the repository under test is the temp file store, not Postgres', () => {
    const repo = getReferencePriceRepository();
    assert.equal(repo.constructor.name, 'FileReferencePriceStore');
    assert.equal((repo as any).filePath, STORE_PATH);
  });

  console.log('\n=== Catalog coverage (Phase 14) ===\n');

  await test('the refresh catalog covers the whole ~2,200-device seed catalog, not a subset', () => {
    assert.ok(
      catalog.entries.length > 2000,
      `expected the full catalog, got ${catalog.entries.length} devices - a silent subset is exactly the failure mode Phase 14 warns about`
    );
    console.log(
      `        (catalog: ${catalog.entries.length} refreshable, ${catalog.skipped.length} skipped, ` +
        `${catalog.duplicates} duplicate keys collapsed, ${linkIndex.size} with a curated Cashify URL)`
    );
  });

  await test('both original problem devices are present in the refresh catalog', () => {
    const keys = new Set(catalog.entries.map((e) => deviceKey(e.device)));
    assert.ok(keys.has(deviceKey(oppo)), 'OPPO Find X9s 12/512 must be in the refresh catalog');
    assert.ok(keys.has(deviceKey(oneplus)), 'OnePlus 15R 12/512 must be in the refresh catalog');
  });

  await test('each problem device resolves to its own curated, variant-specific Cashify URL', () => {
    assert.match(linkIndex.get(deviceKey(oppo))!, /used-oppo-find-x9s-12-gb-512-gb$/);
    assert.notEqual(linkIndex.get(deviceKey(oppo)), linkIndex.get(deviceKey({ brand: oppo256.brand, model: oppo256.model, storage: oppo256.storage })));
  });

  console.log('\n=== OPPO Find X9s 12GB/512GB: full chain ===\n');

  // Cashify today. The 512 and 256 variants have genuinely different prices,
  // and the 256 page is published too - so a variant mix-up would be visible.
  publishPage(oppo, '₹15,140');
  publishPage({ brand: oppo256.brand, model: oppo256.model, storage: oppo256.storage }, '₹13,200');

  await test('scraper -> matching -> validation -> repository: the DB value actually changes', async () => {
    const before = await store.get(deviceKey(oppo));
    assert.equal(before, null, 'starting from a clean store');

    const result = await runRefreshJob({
      repo: store,
      devices: [oppo, { brand: oppo256.brand, model: oppo256.model, storage: oppo256.storage }],
      source,
      trigger: 'e2e',
      log: () => {},
    });
    assert.equal(result.report!.status, 'SUCCESS');

    const after = await store.get(deviceKey(oppo));
    assert.ok(after, 'a reference record must now exist');
    assert.equal(after!.currentPrice, 15140, 'the stored value must be what Cashify showed for THIS variant');
    assert.equal(after!.source, 'cashify');
    assert.equal(after!.matchConfidence, 'exact');
    assert.equal(after!.status, 'fresh');
    assert.ok(after!.sourceUrl, 'the stored price must be auditable back to a page');

    // And the 256 variant got ITS price, not this one.
    const other = await store.get(deviceKey({ brand: oppo256.brand, model: oppo256.model, storage: oppo256.storage }));
    assert.equal(other!.currentPrice, 13200, 'the 12/256 variant must hold its own price');
  });

  await test('repository -> quote service: the customer quote is derived from the refreshed price', async () => {
    const quote: any = await generateQuote(oppoSeed.id, 'like_new');
    assert.ok(quote, 'expected a quote');
    assert.equal(quote.referenceStatus, 'fresh', 'the quote must report the freshly-refreshed status');
    assert.equal(quote.referenceSource, 'cashify');

    // The quote must be built from 15,140 - not from the seed basePrice
    // (45,000) that the old stale data would have produced.
    const fromRefreshed = calculateFhoneifyPrice(oppo.brand, oppo.model, 15140, PERFECT_DIAGNOSTICS as any);
    const fromStaleBase = calculateFhoneifyPrice(oppo.brand, oppo.model, oppoSeed.basePrice, PERFECT_DIAGNOSTICS as any);
    assert.notEqual(
      fromRefreshed.fhoneifyPrice,
      fromStaleBase.fhoneifyPrice,
      'this fixture is only meaningful if the two inputs give different answers'
    );
    assert.ok(
      quote.estimatedPrice < oppoSeed.basePrice,
      `the quote (${quote.estimatedPrice}) must follow the refreshed reference price down, not stay anchored to the stale basePrice (${oppoSeed.basePrice})`
    );
    console.log(`        (reference ₹15,140 -> Fhoneify quote ₹${quote.estimatedPrice})`);
  });

  await test('quote service -> pricing engine: the EXISTING formula is applied, unchanged', async () => {
    const answers = PERFECT_DIAGNOSTICS;
    const quote: any = await generateQuote(oppoSeed.id, 'like_new', undefined, answers);
    // Independently compute what the untouched engine produces from the
    // refreshed reference price. The quote must equal it exactly - proving
    // the refresh changed the INPUT and nothing else.
    const expected = calculateFhoneifyPrice(oppo.brand, oppo.model, 15140, answers as any);
    assert.equal(
      quote.estimatedPrice,
      expected.fhoneifyPrice,
      'the quote must be exactly calculateFhoneifyPrice(brand, model, refreshedReferencePrice, answers)'
    );
  });

  console.log('\n=== OnePlus 15R 12GB/512GB: full chain, and the near-miss trap ===\n');

  publishPage(oneplus, '₹18,400');
  publishPage({ brand: oneplus256.brand, model: oneplus256.model, storage: oneplus256.storage }, '₹16,900');

  await test('OnePlus 15R 12/512 refreshes end to end and the quote follows it', async () => {
    const result = await runRefreshJob({
      repo: store,
      devices: [oneplus],
      source,
      trigger: 'e2e',
      log: () => {},
    });
    assert.equal(result.report!.updated, 1);

    const record = await store.get(deviceKey(oneplus));
    assert.equal(record!.currentPrice, 18400);
    assert.equal(record!.status, 'fresh', 'the device the whole investigation started from is now FRESH, not stale');

    const quote: any = await generateQuote(oneplusSeed.id, 'like_new');
    assert.equal(quote.referenceStatus, 'fresh');
    assert.ok(
      quote.estimatedPrice < oneplusSeed.basePrice,
      'the quote must follow the refreshed reference price'
    );
    console.log(`        (reference ₹18,400 -> Fhoneify quote ₹${quote.estimatedPrice})`);
  });

  await test('a "OnePlus 15" page can never become the OnePlus 15R reference price', async () => {
    const before = await store.get(deviceKey(oneplus));
    // Cashify serves the sibling model's page for the 15R request.
    publishPage(oneplus, '₹52,000', { deviceName: 'OnePlus 15' });

    const result = await runRefreshJob({
      repo: store,
      devices: [oneplus],
      source,
      trigger: 'e2e',
      options: { maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });

    assert.equal(result.report!.rejected, 1);
    const after = await store.get(deviceKey(oneplus));
    assert.equal(after!.currentPrice, before!.currentPrice, 'the 15R price must be untouched');
    assert.notEqual(after!.currentPrice, 52000);
    assert.match(after!.lastFailureError!, /device-name mismatch/);

    // And the customer quote keeps using the last good value.
    const quote: any = await generateQuote(oneplusSeed.id, 'like_new');
    assert.ok(quote.estimatedPrice > 0, 'a rejected refresh must not break quoting');

    publishPage(oneplus, '₹18,400'); // restore for later assertions
  });

  await test('a 12/256 page can never become the 12/512 reference price', async () => {
    const before = await store.get(deviceKey(oppo));
    publishPage(oppo, '₹13,200', { selectedVariant: '12 GB/256 GB' });

    await runRefreshJob({
      repo: store,
      devices: [oppo],
      source,
      trigger: 'e2e',
      options: { maxRetries: 0, retryDelayMs: 1 },
      log: () => {},
    });

    const after = await store.get(deviceKey(oppo));
    assert.equal(after!.currentPrice, before!.currentPrice);
    assert.notEqual(after!.currentPrice, 13200);
    publishPage(oppo, '₹15,140');
  });

  console.log('\n=== Failure safety through the whole chain (Phase 6) ===\n');

  await test('when Cashify is entirely unavailable, quotes keep working from preserved prices', async () => {
    const oppoBefore = await store.get(deviceKey(oppo));
    const onePlusBefore = await store.get(deviceKey(oneplus));

    const deadSource = createCashifyPriceSource({
      fetchSnapshot: async () => {
        throw new Error('net::ERR_NAME_NOT_RESOLVED www.cashify.in');
      },
    });

    const result = await runRefreshJob({
      repo: store,
      devices: [oppo, oneplus],
      source: deadSource,
      trigger: 'e2e',
      options: { maxRetries: 1, retryDelayMs: 1 },
      log: () => {},
    });

    assert.equal(result.report!.status, 'FAILED');
    assert.equal((await store.get(deviceKey(oppo)))!.currentPrice, oppoBefore!.currentPrice);
    assert.equal((await store.get(deviceKey(oneplus)))!.currentPrice, onePlusBefore!.currentPrice);

    const quote: any = await generateQuote(oppoSeed.id, 'like_new');
    assert.ok(quote.estimatedPrice > 0, 'the customer must still get a quote after a total scraper failure');
    assert.equal(quote.referenceStatus, 'refresh_failed', 'and the degraded state must be visible, not hidden');
  });

  console.log('\n=== The quote path never scrapes (Phase 11) ===\n');

  await test('generateQuote does not invoke the Cashify source at all', async () => {
    let scraped = false;
    const spySource = createCashifyPriceSource({
      fetchSnapshot: async (device) => {
        scraped = true;
        return CASHIFY_PAGES[deviceKey(device)] ?? null;
      },
    });
    // Refresh once so there is fresh data, then reset the spy.
    await runRefreshJob({ repo: store, devices: [oppo], source: spySource, trigger: 'e2e', log: () => {} });
    scraped = false;

    const started = Date.now();
    const quote: any = await generateQuote(oppoSeed.id, 'like_new');
    const elapsed = Date.now() - started;

    assert.equal(scraped, false, 'a customer quote must never trigger a scrape');
    assert.ok(quote.estimatedPrice > 0);
    assert.ok(elapsed < 1000, `the quote read must be fast (took ${elapsed}ms)`);
  });

  console.log(`\n${passed} passed, ${failed} failed.\n`);
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  if (failed > 0) process.exit(1);
}

run();
