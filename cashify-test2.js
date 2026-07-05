const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('Navigating...');
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) await getExactValueBtn.click();
  else console.log("NO EXACT VALUE BTN");
  await page.waitForTimeout(3000);
  
  const yesBtns = await page.$$('text="Yes"');
  for(let b of yesBtns) await b.click();
  const c1 = await page.$('text="Continue"');
  if (c1) await c1.click();
  
  await page.waitForTimeout(2000);
  const c2 = await page.$('text="Continue"');
  if (c2) await c2.click();
  
  await page.waitForTimeout(2000);
  const c3 = await page.$('text="Continue"');
  if (c3) await c3.click();
  
  await page.waitForTimeout(2000);
  const c4 = await page.$('text="Continue"');
  if (c4) await c4.click();
  
  console.log("Waiting for final page...");
  await page.waitForTimeout(5000);
  
  console.log(await page.evaluate(() => document.body.innerText.substring(0, 1000)));
  await browser.close();
})();
