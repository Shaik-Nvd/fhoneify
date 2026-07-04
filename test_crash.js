const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', exception => {
    console.log(`Uncaught exception: "${exception}"`);
  });
  
  console.log('Navigating to the crash URL...');
  await page.goto('http://localhost:3000/quote?brand=OPPO&model=OPPO+Reno8+5G&storage=128GB&stage=storage');
  
  // Wait to see if error pops up
  await page.waitForTimeout(3000);
  
  // Wait for the client-side error string
  try {
    const errorText = await page.locator('text=Application error: a client-side exception has occurred').isVisible();
    if (errorText) {
      console.log('CONFIRMED: Client-side exception screen is visible.');
    } else {
      console.log('No client-side exception screen found.');
    }
  } catch (e) {
    console.log('Could not find error text.');
  }
  
  await browser.close();
})();
