import { chromium } from 'playwright';

const iphoneModels = [
  'apple-iphone-xr',
  'apple-iphone-xs',
  'apple-iphone-xs-max',
  'apple-iphone-11',
  'apple-iphone-11-pro',
  'apple-iphone-11-pro-max',
  'apple-iphone-12',
  'apple-iphone-12-mini',
  'apple-iphone-12-pro',
  'apple-iphone-12-pro-max',
  'apple-iphone-13',
  'apple-iphone-13-mini',
  'apple-iphone-13-pro',
  'apple-iphone-13-pro-max',
  'apple-iphone-14',
  'apple-iphone-14-plus',
  'apple-iphone-14-pro',
  'apple-iphone-14-pro-max',
  'apple-iphone-15',
  'apple-iphone-15-plus',
  'apple-iphone-15-pro',
  'apple-iphone-15-pro-max',
  'apple-iphone-16',
  'apple-iphone-16-plus',
  'apple-iphone-16-pro',
  'apple-iphone-16-pro-max'
];

async function inspectEsim(modelSlug: string) {
  const browser = await chromium.launch({ headless: true });
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
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Select storage variant using stable locator click with fallback
    try {
      await page.locator('text="128 GB"').first().click({ timeout: 4000 });
    } catch {
      try {
        await page.locator('text="256 GB"').first().click({ timeout: 4000 });
      } catch {
        try {
          await page.locator('text="64 GB"').first().click({ timeout: 4000 });
        } catch {
          // ignore if none found
        }
      }
    }

    // Click "Get Exact Value"
    const exactValueBtn = page.locator('text="Get Exact Value"');
    await exactValueBtn.click({ timeout: 10000 });

    // Wait for the first question
    await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const hasEsim = await page.evaluate(() => {
      return document.body.textContent?.includes('How many eSIMs') || false;
    });

    const hasWarranty = await page.evaluate(() => {
      return document.body.textContent?.includes('under manufacturer warranty') || false;
    });

    console.log(`Model: ${modelSlug} => Has eSIM: ${hasEsim}, Has Warranty: ${hasWarranty}`);
  } catch (err: any) {
    console.log(`Model: ${modelSlug} => Failed: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  // Concurrency limit of 3 to prevent DOM detachment from resource starvation
  const chunks: string[][] = [];
  const chunkSize = 3;
  for (let i = 0; i < iphoneModels.length; i += chunkSize) {
    chunks.push(iphoneModels.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(m => inspectEsim(m)));
  }
}

run();
