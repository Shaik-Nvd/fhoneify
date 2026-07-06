import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const sessionFile = path.join(__dirname, '../cashify-sessions/session-1783205471762.json');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: sessionFile });
  const page = await context.newPage();

  console.log("Navigating...");
  await page.goto('https://www.cashify.in/sell-old-mobile-phone/used-apple-iphone-15-pro-max');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step1_home.png' });
  console.log("Clicked 256 GB...");
  const storageBtn = await page.$('text="256 GB"');
  if (storageBtn) await storageBtn.click();
  
  await page.waitForTimeout(2000);
  const exactBtn = await page.$('text="Get Exact Value"');
  if (exactBtn) await exactBtn.click();
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step2_questions.png' });
  console.log("Answering Yes to all...");
  
  const yesBtns = await page.$$('text="Yes"');
  for (const btn of yesBtns) await btn.click();
  
  const cont1 = await page.$('text="Continue"');
  if (cont1) await cont1.click();
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step3_defects.png' });
  
  console.log("Selecting Scratch/Dent...");
  const dentBtn = await page.$('text=Scratch/Dent on device body');
  if (dentBtn) await dentBtn.click();
  
  const cont2 = await page.$('text="Continue"');
  if (cont2) await cont2.click();
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step4_subdefects.png' });
  
  console.log("Done. Check the screenshots.");
  await browser.close();
}

test().catch(console.error);
