import { chromium } from 'playwright';

async function verifyOrder() {
  const browser = await chromium.launch({ headless: true });
  
  // Test iPhone 6
  console.log("=== Checking iPhone 6 Questionnaire ===");
  const ctx6 = await browser.newContext();
  const page6 = await ctx6.newPage();
  await page6.goto("https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-6");
  const storage16 = await page6.$('text="16GB"');
  if (storage16) await storage16.click();
  const exactVal6 = await page6.$('text="Get Exact Value"');
  if (exactVal6) {
    await exactVal6.click();
    await page6.waitForTimeout(2000);
    console.log("iPhone 6 Page 1 Heading:", await page6.locator('h2, h3').first().textContent());
  }
  await ctx6.close();

  // Test iPhone 16 Pro Max
  console.log("\n=== Checking iPhone 16 Pro Max Questionnaire ===");
  const ctx16 = await browser.newContext();
  const page16 = await ctx16.newPage();
  await page16.goto("https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-16-pro-max");
  const storage256 = await page16.$('text="256GB"');
  if (storage256) await storage256.click();
  const exactVal16 = await page16.$('text="Get Exact Value"');
  if (exactVal16) {
    await exactVal16.click();
    await page16.waitForTimeout(2000);
    console.log("iPhone 16 Page 1 Heading:", await page16.locator('h2, h3').first().textContent());
  }
  await ctx16.close();

  await browser.close();
}

verifyOrder().catch(console.error);
