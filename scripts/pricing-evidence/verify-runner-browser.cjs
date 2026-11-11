/** Local UI QA against runner-browser-api.ts. No OTP, auth, or lead submission. */
const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const quotes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (response.url().includes('/api/quote/price')) {
      const payload = await response.json();
      assert(payload.success);
      const q = payload.data;
      quotes.push({ device: q.device, price: q.fhoneifyPrice, getUpto: q.startingPrice, version: q.pricingVersion });
    }
  });
  fs.mkdirSync('docs/pricing-handbook/assets/runner-local-qa', { recursive: true });
  const screenshot = name => page.screenshot({ path: `docs/pricing-handbook/assets/runner-local-qa/${name}.png` });
  const go = async (brand, model, storage, step) => {
    await page.goto(`http://localhost:3310/quote?${new URLSearchParams({ brand, model, storage, step: String(step) })}`, { waitUntil: 'networkidle', timeout: 90000 });
  };
  await go('Nothing', 'Nothing Phone 3a', '8 GB/128 GB', 2);
  await page.getByRole('button', { name: 'Get Exact Value' }).waitFor();
  assert(quotes.length > 0);
  const starting = quotes.at(-1).getUpto;
  const expectedText = `₹${starting.toLocaleString('en-IN')}`;
  assert((await page.locator('body').innerText()).includes(expectedText));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(expectedText, { exact: true }).waitFor({ timeout: 30000 });
  assert((await page.locator('body').innerText()).includes(expectedText), 'reload keeps exact server Get Upto');
  await screenshot('nothing-server-get-upto-reload');
  await page.getByRole('button', { name: 'Get Exact Value' }).click();
  assert.equal(await page.getByRole('button', { name: 'Yes', exact: true }).count(), 5);
  for (const button of await page.getByRole('button', { name: 'Yes', exact: true }).all()) await button.click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'WiFi not working' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Original Box with same IMEI' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  assert((await page.locator('body').innerText()).includes('3 months - 6 months'), 'conditional age is reachable after real selections');
  await screenshot('nothing-conditional-age');
  for (const [model, storage, charger] of [
    ['CMF by Nothing Phone 2 Pro 5G', '8 GB/128 GB', true], ['Nothing Phone 1', '8 GB/128 GB', true],
    ['Nothing Phone 4a', '6 GB/128 GB', true], ['Nothing Phone 4a', '8 GB/128 GB', false],
  ]) {
    await go('Nothing', model, storage, 8);
    assert.equal(await page.getByRole('button', { name: 'Original Charger', exact: false }).count(), charger ? 1 : 0, `${model} ${storage} charger question`);
    if (model.startsWith('CMF')) await screenshot('cmf-offered-charger');
  }
  await go('Nothing', 'Nothing Phone 1', '8 GB/128 GB', 3);
  assert.equal(await page.getByRole('button', { name: 'Yes', exact: true }).count(), 3, 'Phone 1 never asks warranty or bill');
  await go('OnePlus', 'Oneplus Open', '16 GB/512 GB', 7);
  assert.equal(await page.getByRole('button', { name: /Outer screen damaged/ }).count(), 1);
  assert.equal(await page.getByRole('button', { name: /Hinge damaged/ }).count(), 1);
  await screenshot('oneplus-open-fold-diagnostics');
  assert.deepEqual(errors, []);
  fs.writeFileSync('release-test-logs/android/browser-summary.json', JSON.stringify({
    basis: 'Real Next frontend + production price controller/service; injected read-only session reference fixtures, unreachable DB. Browser routes to steps 8/3/7 also checked visibility.',
    getUpto: starting, reloadStable: true, realQuestionnaireFlowReachedAge: true, chargerVisibility: '4 variants passed', phone1QuestionCount: 3,
    openFoldAnswers: true, pageErrors: errors, quotes, otpAndLead: 'not tested; no auth or lead endpoints exposed',
  }, null, 2) + '\n');
  await browser.close();
  console.log('PASS browser: server Get Upto/reload, real conditional-age flow, Phone1, charger variants, Open fold choices; no OTP or leads');
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
