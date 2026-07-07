import { chromium } from 'playwright';

async function run() {
  const url = "https://www.cashify.in/sell-old-mobile-phone/used-samsung-galaxy-s10";
  console.log("Launching browser to test URL:", url);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log("Page loaded. Looking for variants...");
  
  try {
      // Click the 8 GB/512 GB variant
      await page.click('text="8 GB/512 GB"');
      console.log("Clicked variant.");
      
      // The price might appear immediately or we might have to click 'Get Exact Value'
      await page.waitForTimeout(2000);
      
      const price = await page.locator('.base-price').innerText();
      console.log("Base Price:", price);
  } catch(e) {
      console.log("Error finding price:", e.message);
  }
  
  await page.screenshot({ path: 'cashify_screenshot_s10.png' });
  console.log("Screenshot taken.");
  await browser.close();
}

run();
