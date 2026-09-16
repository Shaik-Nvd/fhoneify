/**
 * Exact device/variant matching and price parsing for the Cashify refresh.
 *
 * These are the rules that stop a scraped price from ever landing on the wrong
 * device. They are tested directly, with no browser and no network, because
 * they are the part that must never be "mostly right": a wrong reference price
 * is worse than a missing one, and it is silent.
 *
 * Run: npm run test:pricing:cashify-matching
 */
import assert from 'node:assert/strict';
import {
  parseVariant,
  matchVariant,
  canonicalDeviceName,
  stripTitleNoise,
  verifyPageIdentity,
  parsePriceText,
  buildCashifyUrl,
  CashifyPageSnapshot,
} from '../../lib/referencePricing/sources/cashifyIdentity';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

function snapshot(over: Partial<CashifyPageSnapshot> = {}): CashifyPageSnapshot {
  return {
    url: 'https://www.cashify.in/sell-old-mobile-phone/used-oppo-find-x9s-12-gb-512-gb',
    deviceName: 'OPPO Find X9s',
    selectedVariant: '12 GB/512 GB',
    priceText: '₹15,140',
    ...over,
  };
}

const OPPO = { brand: 'Oppo', model: 'OPPO Find X9s', storage: '12 GB/512 GB' };
const ONEPLUS = { brand: 'OnePlus', model: 'Oneplus 15R', storage: '12 GB/512 GB' };

console.log('\n=== Variant parsing ===\n');

test('parses RAM/storage pairs in Cashify order', () => {
  assert.deepEqual(parseVariant('12 GB/512 GB'), { ram: '12gb', storage: '512gb', raw: '12 GB/512 GB' });
  assert.deepEqual(parseVariant('8GB/128GB'), { ram: '8gb', storage: '128gb', raw: '8GB/128GB' });
  assert.deepEqual(parseVariant('8 GB / 1 TB'), { ram: '8gb', storage: '1tb', raw: '8 GB / 1 TB' });
});

test('parses a storage-only variant with no RAM', () => {
  assert.deepEqual(parseVariant('128GB'), { ram: null, storage: '128gb', raw: '128GB' });
  assert.deepEqual(parseVariant('256 GB'), { ram: null, storage: '256gb', raw: '256 GB' });
});

test('refuses to guess at a label with more than two capacity tokens', () => {
  const parsed = parseVariant('8 GB/256 GB/512 GB');
  assert.equal(parsed.storage, null, 'an unparseable label must yield null, not a best guess');
});

console.log('\n=== Variant matching (Phase 4) ===\n');

test('identical variants match regardless of spacing and case', () => {
  assert.equal(matchVariant('12 GB/512 GB', '12GB/512gb').matched, true);
});

test('WRONG STORAGE is rejected: 12/256 must never match 12/512', () => {
  const result = matchVariant('12 GB/512 GB', '12 GB/256 GB');
  assert.equal(result.matched, false);
  assert.match(result.reason, /storage mismatch/);
});

test('WRONG RAM is rejected: 8/512 must never match 12/512', () => {
  const result = matchVariant('12 GB/512 GB', '8 GB/512 GB');
  assert.equal(result.matched, false);
  assert.match(result.reason, /RAM mismatch/);
});

test('AMBIGUOUS variant is rejected: "512 GB" must never match "12 GB/512 GB"', () => {
  const result = matchVariant('12 GB/512 GB', '512 GB');
  assert.equal(result.matched, false);
  assert.match(result.reason, /ambiguous/);
});

test('an empty observed variant is rejected rather than treated as a wildcard', () => {
  assert.equal(matchVariant('12 GB/512 GB', '').matched, false);
});

console.log('\n=== Device-name canonicalization ===\n');

test('does not double-prefix a model that already carries its brand', () => {
  assert.equal(canonicalDeviceName('Oppo', 'OPPO Find X9s'), 'oppofindx9s');
  assert.equal(canonicalDeviceName('OnePlus', 'Oneplus 15R'), 'oneplus15r');
  assert.equal(canonicalDeviceName('Apple', 'Apple iPhone 14'), 'appleiphone14');
});

test('prefixes a model that does not carry its brand', () => {
  assert.equal(canonicalDeviceName('Samsung', 'Galaxy S24 Ultra'), 'samsunggalaxys24ultra');
});

test('strips Cashify page-title boilerplate', () => {
  assert.equal(stripTitleNoise('Sell Old OPPO Find X9s'), 'OPPO Find X9s');
  assert.equal(stripTitleNoise('OnePlus 15R | Cashify'), 'OnePlus 15R');
});

console.log('\n=== Full page-identity verification (Phase 4) ===\n');

test('accepts a page that is genuinely the requested device and variant', () => {
  const verdict = verifyPageIdentity(OPPO, snapshot());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.confidence, 'exact');
});

test('WRONG MODEL is rejected: OnePlus 15 page must never satisfy a OnePlus 15R request', () => {
  const verdict = verifyPageIdentity(ONEPLUS, snapshot({ deviceName: 'OnePlus 15' }));
  assert.equal(verdict.ok, false);
  assert.equal(verdict.confidence, 'unmatched');
  assert.match(verdict.evidence, /device-name mismatch/);
});

test('WRONG MODEL the other way is rejected too: OnePlus 15R page must not satisfy a OnePlus 15 request', () => {
  const verdict = verifyPageIdentity(
    { brand: 'OnePlus', model: 'Oneplus 15', storage: '12 GB/512 GB' },
    snapshot({ deviceName: 'OnePlus 15R' })
  );
  assert.equal(verdict.ok, false);
});

test('a near-miss family member is rejected: Find X9 must not satisfy Find X9s', () => {
  assert.equal(verifyPageIdentity(OPPO, snapshot({ deviceName: 'OPPO Find X9' })).ok, false);
});

test('WRONG STORAGE is rejected at page level and says so', () => {
  const verdict = verifyPageIdentity(OPPO, snapshot({ selectedVariant: '12 GB/256 GB' }));
  assert.equal(verdict.ok, false);
  assert.match(verdict.evidence, /storage mismatch/);
});

test('WRONG RAM is rejected at page level and says so', () => {
  const verdict = verifyPageIdentity(OPPO, snapshot({ selectedVariant: '8 GB/512 GB' }));
  assert.equal(verdict.ok, false);
  assert.match(verdict.evidence, /RAM mismatch/);
});

test('a page with no device name is rejected rather than trusted', () => {
  assert.equal(verifyPageIdentity(OPPO, snapshot({ deviceName: '' })).ok, false);
});

test('an unavailable variant lists what the page DID offer, so the miss is diagnosable', () => {
  const verdict = verifyPageIdentity(
    OPPO,
    snapshot({ selectedVariant: '', availableVariants: ['12 GB/256 GB', '16 GB/512 GB'] })
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.evidence, /12 GB\/256 GB/);
});

console.log('\n=== Price parsing (Phase 5) ===\n');

test('parses a normal rupee price', () => {
  assert.deepEqual(parsePriceText('₹15,140'), { ok: true, price: 15140 });
  assert.deepEqual(parsePriceText('₹ 42,000'), { ok: true, price: 42000 });
});

test('rejects an empty or digit-free price', () => {
  assert.equal(parsePriceText('').ok, false);
  assert.equal(parsePriceText('₹').ok, false);
  assert.equal(parsePriceText('Price unavailable').ok, false);
});

test('rejects zero and negative values', () => {
  assert.equal(parsePriceText('₹0').ok, false);
  assert.equal(parsePriceText('₹0.00').ok, false);
  assert.equal(parsePriceText('₹-500').ok, false);
});

test('"Rs. 15,140" parses as 15140, not as 0.15140 rounded to zero', () => {
  // Regression guard for a real bug in the first cut of this parser: a global
  // non-digit strip kept the "." from "Rs." and produced a silent zero.
  assert.equal(parsePriceText('Rs. 15,140').price, 15140);
});

test('rejects a WRONG CURRENCY rather than silently storing a dollar figure as rupees', () => {
  const result = parsePriceText('$180');
  assert.equal(result.ok, false);
  assert.match(result.reason!, /non-INR|no INR/);
});

test('rejects a number with no currency marker at all - the currency is not assumed', () => {
  const result = parsePriceText('15140');
  assert.equal(result.ok, false);
  assert.match(result.reason!, /no INR currency marker/);
});

test('accepts the "Rs." and "INR" spellings Cashify also uses', () => {
  assert.equal(parsePriceText('Rs. 15,140').price, 15140);
  assert.equal(parsePriceText('INR 15140').price, 15140);
});

console.log('\n=== URL construction ===\n');

test('builds a variant-specific Cashify slug matching the catalog link format', () => {
  assert.equal(
    buildCashifyUrl(OPPO),
    'https://www.cashify.in/sell-old-mobile-phone/used-oppo-find-x9s-12-gb-512-gb'
  );
});

console.log(`\n${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
