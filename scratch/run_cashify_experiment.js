const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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
    console.log(`Navigating to ${url}...`);
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
    let hasDefects = false;
    for (const defect of selections.categories) {
      const el = await page.$(`text="${defect}"`);
      if (el) {
        hasDefects = true;
        await el.click();
      }
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

    // Page 5: Functional (skip)
    const continueBtn3 = await page.$('text="Continue"');
    if (continueBtn3) await continueBtn3.click();
    await page.waitForTimeout(2000);

    // Page 6: Accessories (Click original box if available, otherwise just continue)
    const boxBtn = await page.$('text="Original Box"');
    if (boxBtn) await boxBtn.click();
    const continueBtn4 = await page.$('text="Continue"');
    if (continueBtn4) await continueBtn4.click();
    await page.waitForTimeout(3000); // Wait for price calculation

    // Get Final Price
    const priceEl = await page.$('.amount'); // usually has class amount or similar
    let priceText = '';
    if (priceEl) {
      priceText = await priceEl.innerText();
    } else {
      // Find anything with ₹ symbol
      priceText = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const p = els.find(e => e.innerText && e.innerText.includes('₹') && e.innerText.length < 15);
        return p ? p.innerText : 'Not Found';
      });
    }

    return priceText;

  } catch (err) {
    console.error(err);
    return 'Error';
  } finally {
    if (page) await page.close();
    if (context) await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const sessionFile = path.join(__dirname, '../cashify-session.json');
  
  const tests = [
    { name: 'Flawless', cats: [], sub: {} },
    { name: 'Minor Scratches', cats: ['Broken/scratch on device screen'], sub: { screenSub: '1-2 scratches on screen' } },
    { name: 'Cracked Screen', cats: ['Broken/scratch on device screen'], sub: { screenSub: 'Screen cracked/ glass broken' } },
    { name: 'Body Dent', cats: ['Scratch/Dent on device body'], sub: { bodyDents: '1-2 minor dents', bodyScratches: 'No scratches' } }
  ];

  for (const t of tests) {
    console.log(`Running test: ${t.name}`);
    const price = await testCombination(browser, sessionFile, 'apple-iphone-15', '256 GB', {
      categories: t.cats,
      ...t.sub
    });
    console.log(`Result for ${t.name}: ${price}`);
  }

  await browser.close();
})();
