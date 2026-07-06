import { chromium } from 'playwright';

async function checkUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to iPhone 6...");
  await page.goto(`https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-6`, { waitUntil: 'networkidle' });
  
  console.log("Clicking 16GB...");
  const storageBtn = await page.$(`text="16GB"`);
  if (storageBtn) {
    await storageBtn.click();
    console.log("Clicked 16GB");
  } else {
    console.log("Could not find 16GB button");
  }
  
  await page.waitForTimeout(2000);
  
  console.log("Looking for 'Exact Value' buttons...");
  const exactValBtn = await page.$('text="Get Exact Value"');
  if (exactValBtn) {
    console.log("Found 'Get Exact Value'");
  } else {
    console.log("Did not find 'Get Exact Value'");
    // dump all button texts
    const btns = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim() || '');
    });
    console.log("Available buttons:", btns);
  }
  
  await browser.close();
}

checkUI();
