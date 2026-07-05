import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import logger from '../../lib/logger';

const SESSIONS_DIR = path.join(__dirname, '../../../cashify-sessions');

let globalBrowser: Browser | null = null;

export async function scrapeCashifyPrice(deviceDetails: { brand: string, model: string, storage: string, answers: any }) {
  let sessionFiles: string[] = [];
  
  if (fs.existsSync(SESSIONS_DIR)) {
    sessionFiles = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SESSIONS_DIR, f));
  }
  
  // Backwards compatibility for the old single session file
  const oldSessionFile = path.join(__dirname, '../../../cashify-session.json');
  if (fs.existsSync(oldSessionFile) && sessionFiles.length === 0) {
    sessionFiles = [oldSessionFile];
  }

  if (sessionFiles.length === 0) {
    throw new Error('Cashify sessions not found. Please run setup-cashify script first.');
  }

  // Randomly rotate sessions by shuffling the array
  sessionFiles.sort(() => Math.random() - 0.5);

  let lastError: Error | null = null;
  
  // Boot or reuse global browser
  if (!globalBrowser) {
    logger.info('Launching new persistent Chromium instance...');
    globalBrowser = await chromium.launch({ headless: true });
  }

  for (let i = 0; i < sessionFiles.length; i++) {
    const sessionFile = sessionFiles[i];
    logger.info(`[Attempt ${i+1}/${sessionFiles.length}] Using session: ${path.basename(sessionFile)}`);
    
    let context: BrowserContext | null = null;

    try {
      context = await globalBrowser.newContext({ storageState: sessionFile });
      const page = await context.newPage();

      // Block heavy resources (images, css, fonts) for lightning fast loads
      await page.route('**/*', route => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Set a default timeout
      page.setDefaultTimeout(15000);

    // Load the URL lookup dictionary (if it exists)
    let urlDictionary: Record<string, string> = {};
    try {
      const dictPath = path.join(__dirname, '../../data/apple_urls.json');
      if (fs.existsSync(dictPath)) {
        urlDictionary = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      }
    } catch (e) {
      logger.warn('Failed to load url dictionary');
    }

    // Generate or lookup the direct Cashify device URL
    const cleanModel = deviceDetails.model.toLowerCase().startsWith(deviceDetails.brand.toLowerCase()) 
      ? deviceDetails.model 
      : `${deviceDetails.brand} ${deviceDetails.model}`;
    const modelKey = cleanModel.toLowerCase().trim();
    const modelSlug = modelKey.replace(/[^a-z0-9]+/g, '-');
    
    // Check if exact URL exists in our dictionary
    let deviceUrl = urlDictionary[modelKey];
    
    if (!deviceUrl) {
      // Fallback to generating it
      deviceUrl = `https://www.cashify.in/sell-old-mobile-phone/used-${modelSlug}`;
    }
    
    logger.info(`Navigating directly to Cashify device page: ${deviceUrl}`);

    // 1. Try going to cashify device page directly
    const response = await page.goto(deviceUrl, { waitUntil: 'domcontentloaded' });
    
    // If it's 404, it might be a model naming mismatch (e.g. SE 2020 vs SE 2). Try fallback search.
    if (response?.status() === 404 || response?.status() === 500) {
      logger.warn(`Direct URL ${deviceUrl} failed. Falling back to search...`);
      const searchQuery = encodeURIComponent(`${cleanModel}`);
      await page.goto(`https://www.cashify.in/search?q=${searchQuery}`, { waitUntil: 'domcontentloaded' });
      
      try {
        const firstResult = await page.waitForSelector('a[href*="/sell-old-mobile-phone/"]', { timeout: 10000, state: 'visible' });
        await page.waitForTimeout(1000); 
        await firstResult?.click();
        await page.waitForLoadState('domcontentloaded');
      } catch (e) {
        throw new Error(`Device not found on Cashify. They may not support selling the ${deviceDetails.model}.`);
      }
    }

    // 3. Click the storage variant to reveal the price
    try {
      const spacedStorage = deviceDetails.storage.replace(/(\d+)([a-zA-Z]+)/, '$1 $2');
      const variantBtn = await page.waitForSelector(`text=${spacedStorage}`, { timeout: 5000 });
      await variantBtn?.click();
    } catch (e) {
      try {
        const variantBtn = await page.waitForSelector(`text=${deviceDetails.storage}`, { timeout: 5000 });
        await variantBtn?.click();
      } catch (err) {
        logger.warn('Could not find storage variant to click. Price might not appear.');
      }
    }
    
    // Wait for price to render
    await page.waitForTimeout(3000);

    // Extract price from the page
    // We look for elements containing the ₹ symbol or "Selling price"
    const priceText = await page.evaluate(() => {
      // Find elements that look like a large price
      const priceElements = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4, h5, h6'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          return text.includes('₹') && text.length < 15;
        });
      
      if (priceElements.length > 0) {
        // Assume the first one with the highest font size or just the first one is the price
        return priceElements[0].textContent?.trim();
      }
      return null;
    });

    if (!priceText) {
      throw new Error('Could not extract price from the page.');
    }

    // Parse the price text (e.g., "₹1,200" -> 1200)
    const numericPrice = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

    return {
      price: numericPrice,
      rawText: priceText,
      success: true
    };

    } catch (error: any) {
      logger.warn({ err: error.message }, `Scraping failed with session ${path.basename(sessionFile)}`);
      lastError = error;
      // Loop will continue and try the next session!
    } finally {
      if (context) await context.close();
    }
  }

  // If we reach here, all sessions failed
  logger.error('All available Cashify sessions failed.');
  return {
    success: false,
    error: lastError?.message || 'Failed to scrape price across all sessions'
  };
}
