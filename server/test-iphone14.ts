import { chromium } from 'playwright';

async function checkQuestions(brand: string, model: string, storage: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.cashify.in/sell-old-mobile-phone', { waitUntil: 'networkidle' });
    
    // Select Brand
    await page.waitForSelector(`img[alt="${brand}"]`, { timeout: 10000 });
    await page.click(`img[alt="${brand}"]`);
    
    // Select Model
    await page.waitForSelector('input[placeholder="Search your model"]');
    await page.type('input[placeholder="Search your model"]', model);
    await page.waitForTimeout(2000);
    const modelItem = await page.$(`text="${model}"`);
    if (modelItem) {
        await modelItem.click();
    } else {
        const firstResult = await page.$('ul > li.cursor-pointer');
        if (firstResult) await firstResult.click();
    }
    
    // Select Storage
    await page.waitForTimeout(2000);
    const storageBtn = await page.$(`text="${storage}"`);
    if (storageBtn) await storageBtn.click();
    
    await page.waitForTimeout(2000);
    const getExactValueBtn = await page.$('text="Get Exact Value"');
    if (getExactValueBtn) await getExactValueBtn.click();
    
    // Check questions on Got it page
    await page.waitForTimeout(2000);
    const gotItBtn = await page.$('text="Got It"');
    if (gotItBtn) await gotItBtn.click();
    
    await page.waitForTimeout(2000);
    
    // We are on page 1
    const yesBtns = await page.$$('text="Yes"');
    if (yesBtns.length > 0) {
        await yesBtns[0].click(); // Calls yes
        await yesBtns[1].click(); // Screen yes
        await yesBtns[2].click(); // Body yes
        if (yesBtns.length >= 4) await yesBtns[3].click();
        if (yesBtns.length >= 5) await yesBtns[4].click();
    }
    const cont1 = await page.$('text="Continue"');
    if (cont1) await cont1.click();

    await page.waitForTimeout(2000);
    // Page 2 (Screen defects)
    const cont2 = await page.$('text="Continue"');
    if (cont2) await cont2.click();

    await page.waitForTimeout(2000);
    // Page 3 (Body defects)
    const cont3 = await page.$('text="Continue"');
    if (cont3) await cont3.click();

    await page.waitForTimeout(2000);
    // Page 4 (Functional defects)
    console.log(`\nChecking Functional page for ${model}:`);
    const questions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h3, h2, h4, .text-lg, .font-semibold, .card-title, span')).map(el => el.textContent?.trim()).filter(Boolean);
    });
    
    console.log(questions);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

async function run() {
    await checkQuestions('Apple', 'Apple iPhone 14', '128GB');
}

run();
