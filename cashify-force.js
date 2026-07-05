const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) {
    console.log("Forcing click...");
    await getExactValueBtn.click({ force: true });
    console.log("Clicked! Waiting for Page 1...");
    try {
        await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 10000 });
        console.log("SUCCESS! We are on Page 1!");
    } catch (e) {
        console.log("FAILED! Still on initial page, force click didn't work.");
    }
  }
  
  await browser.close();
})();
