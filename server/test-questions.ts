import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function checkQuestions(brand: string, model: string, storage: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.cashify.in/sell-old-mobile-phone', { waitUntil: 'networkidle2' });
    
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
    
    // We are now on the first question page (usually Calls/Touch/Original Screen)
    // Let's get all the question headings on this page
    const questions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h3, h2, h4, .text-lg, .font-semibold')).map(el => el.textContent?.trim()).filter(Boolean);
    });
    
    console.log(`\nQuestions for ${model}:`);
    console.log(questions);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

async function run() {
    await checkQuestions('Apple', 'Apple iPhone 7', '32GB');
    await checkQuestions('Apple', 'Apple iPhone 15', '128GB');
}

run();
