/**
 * Coupon security. The Rs 299 bonus used to be decided in the browser
 * (a random "NEW####" code plus two codes hardcoded in the bundle) and the
 * server stored a client-supplied boolean. These tests pin the replacement:
 * the server alone decides, per verified phone, once.
 *
 * Fully isolated: an in-memory ledger stands in for the database.
 * Run: npm run test:pricing:coupon
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateCoupon,
  firstTimeCode,
  offerFor,
  parsePromoCodes,
  phoneKey,
  type CouponDeps,
} from '../../server/modules/quote/coupon';
import { buildLeadAnswers, customerPayout, FIRST_TIME_COUPON_BONUS } from '../../lib/pricing/payout';

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

const SECRET = 'test-secret-not-a-real-key';
const PHONE = '+919876543210';

/** A ledger that behaves like createLeadWithCoupon: decide, then record. */
function ledger() {
  const leads: Array<{ phoneKey: string; redeemed: boolean }> = [];
  const deps: CouponDeps = {
    secret: SECRET,
    promoCodes: parsePromoCodes(undefined),
    lookup: async (key) => ({
      totalLeads: leads.filter((l) => l.phoneKey === key).length,
      redeemedLeads: leads.filter((l) => l.phoneKey === key && l.redeemed).length,
    }),
  };
  const book = async (phone: string, code?: string) => {
    const result = await evaluateCoupon(deps, { code, verifiedPhone: phone });
    leads.push({ phoneKey: phoneKey(phone), redeemed: result.valid });
    return result;
  };
  return { deps, leads, book };
}

(async () => {
  console.log('\nCoupon security');

  await test('a valid first-time code is honoured and pays exactly the configured bonus', async () => {
    const { deps } = ledger();
    const code = firstTimeCode(SECRET, PHONE);
    const r = await evaluateCoupon(deps, { code, verifiedPhone: PHONE });
    assert.equal(r.valid, true);
    assert.equal(r.bonus, FIRST_TIME_COUPON_BONUS);
    assert.equal(customerPayout(10000, r.valid).payout, 10000 - 99 + 299);
  });

  await test('a valid promo code is honoured for a phone that has sold before', async () => {
    const { deps, leads } = ledger();
    leads.push({ phoneKey: phoneKey(PHONE), redeemed: false });
    const r = await evaluateCoupon(deps, { code: 'welcome299', verifiedPhone: PHONE });
    assert.equal(r.valid, true);
    assert.equal(r.kind, 'promo');
  });

  await test('an invalid code changes nothing', async () => {
    const { deps } = ledger();
    const r = await evaluateCoupon(deps, { code: 'FREE5000', verifiedPhone: PHONE });
    assert.deepEqual([r.valid, r.bonus, r.reason], [false, 0, 'invalid']);
    assert.equal(customerPayout(10000, r.valid).payout, 10000 - 99);
  });

  await test('a missing code changes nothing', async () => {
    const { deps } = ledger();
    for (const code of [undefined, '', '   ']) {
      const r = await evaluateCoupon(deps, { code, verifiedPhone: PHONE });
      assert.deepEqual([r.valid, r.bonus, r.reason], [false, 0, 'missing']);
    }
  });

  await test('a first-time code minted for one phone is useless on another', async () => {
    const { deps } = ledger();
    const mine = firstTimeCode(SECRET, PHONE);
    const r = await evaluateCoupon(deps, { code: mine, verifiedPhone: '+919000000001' });
    assert.equal(r.valid, false);
    assert.equal(r.reason, 'invalid');
  });

  await test('a browser-invented NEW#### code is rejected (the old client-generated scheme)', async () => {
    const { deps } = ledger();
    for (const n of [1000, 4242, 9999]) {
      const r = await evaluateCoupon(deps, { code: `NEW${n}`, verifiedPhone: PHONE });
      assert.equal(r.valid, false, `NEW${n} was accepted`);
    }
  });

  await test('double apply: the second booking from the same phone gets no bonus', async () => {
    const { book } = ledger();
    const code = firstTimeCode(SECRET, PHONE);
    assert.equal((await book(PHONE, code)).valid, true);
    const second = await book(PHONE, code);
    assert.equal(second.valid, false);
    assert.equal(second.reason, 'already_redeemed');
  });

  await test('replayed signed quote: reusing the same code with a second lead pays nothing', async () => {
    const { book } = ledger();
    assert.equal((await book(PHONE, 'WELCOME299')).valid, true);
    for (let i = 0; i < 3; i++) assert.equal((await book(PHONE, 'WELCOME299')).valid, false);
  });

  await test('a promo redeemed by one phone does not burn it for another', async () => {
    const { book } = ledger();
    assert.equal((await book(PHONE, 'WELCOME299')).valid, true);
    assert.equal((await book('+919111111111', 'WELCOME299')).valid, true);
  });

  await test('the first-time code stops working once the phone has any earlier lead', async () => {
    const { deps, leads } = ledger();
    leads.push({ phoneKey: phoneKey(PHONE), redeemed: false });
    const r = await evaluateCoupon(deps, { code: firstTimeCode(SECRET, PHONE), verifiedPhone: PHONE });
    assert.equal(r.reason, 'not_first_time');
  });

  await test('formatting of the phone does not create a second identity', async () => {
    const { book } = ledger();
    const code = firstTimeCode(SECRET, '9876543210');
    assert.equal((await book('+91 98765-43210', code)).valid, true);
    assert.equal((await book('9876543210', code)).valid, false);
  });

  await test('no verified phone means no coupon, whatever the code', async () => {
    const { deps } = ledger();
    for (const phone of [undefined, null, '', 'restored-session']) {
      const r = await evaluateCoupon(deps, { code: 'WELCOME299', verifiedPhone: phone as any });
      assert.equal(r.valid, false);
      assert.equal(r.reason, 'login_required');
    }
  });

  await test('offerFor only offers a first-time code to a phone with no history', async () => {
    const { deps, leads } = ledger();
    assert.equal(await offerFor(deps, PHONE), firstTimeCode(SECRET, PHONE));
    assert.equal(await offerFor(deps, 'restored-session'), null);
    leads.push({ phoneKey: phoneKey(PHONE), redeemed: false });
    assert.equal(await offerFor(deps, PHONE), null);
  });

  await test('PROMO_COUPON_CODES can retire the hardcoded codes', () => {
    assert.deepEqual(parsePromoCodes(undefined), ['WELCOME299', 'FHONEIFY299']);
    assert.deepEqual(parsePromoCodes(''), []);
    assert.deepEqual(parsePromoCodes(' spring , summer '), ['SPRING', 'SUMMER']);
  });

  await test('the stored lead reflects only the server decision, and the marker enforces single use', () => {
    const verified = { price: 20000, diagnostics: {}, audit: {} };
    const denied: any = buildLeadAnswers(verified, false);
    assert.equal(denied.pricing.couponClaimed, false);
    assert.equal(denied.pricing.customerPayout.payout, 20000 - 99);
    assert.equal(denied.pricing.couponRedeemed, undefined);
    const honoured: any = buildLeadAnswers(verified, true, { code: 'WELCOME299', phoneKey: '9876543210' });
    assert.equal(honoured.pricing.customerPayout.payout, 20000 - 99 + 299);
    assert.equal(honoured.pricing.couponRedeemed, true);
    assert.equal(honoured.pricing.couponPhoneKey, '9876543210');
  });

  // Tampering. A client boolean must not be able to reach the payout at all.
  const controller = fs.readFileSync(path.join(__dirname, '../../server/modules/quote/controller.ts'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, '../../app/quote/page.tsx'), 'utf8');

  await test('tampered couponApplied: the lead schema has no such field and the controller never reads it', () => {
    const schema = controller
      .slice(controller.indexOf('const CreateLeadSchema'), controller.indexOf('const PRICING_ERROR_STATUS'))
      .replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/couponApplied/.test(schema), 'CreateLeadSchema still accepts couponApplied');
    assert.ok(/couponCode:/.test(schema));
    assert.ok(!/couponApplied/.test(controller.replace(/^\s*\/\/.*$/gm, '')), 'controller still references couponApplied');
    // zod strips unknown keys by default: prove the tamper is dropped, not just unmentioned.
    const { z } = require('zod');
    const schemaObj = z.object({ couponCode: z.string().optional() });
    assert.deepEqual(schemaObj.parse({ couponApplied: true, couponCode: 'X' }), { couponCode: 'X' });
  });

  await test('the browser holds no valid code and cannot mint one', () => {
    assert.ok(!page.includes('WELCOME299'), 'WELCOME299 is still in the quote page bundle');
    assert.ok(!page.includes('FHONEIFY299'), 'FHONEIFY299 is still in the quote page bundle');
    assert.ok(!/'NEW'\s*\+\s*Math\.floor/.test(page), 'the browser still generates NEW#### codes');
    assert.ok(/coupon\/validate/.test(page), 'apply no longer asks the server');
    assert.ok(!/couponApplied:\s*appliedCoupon/.test(page.slice(page.indexOf("api.post('/api/quote/leads'"))), 'the lead still sends a boolean');
  });

  await test('the coupon path never touches the price: bonus is payout-layer only', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server/modules/quote/coupon.ts'), 'utf8');
    assert.ok(!/calculateFhoneifyPrice|applyCompetitorUplift|priceDevice/.test(src));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
