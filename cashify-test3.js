const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let sessionFiles = fs.readdirSync('./cashify-sessions').filter(f => f.startsWith('session-')).map(f => './cashify-sessions/' + f);
  if (sessionFiles.length === 0) { console.log("No sessions!"); return; }
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: sessionFiles[0] });
  const page = await context.newPage();
  
  // page.setDefaultTimeout(45000); // We'll keep default for this quick test

  console.log('Navigating...');
  const start = Date.now();
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  
  console.log('Clicking Get Exact Value...');
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) await getExactValueBtn.click();
  else { console.log("NOT FOUND"); await browser.close(); return; }
  
  console.log('Answering Page 1...');
  await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 10000 });
  const yesBtns = await page.$$('text="Yes"');
  if (yesBtns.length >= 4) {
      await yesBtns[0].click();
      await yesBtns[1].click();
      await yesBtns[2].click();
      await yesBtns[3].click();
      if (yesBtns.length > 4) await yesBtns[4].click();
  }
  const c1 = await page.$('text="Continue"');
  if (c1) await c1.click();
  
  console.log('Answering Page 2...');
  await page.waitForTimeout(2000);
  const screenScratch = await page.$('text=Broken/scratch on device screen');
  if (screenScratch) await screenScratch.click();
  const c2 = await page.$('text="Continue"');
  if (c2) await c2.click();
  
  console.log('Answering Page 3...');
  await page.waitForTimeout(2000);
  const battery = await page.$('text=Battery faulty');
  if (battery) await battery.click();
  const c3 = await page.$('text="Continue"');
  if (c3) await c3.click();
  
  console.log('Answering Page 4...');
  await page.waitForTimeout(2000);
  const c4 = await page.$('text="Continue"');
  if (c4) await c4.click();
  
  console.log('Waiting for calculation...');
  await page.waitForTimeout(4000);
  
  const priceText = await page.evaluate(() => {
    const priceElements = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4, h5, h6'))
      .filter(el => {
        const text = el.textContent?.trim() || '';
        return text.includes('₹') && text.length < 15;
      });
    return priceElements.length > 0 ? priceElements[priceElements.length - 1].textContent?.trim() : null;
  });
  
  console.log('Finished in', (Date.now() - start)/1000, 'seconds');
  console.log('Price:', priceText);
  await browser.close();
})();
