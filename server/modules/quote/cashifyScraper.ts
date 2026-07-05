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
        if (['image', 'media', 'font'].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Set a default timeout for all page actions
      page.setDefaultTimeout(45000);

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
      await page.waitForTimeout(1000);

      // --- FULL CASHIFY SIMULATION ---
      const answers = deviceDetails.answers || {};

      // PAGE 0: Select the right variant and click Get Exact Value
      let formattedStorage = deviceDetails.storage;
      if (deviceDetails.storage && deviceDetails.storage.match(/^[0-9]+[a-zA-Z]+$/)) {
        formattedStorage = deviceDetails.storage.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2');
      }
      const storageOptions = await page.$$(`text="${formattedStorage}"`);
      if (storageOptions.length > 0) {
        await storageOptions[0].click();
      }  
      
      // 1. Click Get Exact Value
      const getExactValueBtn = await page.$('text="Get Exact Value"');
      if (getExactValueBtn) {
        await getExactValueBtn.click();
        
        // PAGE 1: Yes/No Questions
        await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 10000 });
        const yesBtns = await page.$$('text="Yes"');
        const noBtns = await page.$$('text="No"');
        
        if (yesBtns.length >= 3 && noBtns.length >= 3) {
          // Calls
          if (answers.calls === false) await noBtns[0].click(); else await yesBtns[0].click();
          // Touch screen
          if (answers.touch === false) await noBtns[1].click(); else await yesBtns[1].click();
          // Original screen
          if (answers.originalScreen === false) await noBtns[2].click(); else await yesBtns[2].click();
          
          // Warranty (may or may not be present)
          if (yesBtns.length >= 4 && noBtns.length >= 4) {
            if (answers.mobileAge === '>11' || answers.warranty === false) await noBtns[3].click(); else await yesBtns[3].click();
          }
          
          // GST bill (if present)
          if (yesBtns.length > 4) {
            if (answers.validBill === false) await noBtns[4].click(); else await yesBtns[4].click();
          }
        }
        
        const continueBtn1 = await page.$('text="Continue"');
        if (continueBtn1) await continueBtn1.click();

        // PAGE 2: Screen/Body Defects
        await page.waitForTimeout(2000);
        
        if (answers.defects && answers.defects.includes('broken_screen')) {
          const screenScratch = await page.$('text=Broken/scratch on device screen');
          if (screenScratch) await screenScratch.click();
        }
        
        if (answers.defects && (answers.defects.includes('body_dent') || answers.defects.includes('body_scratch'))) {
          const bodyDent = await page.$('text=Scratch/Dent on device body');
          if (bodyDent) await bodyDent.click();
        }
        
        const continueBtn2 = await page.$('text="Continue"');
        if (continueBtn2) await continueBtn2.click();

        // Handle possible SUB-PAGES for Screen/Body defects
        await page.waitForTimeout(2000);
        const subPageScreen = await page.$('text=Tell us more about your device screen defects');
        if (subPageScreen) {
          if (answers.defects && answers.defects.includes('broken_screen')) {
            const cracked = await page.$('text=Screen cracked/ glass broken');
            if (cracked) await cracked.click();
          } else {
            const scratches = await page.$('text=1-2 scratches on screen');
            if (scratches) await scratches.click();
          }
          const contSub1 = await page.$('text="Continue"');
          if (contSub1) await contSub1.click();
          await page.waitForTimeout(2000);
        }

        const subPageBody = await page.$('text=Tell us more about your device body defects');
        if (subPageBody) {
          if (answers.defects && answers.defects.includes('body_dent')) {
            const dent = await page.$('text=Dent'); // Assuming "Dent" is an option, will fallback to scratch if not
            if (dent) await dent.click();
            else {
              const bodyDented = await page.$$('text=Dent');
              if (bodyDented.length > 0) await bodyDented[0].click();
            }
          } else {
            const scratches = await page.$('text=1-2 scratches on device body');
            if (scratches) await scratches.click();
            else {
              const genericScratch = await page.$$('text=scratch');
              if (genericScratch.length > 0) await genericScratch[0].click();
            }
          }
          const contSub2 = await page.$('text="Continue"');
          if (contSub2) await contSub2.click();
          await page.waitForTimeout(2000);
        }

        // PAGE 3: Functional Defects
        await page.waitForTimeout(2000);
        if (answers.hardware && answers.hardware.length > 0) {
          if (answers.hardware.includes('front_camera')) {
            const frontCam = await page.$('text=Front Camera not working');
            if (frontCam) await frontCam.click();
          }
          if (answers.hardware.includes('back_camera')) {
            const backCam = await page.$('text=Back Camera not working');
            if (backCam) await backCam.click();
          }
          if (answers.hardware.includes('battery')) {
            const battery = await page.$('text=Battery faulty');
            if (battery) await battery.click();
          }
          if (answers.hardware.includes('wifi')) {
            const wifi = await page.$('text=WiFi not working');
            if (wifi) await wifi.click();
          }
        }
        const continueBtn3 = await page.$('text="Continue"');
        if (continueBtn3) await continueBtn3.click();
        
        // PAGE 4: Accessories
        await page.waitForTimeout(2000);
        if (answers.accessories && answers.accessories.length > 0) {
          if (answers.accessories.includes('charger')) {
            const charger = await page.$('text=Original Charger of device');
            if (charger) await charger.click();
          }
          if (answers.accessories.includes('box')) {
            const box = await page.$('text=Box with same IMEI');
            if (box) await box.click();
          }
        }
        const continueBtn4 = await page.$('text="Continue"');
        if (continueBtn4) await continueBtn4.click();
        
        // Final calculation wait
        await page.waitForTimeout(4000);
      }

      // Extract final price from the page
      const priceText = await page.evaluate(() => {
        // Try to find the Selling price explicitly
        const sellingPriceLabel = Array.from(document.querySelectorAll('*'))
          .find(el => el.textContent?.trim().includes('Selling price'));
        
        if (sellingPriceLabel) {
          // Look for the next element containing ₹
          let curr = sellingPriceLabel.nextElementSibling;
          while (curr) {
            if (curr.textContent?.includes('₹')) return curr.textContent.trim();
            curr = curr.nextElementSibling;
          }
          // If not next sibling, search in parent's next sibling
          let parent = sellingPriceLabel.parentElement;
          if (parent && parent.nextElementSibling) {
            if (parent.nextElementSibling.textContent?.includes('₹')) {
              return parent.nextElementSibling.textContent.trim();
            }
          }
        }
        
        // Fallback: get the FIRST element with ₹ that isn't a voucher (which are usually later)
        const priceElements = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4, h5, h6'))
          .filter(el => {
            const text = el.textContent?.trim() || '';
            return text.includes('₹') && text.length < 15;
          });
        return priceElements.length > 0 ? priceElements[0].textContent?.trim() : null;
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
