const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-14', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Try to find the city selector
  const cityInput = await page.$('input[placeholder*="Search City"]');
  if (cityInput) {
    console.log("Found city input, typing Bangalore...");
    await cityInput.fill('Bangalore');
    await page.waitForTimeout(1000);
    const blrOpt = await page.$('text="Bangalore"');
    if (blrOpt) {
      await blrOpt.click();
      console.log("Clicked Bangalore");
    }
  } else {
    // Maybe they use a list of top cities
    const blr = await page.$('text="Bangalore"');
    if (blr) {
      await blr.click();
      console.log("Clicked Bangalore directly from top cities");
    } else {
      console.log("No Bangalore found");
    }
  }
  
  await page.waitForTimeout(2000);
  
  const getExactValueBtn = await page.$('text="Get Exact Value"');
  if (getExactValueBtn) {
    console.log("Get Exact Value is enabled?", await getExactValueBtn.isEnabled());
  }
  
  await browser.close();
})();
