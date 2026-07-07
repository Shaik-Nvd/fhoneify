import { chromium } from 'playwright';

async function run() {
  const url = "https://www.cashify.in/sell-old-mobile-phone/used-samsung-galaxy-s10";
  console.log("Launching browser to test URL:", url);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log("Page loaded. Looking for EXACT VALUE...");
  
  try {
    await page.waitForSelector('text="Get Exact Value"', { timeout: 10000 });
    await page.click('text="Get Exact Value"');
    console.log("Clicked 'Get Exact Value'");
  } catch (e) {
    console.log("Could not find 'Get Exact Value' button");
  }

  try {
    await page.waitForSelector('.base-price', { timeout: 15000 });
    const priceText = await page.locator('.base-price').innerText();
    console.log("SUCCESS! Base price found:", priceText);
  } catch (e) {
    console.log("Could not find .base-price automatically. You might need to click 'Get Exact Value' manually.");
  }
  
  console.log("Leaving browser open for 60 seconds so you can interact with it...");
  await new Promise(r => setTimeout(r, 60000));
  await browser.close();
}

run();
