const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let sessionFiles = fs.readdirSync('./cashify-sessions').filter(f => f.startsWith('session-')).map(f => './cashify-sessions/' + f);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: sessionFiles[0] });
  const page = await context.newPage();
  
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  const storage = "128GB";
  const formattedStorage = storage.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2');
  const storageOptions = await page.$$(`text="${formattedStorage}"`);
  if (storageOptions.length > 0) await storageOptions[0].click();
  
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) await getExactValueBtn.click();
  
  await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 10000 });
  const yesBtns = await page.$$('text="Yes"');
  if (yesBtns.length >= 3) {
      await yesBtns[0].click(); // Calls: yes
      await yesBtns[1].click(); // Touch: yes
      await yesBtns[2].click(); // Original screen: yes
  }
  const c1 = await page.$('text="Continue"');
  if (c1) await c1.click();
  
  await page.waitForTimeout(2000);
  // Click Body Defect
  const bodyDent = await page.$('text=Scratch/Dent on device body');
  if (bodyDent) {
      await bodyDent.click();
  }
  const c2 = await page.$('text="Continue"');
  if (c2) await c2.click();
  
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('Page Content:', text);
  
  await browser.close();
})();
