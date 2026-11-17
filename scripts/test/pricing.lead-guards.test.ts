import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';

/**
 * Lead guards added in the final audit (17 Nov 2026), through the real quote router with no database:
 * - the lead phone must be an Indian mobile number;
 * - a logged-in customer books under their own verified number;
 * - the first-time coupon is once per mobile number, checked after the price is accepted;
 * - a logged-in booking stores the customer's user id.
 */
const sentinel = 'postgresql://fixture:fixture@127.0.0.1:1/nodb?connect_timeout=1';
Object.assign(process.env, { DATABASE_URL: sentinel, DIRECT_URL: sentinel, NODE_ENV: 'test',
  JWT_SECRET: 'offline-lead-guards-jwt-secret-not-for-production-0000', QUOTE_SIGNING_SECRET: 'offline-lead-guards-signing-secret-not-for-production',
  ENABLE_LIVE_MARKET_PRICE_SCRAPE: 'false', QUOTE_PRICE_RATE_LIMIT: '1000', QUOTE_LEAD_RATE_LIMIT: '1000' });

async function main() {
  const [{ default: express }, { default: prisma }, { pricingService }, { default: router }, { users }] = await Promise.all([
    import('express'), import('../../server/lib/prisma'), import('../../server/modules/quote/pricing'),
    import('../../server/modules/quote/routes'), import('../../server/data')]);
  prisma.$connect = async () => { throw new Error('No database connections permitted'); };
  const saved: any[] = [];
  let couponHistory = 0;
  const countQueries: any[] = [];
  Object.defineProperty(prisma.lead, 'count', { value: async (args: any) => { countQueries.push(args); return couponHistory; }, configurable: true });
  Object.defineProperty(prisma.lead, 'create', { value: async ({ data }: any) => { saved.push(data); return { ...data, id: `offline-${saved.length}` }; }, configurable: true });
  let priceChecked = 0;
  pricingService.verifyLeadPrice = async () => {
    priceChecked++;
    return { ok: true, price: 12000, couponHeadroom: 299, diagnostics: { calls: true }, audit: { priceSource: 'quote_token' } } as any;
  };

  const app = express(); app.use(express.json()); app.use('/api/quote', router);
  const server: Server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const addr = server.address(); assert(addr && typeof addr !== 'string');
  const post = async (body: object, token?: string) => {
    const r = await fetch(`http://127.0.0.1:${addr.port}/api/quote/leads`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() as any };
  };
  const lead = { brand: 'Apple', model: 'iPhone 13', storage: '128GB', quoteToken: 'signed', answers: {}, couponApplied: false };
  try {
    for (const phone of ['0000000000', '12345', '+44 7700 900123', '5876543210']) {
      const r = await post({ ...lead, phone });
      assert.equal(r.status, 400, `rejects ${phone}`);
    }
    assert.equal(saved.length, 0, 'invalid numbers store nothing');

    for (const phone of ['9876500000', '+919876500000', '09876500000', '98765 00000']) {
      assert.equal((await post({ ...lead, phone })).status, 200, `accepts ${phone}`);
    }

    couponHistory = 1;
    const before = saved.length;
    const reused = await post({ ...lead, phone: '9876500000', couponApplied: true });
    assert.equal(reused.status, 409);
    assert.equal(reused.body.code, 'COUPON_ALREADY_USED');
    assert.equal(saved.length, before, 'a reused coupon books nothing');
    assert.deepEqual(countQueries.at(-1).where.phone.in.sort(), ['+919876500000', '09876500000', '919876500000', '9876500000'].sort(), 'coupon history matches every spelling of the number');
    assert.equal((await post({ ...lead, phone: '9876500000', couponApplied: false })).status, 200, 'without the coupon the booking goes through');
    couponHistory = 0;
    assert.equal((await post({ ...lead, phone: '9876500001', couponApplied: true })).status, 200, 'a first coupon is accepted');
    assert.equal(saved.at(-1).answers.pricing.couponClaimed, true);

    const checksBefore = priceChecked;
    couponHistory = 1;
    await post({ ...lead, phone: '9876500000', couponApplied: true });
    assert.equal(priceChecked, checksBefore + 1, 'the price is verified before the coupon history is read');
    couponHistory = 0;

    const customer = { id: 'u-offline-lead-guard', phone: '+919811100000', name: null, role: 'buyer', email: null } as any;
    users.push(customer);
    const token = jwt.sign({ userId: customer.id, role: 'buyer', phone: customer.phone }, process.env.JWT_SECRET!, { expiresIn: '5m', algorithm: 'HS256' });
    const own = await post({ ...lead, phone: '9000000000' }, token);
    assert.equal(own.status, 200);
    assert.equal(saved.at(-1).phone, customer.phone, 'a logged-in customer books under their own number');
    assert.equal(saved.at(-1).userId, customer.id, 'the booking is linked to the account');
  } finally {
    server.close();
    await prisma.$disconnect().catch(() => undefined);
  }
  console.log(`PASS lead guards: phone format, own number, coupon once per number; ${saved.length} in-memory leads, zero database connections`);
}
main().catch(err => { console.error(err); process.exit(1); });
