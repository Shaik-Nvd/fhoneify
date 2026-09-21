/**
 * Oppo / Vivo (and iQOO, which routes to the Vivo engine) age handling,
 * checked across every catalog device of those brands.
 *
 * Regression guard for the bug where "above 11 months" matched no branch, so
 * the oldest phone kept a brand-new multiplier (Oppo 0.98, Vivo 1.0).
 * Offline: reads the checked-in catalog and reference store only.
 * Run: npm run test:pricing:oppo-vivo-age
 */
import assert from 'node:assert/strict';
import referenceStore from '../../server/data/reference-prices/store.json';
import snapshot from '../../lib/cashify_prices.json';
import { SEED_DEVICES } from '../../lib/seed_devices';
import { OUT_OF_WARRANTY_AGE_MULTIPLIERS } from '../../lib/pricingCalculator';
import { priceDevice, resolveBaseMarketPrice } from '../../lib/pricing/engine';
import { classifyPricingFamily } from '../../lib/pricing/families';
import { deviceKey, type ReferencePriceRecord } from '../../lib/referencePricing/types';
import { validationAnswer } from '../pricing/validation-profiles';

const records = (referenceStore as { records: Record<string, ReferencePriceRecord> }).records;
const AGES = ['below3', '3to6', '6to11', 'above11'] as const;

const devices = SEED_DEVICES.filter((d) => {
  const engine = classifyPricingFamily(d.brand, d.model).engine;
  return (engine === 'Oppo' || engine === 'Vivo/iQOO')
    && d.brand && d.model && d.storage && Number.isFinite(d.basePrice) && d.basePrice > 0;
});

// Sub-Rs 5,000 phones sit on the Rs 1,200 / floor rules; ratios there say
// nothing about age depreciation.
const meaningful = devices
  .map((d) => ({ d, base: resolveBaseMarketPrice({ device: d, repositoryRecord: records[deviceKey(d)] ?? null, snapshot: snapshot as Record<string, number> }) }))
  .filter((x): x is { d: typeof devices[number]; base: NonNullable<typeof x.base> } => !!x.base && x.base.price >= 5000);

const quote = (d: typeof devices[number], price: number, over: Parameters<typeof validationAnswer>[0]) =>
  priceDevice(d.brand, d.model, price, validationAnswer(over)).cashifyBasePrice;

const violations: string[] = [];
const note = (msg: string) => { if (violations.length < 25) violations.push(msg); };

let checks = 0;
for (const { d, base } of meaningful) {
  const name = `${d.model} ${d.storage}`;
  for (const warranty of [true, false]) {
    const q = AGES.map((age) => quote(d, base.price, { warranty, mobileAge: age }));
    for (let i = 1; i < q.length; i++) {
      checks++;
      if (q[i] > q[i - 1]) note(`${name} warranty=${warranty}: ${AGES[i]} (${q[i]}) > ${AGES[i - 1]} (${q[i - 1]})`);
    }
  }
  for (const age of AGES) {
    checks++;
    const w = quote(d, base.price, { warranty: true, mobileAge: age });
    const n = quote(d, base.price, { warranty: false, mobileAge: age });
    if (n > w) note(`${name} age=${age}: losing warranty raised the quote ${w} -> ${n}`);
  }
  // Older than 11 months must depreciate materially, not sit on a near-new
  // multiplier. The strictest legitimate ratio is 0.7966 (Oppo) / 0.75 (Vivo).
  checks++;
  const young = quote(d, base.price, { warranty: true, mobileAge: 'below3' });
  const old = quote(d, base.price, { warranty: true, mobileAge: 'above11' });
  if (old > young * 0.85) note(`${name}: above11 (${old}) is not materially below below3 (${young})`);
  // No stacking: a warranty answer must not change an already-old phone, and
  // a missing bill must not push an old phone lower than a billed one.
  checks++;
  const oldBilled = quote(d, base.price, { warranty: true, mobileAge: 'above11', validBill: true });
  const oldNoBill = quote(d, base.price, { warranty: true, mobileAge: 'above11', validBill: false });
  if (oldNoBill !== oldBilled) note(`${name}: bill penalty stacked on an above-11-month phone (${oldBilled} vs ${oldNoBill})`);
}

// The constants themselves: the values the pre-f1034f4 engine used.
assert.equal(OUT_OF_WARRANTY_AGE_MULTIPLIERS.oppo, 0.7966, 'Oppo old-phone multiplier drifted from the historical value');
assert.equal(OUT_OF_WARRANTY_AGE_MULTIPLIERS.vivoStandard, 0.75);

// Oppo above11 must be exactly the documented multiplier for a plain phone:
// reference x 0.7966 + box, before uplift. Guards "silently stuck on 0.98".
let exact = 0;
for (const { d, base } of meaningful) {
  if (classifyPricingFamily(d.brand, d.model).engine !== 'Oppo') continue;
  const got = quote(d, base.price, { warranty: false, validBill: false, mobileAge: 'above11', accessories: ['box'] });
  const want = Math.round(base.price * OUT_OF_WARRANTY_AGE_MULTIPLIERS.oppo + 380);
  exact++;
  if (Math.abs(got - want) > 1) note(`${d.model} ${d.storage}: Oppo above11 quote ${got}, expected ${want}`);
}

const oppo = meaningful.filter((x) => classifyPricingFamily(x.d.brand, x.d.model).engine === 'Oppo').length;
console.log(JSON.stringify({
  oppoVivoIqooDevices: devices.length,
  devicesAtOrAbove5000: meaningful.length,
  oppoChecked: oppo,
  vivoIqooChecked: meaningful.length - oppo,
  checks,
  oppoExactMultiplierChecks: exact,
  violations: violations.length,
  examples: violations.slice(0, 10),
}, null, 2));

assert.equal(violations.length, 0, `${violations.length} Oppo/Vivo age violation(s)`);
console.log(`PASS: ${meaningful.length} Oppo/Vivo/iQOO devices, ${checks + exact} age checks`);
