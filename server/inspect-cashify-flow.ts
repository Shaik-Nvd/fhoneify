import { chromium } from 'playwright';

async function inspectModel(modelSlug: string) {
  console.log(`\n==================================================`);
  console.log(`Inspecting Cashify flow for: ${modelSlug}`);
  console.log(`==================================================`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Block heavy resources
  await page.route('**/*', route => {
    if (['image', 'media', 'font'].includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    const url = `https://www.cashify.in/sell-old-mobile-phone/used-${modelSlug}`;
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the storage button and click it
    console.log('Waiting for 128 GB or 256 GB button...');
    let storageBtn = await page.$('text="128 GB"');
    if (!storageBtn) {
      storageBtn = await page.$('text="256 GB"');
    }
    if (storageBtn) {
      await storageBtn.click();
      console.log('Clicked storage button.');
    } else {
      console.log('Storage button not found, proceeding...');
    }

    // Click "Get Exact Value"
    console.log('Waiting for Get Exact Value button...');
    const exactValueBtn = await page.waitForSelector('text="Get Exact Value"', { timeout: 10000 });
    await exactValueBtn.click();
    console.log('Clicked Get Exact Value.');

    // Wait for the first question to appear
    console.log('Waiting for Page 1 questions to appear...');
    await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dump all questions and options on the first page
    const questionsAndOptions = await page.evaluate(() => {
      const results: { question: string; options: string[] }[] = [];
      const elements = Array.from(document.querySelectorAll('*'));
      
      const questionTexts = [
        'Are you able to make and receive calls?',
        'Is your device\'s touch screen working properly?',
        'Is your phone\'s screen original?',
        'Is your device under manufacturer warranty?',
        'Do you have GST valid bill with the same IMEI?',
        'How many eSIMs does your device support?'
      ];

      for (const qt of questionTexts) {
        const found = elements.find(el => el.textContent?.trim() === qt || el.textContent?.trim().includes(qt));
        if (found) {
          results.push({
            question: qt,
            options: []
          });
        }
      }
      return results;
    });

    console.log('\n--- QUESTIONS FOUND ---');
    console.log(JSON.stringify(questionsAndOptions, null, 2));

  } catch (err: any) {
    console.error(`Error inspecting ${modelSlug}:`, err);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspectModel('apple-iphone-14');
  await inspectModel('apple-iphone-14-pro');
}

run();
