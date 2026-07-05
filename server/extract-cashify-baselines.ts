import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const MODELS = [
  "Apple iPhone 6", "Apple iPhone 6 Plus", "Apple iPhone 6S", "Apple iPhone 6S Plus",
  "Apple iPhone SE 1st Generation", "Apple iPhone 7", "Apple iPhone 7 Plus", "Apple iPhone 8",
  "Apple iPhone 8 Plus", "Apple iPhone X", "Apple iPhone XR", "Apple iPhone XS", "Apple iPhone XS Max",
  "Apple iPhone 11", "Apple iPhone 11 Pro", "Apple iPhone 11 Pro Max", "Apple iPhone SE 2020",
  "Apple iPhone 12", "Apple iPhone 12 Mini", "Apple iPhone 12 Pro", "Apple iPhone 12 Pro Max",
  "Apple iPhone 13", "Apple iPhone 13 Mini", "Apple iPhone 13 Pro", "Apple iPhone 13 Pro Max",
  "Apple iPhone SE 2022", "Apple iPhone 14", "Apple iPhone 14 Pro", "Apple iPhone 14 Pro Max",
  "Apple iPhone 14 Plus", "Apple iPhone 15", "Apple iPhone 15 Pro", "Apple iPhone 15 Pro Max",
  "Apple iPhone 15 Plus", "Apple iPhone 16", "Apple iPhone 16 Plus", "Apple iPhone 16 Pro",
  "Apple iPhone 16 Pro Max", "Apple iPhone 16e", "Apple iPhone 17", "Apple iPhone Air",
  "Apple iPhone 17 Pro", "Apple iPhone 17 Pro Max", "Apple iPhone 17e"
];

// Always pick lowest storage to baseline
const STORAGE_PREF = ['16GB', '32GB', '64GB', '128GB'];

const EDGE_CASES = [
  {
    name: "Flawless",
    answers: { calls: true, touch: true, originalScreen: true, warranty: true, mobileAge: 'below3', defects: [], hardware: [], accessories: ['box', 'bill', 'charger'], validBill: true }
  },
  {
    name: "Heavy Damage",
    answers: { calls: true, touch: false, originalScreen: false, warranty: false, mobileAge: 'above11', defects: ['screen_scratch', 'body_scratch', 'panel_missing'], hardware: ['battery_health', 'wifi'], accessories: [], validBill: false }
  },
  {
    name: "Dead Phone",
    answers: { calls: false, touch: true, originalScreen: true, warranty: false, mobileAge: 'above11', defects: [], hardware: [], accessories: [], validBill: false }
  }
];

const resultsFile = path.join(__dirname, 'data/cashify-baseline-prices.json');

async function scrapeEdgeCase(page: any, model: string, edgeCase: any) {
  // Navigation
  let urlModel = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await page.goto(`https://www.cashify.in/sell-old-mobile-phone/used-${urlModel}`, { waitUntil: 'networkidle' });
  
  // MANUAL OVERRIDE DELAY 
  // Wait 15 seconds for a human to clear Location Modals and Cloudflare Captchas
  console.log("Waiting 15 seconds for manual override of Captchas/Modals...");
  await page.waitForTimeout(15000);

  // Storage Selection
  for (const s of STORAGE_PREF) {
    const storageBtn = await page.$(`text="${s}"`);
    if (storageBtn) {
      await storageBtn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);
  
  const exactValBtn = await page.$('text="Get Exact Value"');
  if (!exactValBtn) return null;
  await exactValBtn.click();
  
  await page.waitForTimeout(2000);
  const gotIt = await page.$('text="Got It"');
  if (gotIt) await gotIt.click();
  await page.waitForTimeout(2000);
  
  // Step 1: Basic
  if (!edgeCase.answers.calls) {
    const btn = await page.$('text="Able to Make and Receive Calls"');
    if (btn) await btn.click();
  }
  if (!edgeCase.answers.touch) {
    const btn = await page.$('text="Are there any issues with your device screen?"');
    if (btn) await btn.click();
  }
  
  // Warranty specific questions
  if (edgeCase.answers.warranty) {
    const warr = await page.$('text="Is your device under manufacturer warranty?"');
    if (warr) {
      const yesBtn = await warr.$('xpath=..//button[contains(text(), "Yes")]');
      if (yesBtn) await yesBtn.click();
    }
    if (edgeCase.answers.validBill) {
      const bill = await page.$('text="Do you have GST valid bill with the same IMEI?"');
      if (bill) {
        const yesBtn2 = await bill.$('xpath=..//button[contains(text(), "Yes")]');
        if (yesBtn2) await yesBtn2.click();
      }
    }
  }

  await page.waitForTimeout(1000);
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(2000);
  
  // Stop early if calls is false
  if (!edgeCase.answers.calls) {
    await page.waitForTimeout(2000);
  } else {
    // Stage 2: Screen/Body Defects
    if (edgeCase.answers.defects.includes('screen_scratch')) {
      const b = await page.$('text="Scratches on Screen"');
      if (b) await b.click();
    }
    if (edgeCase.answers.defects.includes('body_scratch')) {
      const b = await page.$('text="Scratches / Dents on body"');
      if (b) await b.click();
    }
    if (edgeCase.answers.defects.includes('panel_missing')) {
      const b = await page.$('text="Panel Missing / Broken"');
      if (b) await b.click();
    }
    await page.waitForTimeout(1000);
    const c2 = await page.$('button:has-text("Continue")');
    if (c2) await c2.click();
    await page.waitForTimeout(2000);
    
    // Stage 3: Functional
    if (edgeCase.answers.hardware.includes('wifi')) {
      const b = await page.$('text="WiFi not working"');
      if (b) await b.click();
    }
    if (edgeCase.answers.hardware.includes('battery_health')) {
      const b = await page.$('text="Battery Health 80-85%"');
      if (b) await b.click();
    }
    await page.waitForTimeout(1000);
    const c3 = await page.$('button:has-text("Continue")');
    if (c3) await c3.click();
    await page.waitForTimeout(2000);
    
    // Stage 4: Accessories
    if (edgeCase.answers.accessories.includes('box')) {
      const b = await page.$('text="Original Box"');
      if (b) await b.click();
    }
    if (edgeCase.answers.accessories.includes('bill')) {
      const b = await page.$('text="Valid Bill"');
      if (b) await b.click();
    }
    if (edgeCase.answers.accessories.includes('charger')) {
      const b = await page.$('text="Original Charger"');
      if (b) await b.click();
    }
    await page.waitForTimeout(1000);
    const c4 = await page.$('button:has-text("Continue")');
    if (c4) await c4.click();
    await page.waitForTimeout(2000);
    
    // Stage 5: Age
    let ageText = '';
    switch(edgeCase.answers.mobileAge) {
        case 'below3': ageText = 'Below 3 months'; break;
        case '3to6': ageText = '3 months - 6 months'; break;
        case '6to11': ageText = '6 months - 11 months'; break;
        case 'above11': ageText = 'Above 11 months'; break;
    }
    if (ageText) {
        const b = await page.$(`text="${ageText}"`);
        if (b) await b.click();
    }
    await page.waitForTimeout(3000);
  }
  
  // Extract Price
  const rawPrice = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'));
      let highestPrice = 0;
      for (const el of els) {
          const text = el.textContent?.trim() || '';
          if (text.startsWith('₹') && text.length < 10) {
              const num = parseInt(text.replace(/[^0-9]/g, ''));
              if (num > highestPrice) highestPrice = num;
          }
      }
      return highestPrice;
  });
  
  return rawPrice;
}

async function run() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const results: any = {};
  
  console.log('Starting mass extraction of 43 iPhone models...');
  
  for (const model of MODELS) {
    results[model] = {};
    for (const edge of EDGE_CASES) {
      console.log(`Processing: ${model} - [${edge.name}]...`);
      try {
        const price = await scrapeEdgeCase(page, model, edge);
        results[model][edge.name] = price || 'FAILED';
        console.log(`   -> Price: ₹${price}`);
        // Save progressively
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      } catch (err: any) {
        console.error(`   -> Error: ${err.message}`);
        results[model][edge.name] = 'ERROR';
      }
    }
  }
  
  await browser.close();
  console.log('Finished extraction! Results saved to data/cashify-baseline-prices.json');
}

run();
