import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { customerPayout } from '../../lib/pricing/payout';

// Requires the release-flow --serve fixture and Next dev server on ports 5007/3001.
// All browser requests outside loopback are blocked, including analytics and comparison calls.
const api = 'http://127.0.0.1:5007';
const url = 'http://localhost:3001/quote?brand=OnePlus&model=OnePlus%20Nord&storage=8%20GB%2F128%20GB&stage=storage&step=2';
const state = async () => (await fetch(`${api}/fixture/state`)).json() as Promise<any>;
const moveReference = async () => {
  const response = await fetch(`${api}/fixture/reference`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: 100 }),
  });
  assert.equal(response.status, 200);
};
const expireTokens = async () => {
  const response = await fetch(`${api}/fixture/clock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advanceSeconds: 901 }),
  });
  assert.equal(response.status, 200);
};
async function pickupForm(page: Page) {
  await page.locator('input[type=date]').fill('2026-10-12');
  await page.locator('select').selectOption('10:00 AM - 1:00 PM');
  await page.getByPlaceholder('e.g. 101, Fhoneify Apartments').fill('LOCAL TEST ONLY');
  await page.getByPlaceholder('6 Digit Pincode').fill('560001');
  await page.getByPlaceholder('e.g. Bengaluru').fill('Bengaluru');
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const results: any[] = [];
  let latestPage: Page | undefined;
  try {
    for (const scenario of [
      { couponApplied: false, expiredReload: false },
      { couponApplied: true, expiredReload: false },
      { couponApplied: false, expiredReload: true },
    ]) {
      const { couponApplied, expiredReload } = scenario;
      const context = await browser.newContext();
      await context.route('**/*', route => {
        const hostname = new URL(route.request().url()).hostname;
        return ['localhost', '127.0.0.1', '::1'].includes(hostname) ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      latestPage = page;
      page.setDefaultTimeout(30000);
      page.on('dialog', dialog => { void dialog.accept().catch(() => undefined); });
      page.on('pageerror', error => console.error('Local page error:', error.message));
      const submissions: { token: boolean; price: number; coupon: boolean; status?: number }[] = [];
      let latestPrice: number | undefined;
      const quoteResponses: Promise<void>[] = [];
      page.on('request', request => {
        if (request.url() === `${api}/api/quote/leads`) {
          const body = request.postDataJSON();
          submissions.push({ token: typeof body.quoteToken === 'string' && body.quoteToken.length > 0,
            price: body.quotedPrice, coupon: body.couponApplied });
        }
      });
      page.on('response', response => {
        if (response.url() === `${api}/api/quote/leads`) submissions.at(-1)!.status = response.status();
        if (response.url() === `${api}/api/quote/price` && response.status() === 200)
          quoteResponses.push(response.json().then(body => { latestPrice = body.data.fhoneifyPrice; }));
      });
      const initial = await state();
      assert.equal(initial.fixture, true);
      assert.equal(initial.database, 'disabled');
      await page.goto(url);
      await page.getByRole('button', { name: /Schedule Pickup 🚚/ }).waitFor();
      if (couponApplied || expiredReload) {
        // Exercise the supported Get Upto shortcut, whose token carries perfect-condition answers.
        await page.getByRole('button', { name: /Schedule Pickup 🚚/ }).click();
      } else {
        await page.getByRole('button', { name: /Get Exact Value/ }).click();
        const yes = page.getByRole('button', { name: 'Yes', exact: true });
        while (await yes.count()) {
          // The three required functional answers. Optional warranty/bill remain explicit No if asked.
          for (let i = 0; i < Math.min(3, await yes.count()); i++) await yes.nth(i).click();
          const no = page.getByRole('button', { name: 'No', exact: true });
          for (let i = 3; i < await no.count(); i++) await no.nth(i).click();
          await page.getByRole('button', { name: /Continue/ }).click();
          break;
        }
        // Clean physical/functional condition and no accessories: explicit UI choices, no state injection.
        for (let i = 0; i < 4; i++) {
          if (await page.getByPlaceholder('Enter your Mobile').count()) break;
          if (await page.getByRole('button', { name: 'Above 11 months' }).count())
            await page.getByRole('button', { name: 'Above 11 months' }).click();
          await page.getByRole('button', { name: /Continue/ }).click();
        }
      }
      await page.getByPlaceholder('Enter your Mobile').fill('9999999999');
      await page.getByPlaceholder('Enter your Name').fill('Local Browser Test');
      await page.locator('#terms').check();
      await page.getByRole('button', { name: 'GET EXACT PRICE', exact: true }).click();
      await page.getByPlaceholder('6-digit OTP').fill('000000');
      await page.getByRole('button', { name: 'VERIFY & SEE PRICE' }).click();
      await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).waitFor();
      if (couponApplied) {
        await page.getByPlaceholder('Enter promo code').fill('WELCOME299');
        await page.getByRole('button', { name: 'Apply', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).click();
      await pickupForm(page);
      if (expiredReload) {
        // Expire the browser's cached token before mounting a direct pickup URL.
        // Browser and fixture clocks advance together; no session/token data is injected.
        await page.clock.install({ time: new Date(Date.now() + initial.fixtureClockOffsetMs) });
        await page.clock.fastForward(901000);
        await expireTokens();
        await moveReference();
        const pickupUrl = new URL(page.url());
        pickupUrl.searchParams.set('step', '12');
        await page.goto(pickupUrl.toString());
        await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).waitFor();
        assert.equal((await state()).leadCount, initial.leadCount);
      } else if (couponApplied) {
        // Fallback offers remain price locked within their valid lifetime. Expiry, unlike
        // same-version reference movement, must reject that token before persistence.
        await expireTokens();
        const rejected = page.waitForResponse(r => r.url() === `${api}/api/quote/leads`);
        await page.getByRole('button', { name: 'Confirm Pickup', exact: true }).click();
        assert.equal((await rejected).status(), 409);
        await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).waitFor();
        assert.equal((await state()).leadCount, initial.leadCount, '409 must persist zero leads');
      } else {
        // The current Schedule Pickup click uses local step state. A direct pickup URL
        // also exists; reload that supported URL to exercise the persisted-offer guard.
        const pickupUrl = new URL(page.url());
        pickupUrl.searchParams.set('step', '12');
        await page.goto(pickupUrl.toString());
        await page.getByRole('button', { name: 'Confirm Pickup', exact: true }).waitFor();
        // Reload after the source changes must return to review, not keep the accepted pickup step.
        await moveReference();
        await page.reload();
        await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).waitFor();
        assert.equal((await state()).leadCount, initial.leadCount);
      }
      // Explicit acceptance is required after either rejection or reload changed the quote.
      assert.equal(await page.getByRole('button', { name: 'Confirm Pickup', exact: true }).count(), 0);
      await Promise.all(quoteResponses);
      assert.equal(typeof latestPrice, 'number');
      const displayedPayout = customerPayout(latestPrice!, couponApplied).payout;
      assert((await page.locator('body').innerText()).includes(`₹${displayedPayout.toLocaleString('en-IN')}`),
        'the review screen must display the real fee/coupon payout for the fresh quote');
      await page.getByRole('button', { name: 'Schedule Pickup', exact: true }).click();
      await pickupForm(page);
      const accepted = page.waitForResponse(r => r.url() === `${api}/api/quote/leads`);
      await page.getByRole('button', { name: 'Confirm Pickup', exact: true }).click();
      assert.equal((await accepted).status(), 200);
      const final = await state();
      assert.equal(final.leadCount, initial.leadCount + 1);
      assert(submissions.every(s => s.token && s.coupon === couponApplied));
      assert.equal(final.latestLead.quotedPrice, submissions.at(-1)!.price);
      assert.equal(final.latestLead.quotedPrice, latestPrice);
      assert.deepEqual(final.latestLead.customerPayout, customerPayout(submissions.at(-1)!.price, couponApplied));
      results.push({ couponApplied, route: expiredReload ? 'expired saved token + direct pickup reload' : couponApplied ? 'Get Upto shortcut + HTTP 409' : 'questionnaire + changed reload',
        submissions, displayedPayout, storedGross: final.latestLead.quotedPrice, actualPayout: final.latestLead.customerPayout });
      await context.close();
    }
    console.log(JSON.stringify({ results, persistence: 'fixture memory only; all non-loopback browser requests blocked' }, null, 2));
  } catch (error) {
    if (latestPage && !latestPage.isClosed()) console.error('Local browser failure page:', await latestPage.locator('body').innerText());
    throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
