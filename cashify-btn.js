const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) {
    console.log(await page.evaluate(el => el.outerHTML, getExactValueBtn));
  }
  
  await browser.close();
})();
