const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('Navigating...');
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-15', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  console.log('Finding Exact Value button...');
  // The button usually says "Get Exact Value"
  const getExactValueBtn = await page.$('text=Get Exact Value');
  if (getExactValueBtn) {
    console.log('Clicking Get Exact Value...');
    await getExactValueBtn.click();
    await page.waitForTimeout(3000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Next step content:\n', bodyText.substring(0, 500));
  } else {
    console.log('Get Exact Value button not found. Body:\n', (await page.evaluate(() => document.body.innerText)).substring(0, 500));
  }
  await browser.close();
})();
