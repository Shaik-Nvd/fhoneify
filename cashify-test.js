const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('Navigating...');
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-15', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  console.log('Clicking storage...');
  const variantBtn = await page.$('text=256 GB');
  if (variantBtn) await variantBtn.click();
  await page.waitForTimeout(1000);
  
  const getExactValueBtn = await page.$('text=Get Exact Value');
  if (getExactValueBtn) await getExactValueBtn.click();
  await page.waitForTimeout(3000);
  
  console.log('Answering page 1...');
  
  // Wait for the modal text
  await page.waitForSelector('text=Are you able to make and receive calls?');
  
  // Find all elements with exact text Yes or No
  const yesBtns = await page.$$('text="Yes"');
  const noBtns = await page.$$('text="No"');
  
  console.log(`Found ${yesBtns.length} Yes buttons and ${noBtns.length} No buttons`);
  
  if (yesBtns.length >= 4) {
    await yesBtns[0].click(); // Calls
    await yesBtns[1].click(); // Touch screen
    await yesBtns[2].click(); // Screen original
    await yesBtns[3].click(); // Warranty
    // Some models have GST bill question too
    if (yesBtns.length > 4) {
       await yesBtns[4].click();
    }
  }
  
  const continueBtn = await page.$('text="Continue"');
  if (continueBtn) {
    console.log('Clicking Continue...');
    await continueBtn.click();
    await page.waitForTimeout(3000);
  }
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page 2 content:\n', bodyText.substring(0, 1500));
  
  await browser.close();
})();
