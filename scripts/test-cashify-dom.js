const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = 'https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-17-pro-max';
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Click 256 GB
  const variant = await page.waitForSelector('text=256 GB', { timeout: 5000 });
  await variant.click();
  
  await page.waitForTimeout(3000);
  
  const text = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log("Body text start:", text);
  
  await browser.close();
})();
