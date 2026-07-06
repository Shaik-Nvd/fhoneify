const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const config = require('c:/Users/Mubeen_Taj/Downloads/Fhone/lib/pricingConfig.json');

// Fhoneify Pricing Engine Simulator (matches page.tsx exact math)
function getFhoneifyPrice(baseMarketPrice, edgeCase) {
  const floor_price = 1200;
  
  // Apple iPhone 15 parameters
  const params = {
    warrantyPenalty: 0.08,
    gstBillPenalty: 0.05,
    callsPenalty: 0.52,
    originalScreenPenalty: 0.68,
    touchPenalty: 0.32,
    functionalScale: 1.1,
    physicalScale: 1.05,
  };

  let age_multiplier = 1.0 - params.warrantyPenalty - params.gstBillPenalty; // Out of warranty, no bill
  let calls_multiplier = edgeCase.calls === false ? params.callsPenalty : 1.0;
  let touch_multiplier = edgeCase.touch === false ? params.touchPenalty : 1.0;
  let screen_orig_mult = edgeCase.originalScreen === false ? params.originalScreenPenalty : 1.0;
  
  let screen_body_sum = 0;
  if (edgeCase.screenMinor) screen_body_sum += (0.08 * params.physicalScale);
  if (edgeCase.screenCracked) screen_body_sum += (0.35 * params.physicalScale);
  if (edgeCase.bodyMinor) screen_body_sum += (0.03 * params.physicalScale);

  let functional_sum = 0;
  if (edgeCase.batteryService) functional_sum += (config.defects_functional.battery_service * params.functionalScale);
  if (edgeCase.cameraBroken) functional_sum += (config.defects_functional.back_camera * params.functionalScale);

  const rawBase = baseMarketPrice;
  const rawCalculated = rawBase 
    * age_multiplier 
    * calls_multiplier 
    * touch_multiplier 
    * screen_orig_mult 
    * (1 - Math.min(screen_body_sum, 1)) 
    * (1 - Math.min(functional_sum, 1));
    
  let upliftPercent = 1.04;
  if (rawBase <= 20000) upliftPercent = 1.08;
  else if (rawBase <= 50000) upliftPercent = 1.06;

  return Math.max(Math.round(rawCalculated * upliftPercent), floor_price);
}

async function testCombination(browser, sessionFile, modelSlug, storageText, selections) {
  let context = null;
  let page = null;
  try {
    context = await browser.newContext({ storageState: sessionFile });
    page = await context.newPage();
    
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) route.abort();
      else route.continue();
    });

    const url = `https://www.cashify.in/sell-old-mobile-phone/used-${modelSlug}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const storageBtn = await page.$(`text="${storageText}"`);
    if (storageBtn) await storageBtn.click();
    await page.waitForTimeout(1000);

    const exactBtn = await page.$('text="Get Exact Value"');
    if (exactBtn) await exactBtn.click();
    await page.waitForTimeout(2000);

    // Page 1: Yes/No
    await page.waitForSelector('text=Are you able to make and receive calls?');
    const yesBtns = await page.$$('text="Yes"');
    if (yesBtns.length >= 4) {
      for(let i=0; i<yesBtns.length; i++) {
         await yesBtns[i].click(); // Click all Yes
      }
    }
    const continueBtn1 = await page.$('text="Continue"');
    if (continueBtn1) await continueBtn1.click();
    await page.waitForTimeout(2000);

    // Page 2: Defects Category
    for (const defect of selections.categories) {
      const el = await page.$(`text="${defect}"`);
      if (el) await el.click();
    }
    const continueBtn2 = await page.$('text="Continue"');
    if (continueBtn2) await continueBtn2.click();
    await page.waitForTimeout(2000);

    // Page 3: Screen sub-options
    if (selections.screenSub) {
      const sub = await page.$(`text="${selections.screenSub}"`);
      if (sub) await sub.click();
      const cont = await page.$('text="Continue"');
      if (cont) await cont.click();
      await page.waitForTimeout(2000);
    }
    
    // Page 4: Body sub-options (if any)
    if (selections.bodyScratches) {
      const sub = await page.$(`text="${selections.bodyScratches}"`);
      if (sub) await sub.click();
    }
    if (selections.bodyDents) {
      const sub = await page.$(`text="${selections.bodyDents}"`);
      if (sub) await sub.click();
    }
    if (selections.bodyScratches || selections.bodyDents) {
      const cont = await page.$('text="Continue"');
      if (cont) await cont.click();
      await page.waitForTimeout(2000);
    }

    // Page 5: Functional
    if (selections.functional) {
      for (const func of selections.functional) {
        const sub = await page.$(`text="${func}"`);
        if (sub) await sub.click();
      }
    }
    const continueBtn3 = await page.$('text="Continue"');
    if (continueBtn3) await continueBtn3.click();
    await page.waitForTimeout(2000);

    // Page 6: Accessories (None)
    const continueBtn4 = await page.$('text="Continue"');
    if (continueBtn4) await continueBtn4.click();
    await page.waitForTimeout(3000);

    // Get Final Price
    const priceEl = await page.$('.amount');
    let priceText = '';
    if (priceEl) {
      priceText = await priceEl.innerText();
    } else {
      priceText = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const p = els.find(e => e.innerText && e.innerText.includes('₹') && e.innerText.length < 15);
        return p ? p.innerText : 'Not Found';
      });
    }

    return parseInt(priceText.replace(/[^0-9]/g, ''), 10);

  } catch (err) {
    console.error(err);
    return null;
  } finally {
    if (page) await page.close();
    if (context) await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Fallback if session file doesn't exist - we'll just run headless without auth. It usually works for checking quotes.
  let sessionFile = undefined;
  if (fs.existsSync(path.join(__dirname, '../cashify-session.json'))) {
    sessionFile = path.join(__dirname, '../cashify-session.json');
  }
  
  const tests = [
    { name: 'Flawless', cats: [], sub: {}, edgeCase: {} },
    { name: 'Minor Scratches', cats: ['Broken/scratch on device screen'], sub: { screenSub: '1-2 scratches on screen' }, edgeCase: { screenMinor: true } },
    { name: 'Cracked Screen', cats: ['Broken/scratch on device screen'], sub: { screenSub: 'Screen cracked/ glass broken' }, edgeCase: { screenCracked: true } },
    { name: 'Bad Battery', cats: ['Functional or Physical Problems'], sub: { functional: ['Battery in Service (< 80%)'] }, edgeCase: { batteryService: true } },
    { name: 'Faulty Camera', cats: ['Functional or Physical Problems'], sub: { functional: ['Back Camera not working'] }, edgeCase: { cameraBroken: true } }
  ];

  // Base Apple iPhone 15 128GB flawless base price (Cashify original)
  const baseCashifyFlawlessPrice = 36900; 

  console.log('--- RUNNING 5 EDGE CASES COMPARISON FOR iPHONE 15 128GB ---');

  for (const t of tests) {
    console.log(`\nTesting: ${t.name}...`);
    const cashifyPrice = await testCombination(browser, sessionFile, 'apple-iphone-15', '128 GB', {
      categories: t.cats,
      ...t.sub
    });
    
    // We calculate Fhoneify price based on the fixed 6% uplift applied to the Base Cashify Price (36,900)
    const fhoneifyPrice = getFhoneifyPrice(baseCashifyFlawlessPrice, t.edgeCase);
    
    console.log(`Cashify Exact Result: ₹${cashifyPrice || 'Failed'}`);
    console.log(`Fhoneify Math Result: ₹${fhoneifyPrice}`);
    if (cashifyPrice) {
      const margin = (((fhoneifyPrice - cashifyPrice) / cashifyPrice) * 100).toFixed(2);
      console.log(`Difference: +${margin}% (Our 6% profit margin target)`);
    }
  }

  await browser.close();
})();
