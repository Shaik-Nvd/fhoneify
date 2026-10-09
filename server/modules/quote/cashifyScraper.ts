if (process.env.NODE_ENV === 'production') {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright';
}
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import crypto from 'node:crypto';
import { createFileFinalQuoteLedger } from '../../../lib/pricing/finalQuoteLedger';
import { refreshFinalQuotes, CashifyCollectionBlocked } from '../../../lib/pricing/finalQuoteRefresh';
import { parseDiagnostics } from '../../../lib/pricing/diagnostics';
import { canonicalDiagnosticsHash } from '../../../lib/pricing/quoteToken';
import { findCatalogDevice } from '../../../lib/pricing/catalog';
import path from 'path';
import fs from 'fs';
import logger from '../../lib/logger';
import { verifyPageIdentity, splitHeading, parseVariant } from '../../../lib/referencePricing/sources/cashifyIdentity';
import { parseFinalSellingPrice, requireBooleanAnswer, requireEsimAnswer, cashifyBlockingTextReason, installCashifyCollectionGuards } from './cashifyFinalPriceGuard';

const SESSIONS_DIR = path.join(__dirname, '../../../cashify-sessions');

let globalBrowser: Browser | null = null;

/**
 * Resolves whether a caller's browser should have a visible window.
 *
 * Each caller states its own default rather than sharing one global:
 * scrapeCashifyPrice() keeps its original headed launch exactly as before
 * (changing an existing feature's behaviour as a side effect of adding a
 * scheduled job would be the wrong trade), while the scheduled reference
 * refresh defaults to headless because a CI runner has no display at all.
 *
 * CASHIFY_SCRAPER_HEADED=true forces a visible window for either path - the
 * local "solve a CAPTCHA by hand" mode.
 */
export function resolveHeadless(callerDefault: boolean): boolean {
  if (process.env.CASHIFY_SCRAPER_HEADED === 'true') return false;
  return callerDefault;
}

/** Every stored Cashify session, newest-first-agnostic. Shared by both the
 * on-demand market-price scrape and the scheduled reference refresh so there
 * is one definition of "where do sessions come from". */
export function getCashifySessionFiles(): string[] {
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

  return sessionFiles;
}

/** Boots the shared Chromium instance, or returns the existing one. The
 * instance is per-process, and the two callers never share a process (the API
 * server only runs scrapeCashifyPrice; the scheduled job only runs the
 * reference read), so each launches in the mode it asked for. */
export async function getCashifyBrowser(opts: { headless: boolean }): Promise<Browser> {
  if (!globalBrowser) {
    const headless = resolveHeadless(opts.headless);
    logger.info({ headless }, 'Launching new persistent Chromium instance...');
    globalBrowser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return globalBrowser;
}

/** Releases the shared Chromium instance. A long-lived server never needs
 * this, but a batch job MUST call it or the process will not exit. */
export async function closeCashifyBrowser(): Promise<void> {
  if (globalBrowser) {
    await globalBrowser.close().catch(() => {});
    globalBrowser = null;
  }
}

async function scrapeCashifyPriceAttempt(deviceDetails: { brand: string, model: string, storage: string, answers: any }) {
  let sessionFiles: string[] = getCashifySessionFiles();

  if (sessionFiles.length === 0) {
    throw new Error('Cashify sessions not found. Please run setup-cashify script first.');
  }

  // One session attempt only: a failure is charged, never hidden by session rotation.
  sessionFiles.sort();

  let lastError: Error | null = null;

  // Boot or reuse global browser. Headed, exactly as this function always
  // launched - see resolveHeadless().
  globalBrowser = await getCashifyBrowser({ headless: false });

  for (let i = 0; i < Math.min(sessionFiles.length, 1); i++) {
    const sessionFile = sessionFiles[i];
    logger.info(`[Attempt ${i+1}/${sessionFiles.length}] Using session: ${path.basename(sessionFile)}`);
    
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let blockedReason: string | null = null;
    let collectionGuard: Awaited<ReturnType<typeof installCashifyCollectionGuards>> | null = null;

    try {
      context = await globalBrowser.newContext({ storageState: sessionFile });
      page = await context.newPage();
      // Observe all questionnaire/API responses; abort subsequent requests after a block.
      collectionGuard = await installCashifyCollectionGuards(page);

      // Set a default timeout for all page actions
      page.setDefaultTimeout(45000);

    // Load the URL lookup dictionary (if it exists)
    let urlDictionary: Record<string, string> = {};
    try {
      const appleDictPath = path.join(__dirname, '../../data/apple_urls.json');
      if (fs.existsSync(appleDictPath)) {
        Object.assign(urlDictionary, JSON.parse(fs.readFileSync(appleDictPath, 'utf8')));
      }
      
      const samsungDictPath = path.join(__dirname, '../../data/samsung_urls.json');
      if (fs.existsSync(samsungDictPath)) {
        Object.assign(urlDictionary, JSON.parse(fs.readFileSync(samsungDictPath, 'utf8')));
      }

      const xiaomiDictPath = path.join(__dirname, '../../data/xiaomi_urls.json');
      if (fs.existsSync(xiaomiDictPath)) {
        Object.assign(urlDictionary, JSON.parse(fs.readFileSync(xiaomiDictPath, 'utf8')));
      }
    } catch (e) {
      logger.warn('Failed to load url dictionaries');
    }

    // Generate or lookup the direct Cashify device URL
    const brandLower = deviceDetails.brand.toLowerCase();
    const modelLower = deviceDetails.model.toLowerCase();
    const cleanModel = modelLower.startsWith(brandLower) 
      ? modelLower.substring(brandLower.length).trim()
      : modelLower;
    const modelKey = (brandLower + ' ' + cleanModel).toLowerCase().trim();
    const modelSlug = (brandLower + '-' + cleanModel).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if exact URL exists in our dictionary
    let deviceUrl = urlDictionary[modelKey];
    
    if (!deviceUrl) {
      // Fallback to generating it
      deviceUrl = `https://www.cashify.in/sell-old-mobile-phone/used-${modelSlug}`;
    }
    
    logger.info(`Navigating directly to Cashify device page: ${deviceUrl}`);

    // 1. Try going to cashify device page directly
    const response = await page.goto(deviceUrl, { waitUntil: 'domcontentloaded' });
    if ([401,403,429].includes(response?.status() ?? 0)) throw new Error('Authentication or blocked request; stop collection');
    
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

    const availableVariants = await page.evaluate(() => Array.from(document.querySelectorAll('body *'))
      .filter(e=>e.children.length===0 && /^\s*\d+(?:\.\d+)?\s*(?:GB|TB)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:GB|TB))?\s*$/i.test(e.textContent??''))
      .map(e=>(e.textContent??'').trim()));
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
        throw new Error('Exact storage variant not found; refusing to use a default variant');
      }
    }
      await page.waitForTimeout(1000);

      // --- FULL CASHIFY SIMULATION ---
      const answers = deviceDetails.answers || {};
      for (const field of ['calls','touch','originalScreen']) requireBooleanAnswer(answers,field);

      // PAGE 0: Select the right variant and click Get Exact Value
      let formattedStorage = deviceDetails.storage;
      if (deviceDetails.storage && deviceDetails.storage.match(/^[0-9]+[a-zA-Z]+$/)) {
        formattedStorage = deviceDetails.storage.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2');
      }
      const storageOptions = await page.$$(`text="${formattedStorage}"`);
      if (storageOptions.length > 0) {
        await storageOptions[0].click();
      }  
      
      const heading=await page.locator('h1').first().innerText();
      const embedded=splitHeading(heading).embeddedVariant;
      // A model-only heading is not proof that the requested chip became the selected variant.
      if(!embedded)throw new Error('Selected variant is not explicitly confirmed by the page heading');
      const wanted=parseVariant(deviceDetails.storage);
      const sameStorage=[...new Set(availableVariants.filter(v=>parseVariant(v).storage===wanted.storage).map(v=>v.replace(/\s+/g,'').toLowerCase()))];
      const identityCheck=verifyPageIdentity(deviceDetails,{url:page.url(),deviceName:heading,selectedVariant:embedded,priceText:'',availableVariants,
        variantResolvedBy:wanted.ram===null && sameStorage.length===1 ? 'unique-storage-chip' : 'url'});
      if(!identityCheck.ok)throw new Error(`Exact device identity rejected: ${identityCheck.evidence}`);
      const blockedText=await page.locator('body').innerText();
      blockedReason ??= collectionGuard.reason ?? cashifyBlockingTextReason(blockedText);
      if (blockedReason) throw new Error(blockedReason);

      // 1. Click Get Exact Value
      const getExactValueBtn = await page.$('text="Get Exact Value"');
      if (!getExactValueBtn) throw new Error('Get Exact Value button not found');
      if (getExactValueBtn) {
        await getExactValueBtn.click();
        
        // PAGE 1: Yes/No Questions
        await page.waitForSelector('text=Are you able to make and receive calls?', { timeout: 10000 });
        const questionModes: Record<string, 'ASKED' | 'NOT_ASKED'> = {};
        for (const [field, pattern, required] of [
          ['calls','make and receive calls',true], ['touch','touch screen working',true], ['originalScreen','screen original',true],
          ['warranty','manufacturer warranty',false], ['validBill','valid bill|GST bill',false],
        ] as const) {
          const shown = await page.locator('body').innerText();
          if (!new RegExp(pattern,'i').test(shown)) {
            if(required) throw new Error(`Required question ${field} not found`);
            questionModes[field]='NOT_ASKED'; continue;
          }
          const answer=requireBooleanAnswer(answers,field);
          const clicked=await page.evaluate(({pattern,answer})=>{
            const leaves=Array.from(document.querySelectorAll('body *')).filter(e=>e.children.length===0 && new RegExp(pattern,'i').test(e.textContent??''));
            if(leaves.length!==1)return false;
            let container:Element|null=leaves[0].parentElement;
            while(container && container!==document.body) {
              const yes=Array.from(container.querySelectorAll('button,label,[role="radio"]')).filter(e=>e.textContent?.trim()==='Yes');
              const no=Array.from(container.querySelectorAll('button,label,[role="radio"]')).filter(e=>e.textContent?.trim()==='No');
              if(yes.length===1 && no.length===1) { (answer?yes[0]:no[0] as HTMLElement).dispatchEvent(new MouseEvent('click',{bubbles:true}));return true; }
              if(yes.length>1||no.length>1)return false;
              container=container.parentElement;
            }
            return false;
          },{pattern,answer});
          if(!clicked)throw new Error(`Ambiguous or unsupported question container: ${field}`);
          questionModes[field]='ASKED';
        }
        
        // eSIM Question (if present)
        const singleEsimBtn = await page.$('text="Single eSIM"');
        const dualEsimBtn = await page.$('text="Dual eSIM"');
        if (singleEsimBtn && dualEsimBtn) {
          const eSim=requireEsimAnswer(answers.eSim);
          if (eSim === 'Dual eSIM') {
            await dualEsimBtn.click();
          } else {
            await singleEsimBtn.click();
          }
        }
        
        const continueBtn1 = await page.$('text="Continue"');
        if (continueBtn1) await continueBtn1.click();

        // PAGE 2: Screen/Body Defects
        await page.waitForTimeout(2000);
        
        if (answers.defects && (answers.defects.includes('broken_screen') || answers.defects.includes('screen_scratch'))) {
          const screenScratch = await page.$('text=Broken/scratch on device screen');
          if (screenScratch) await screenScratch.click();
        }
        if (answers.defects && answers.defects.includes('screen_spot')) {
          const screenSpot = await page.$('text="Dead Spot/Visible line and Discoloration on screen"');
          if (!screenSpot) {
             const screenSpotAlt = await page.$('text="Dead Spot/Visible line and Discoloration"');
             if (screenSpotAlt) await screenSpotAlt.click();
          } else {
             await screenSpot.click();
          }
        }
        if (answers.defects && answers.defects.includes('body_scratch')) {
          const bodyDent = await page.$('text=Scratch/Dent on device body');
          if (bodyDent) await bodyDent.click();
        }
        if (answers.defects && answers.defects.includes('panel_missing')) {
          const panelMissing = await page.$('text=Device panel missing/broken');
          if (panelMissing) await panelMissing.click();
        }
        
        const continueBtn2 = await page.$('text="Continue"');
        if (continueBtn2) await continueBtn2.click();

        // Handle possible SUB-PAGES for Screen/Body defects
        await page.waitForTimeout(2000);
        
        // Stage 3: Screen Physical Condition
        if (answers.defects && (answers.defects.includes('broken_screen') || answers.defects.includes('screen_scratch'))) {
          if (answers.screenCondition) {
            const opt = await page.$(`text="${answers.screenCondition}"`);
            if (!opt) throw new Error("Requested diagnostic option not found");
            await opt.click();
          }
          const contSub1 = await page.$('text="Continue"');
          if (contSub1) await contSub1.click();
          await page.waitForTimeout(2000);
        }
        
        // Stage 4: Dead Spots / Visible Lines / Discoloration
        if (answers.defects && answers.defects.includes('screen_spot')) {
          if (answers.screenSpots) {
            const spotBtn = await page.$(`text="${answers.screenSpots}"`);
            if (!spotBtn) throw new Error("Requested diagnostic option not found");
            await spotBtn.click();
          }
          if (answers.screenLines) {
            const lineBtn = await page.$(`text="${answers.screenLines}"`);
            if (!lineBtn) throw new Error("Requested diagnostic option not found");
            await lineBtn.click();
          }
          if (answers.screenDiscoloration) {
            const discBtn = await page.$(`text="${answers.screenDiscoloration}"`);
            if (!discBtn) throw new Error("Requested diagnostic option not found");
            await discBtn.click();
          }
          const contSub2 = await page.$('text="Continue"');
          if (contSub2) await contSub2.click();
          await page.waitForTimeout(2000);
        }
        
        // Stage 5: Body Defects (Scratches/Dents)
        if (answers.defects && answers.defects.includes('body_scratch')) {
          if (answers.bodyScratches) {
            const bScratch = await page.$(`text="${answers.bodyScratches}"`);
            if (!bScratch) throw new Error("Requested diagnostic option not found");
            await bScratch.click();
          }
          if (answers.bodyDents) {
            const bDent = await page.$(`text="${answers.bodyDents}"`);
            if (!bDent) throw new Error("Requested diagnostic option not found");
            await bDent.click();
          }
          const contSub3 = await page.$('text="Continue"');
          if (contSub3) await contSub3.click();
          await page.waitForTimeout(2000);
        }
        
        // Stage 6: Body Defects (Panel/Bent)
        if (answers.defects && answers.defects.includes('panel_missing')) {
          if (answers.bodyPanel) {
            const bPanel = await page.$(`text="${answers.bodyPanel}"`);
            if (!bPanel) throw new Error("Requested diagnostic option not found");
            await bPanel.click();
          }
          if (answers.bodyBent) {
            const bBent = await page.$(`text="${answers.bodyBent}"`);
            if (!bBent) throw new Error("Requested diagnostic option not found");
            await bBent.click();
          }
          const contSub4 = await page.$('text="Continue"');
          if (contSub4) await contSub4.click();
          await page.waitForTimeout(2000);
        }

        // PAGE 3: Functional Defects
        await page.waitForTimeout(2000);
        if (answers.hardware && answers.hardware.length > 0) {
          const hardwareMap: Record<string, string> = {
            'front_camera': 'Front Camera not working',
            'back_camera': 'Back Camera not working',
            'volume': 'Volume Button not working',
            'fingerprint': 'Finger Touch not working',
            'wifi': 'WiFi not working',
            'speaker': 'Speaker Faulty',
            'silent': 'Silent Button not working',
            'face': 'Face Sensor not working',
            'power': 'Power Button not working',
            'charging': 'Charging Port not working',
            'audio_receiver': 'Audio Receiver not working',
            'camera_glass': 'Camera Glass Broken',
            'microphone': 'Microphone not working',
            'bluetooth': 'Bluetooth not working',
            'vibrator': 'Vibrator is not working',
            'proximity': 'Proximity Sensor not working',
            'battery_service': 'Battery in Service (Health < 80%)',
            'battery_health': 'Battery Health 80-85%'
          };

          for (const hwId of answers.hardware) {
            if (!hardwareMap[hwId]) throw new Error(`Unknown hardware fault: ${hwId}`);
            if (hardwareMap[hwId]) {
              const el = await page.$(`text="${hardwareMap[hwId]}"`);
              if (!el) throw new Error("Requested diagnostic option not found");
            await el.click();
            }
          }
        }
        const continueBtn3 = await page.$('text="Continue"');
        if (continueBtn3) await continueBtn3.click();
        
        // PAGE 4: Accessories
        await page.waitForTimeout(2000);
        if (answers.accessories && answers.accessories.length > 0) {
          if (answers.accessories.includes('charger')) {
            const charger = await page.$('text=Original Charger of device');
            if (!charger) throw new Error('Requested charger option not found');
            await charger.click();
          }
          if (answers.accessories.includes('box')) {
            const box = await page.$('text=Box with same IMEI');
            if (!box) throw new Error('Requested box option not found');
            await box.click();
          }
        }
        if (answers.accessories?.includes('spen')) {
          const pen=await page.getByText(/original s.?pen/i).first();
          if(!await pen.isVisible())throw new Error('Requested S Pen option not found');
          await pen.click();
        }
        const continueBtn4 = await page.$('text="Continue"');
        if (continueBtn4) await continueBtn4.click();
        
        // PAGE 5: Mobile Age (if warranty is true / age question is shown)
        await page.waitForTimeout(2000);
        const agePageTitle = await page.$('text=What is your mobile age?');
        if (agePageTitle || (answers.warranty === true && answers.validBill === true)) {
          if (!['below3','3to6','6to11','above11'].includes(answers.mobileAge)) throw new Error('Explicit mobile age answer required');
          let ageText = 'Above 11 months';
          if (answers.mobileAge === 'below3') ageText = 'Below 3 months';
          else if (answers.mobileAge === '3to6') ageText = '3 months - 6 months';
          else if (answers.mobileAge === '6to11') ageText = '6 months - 11 months';
          
          const ageBtn = await page.$(`text="${ageText}"`);
          if (ageBtn) {
            await ageBtn.click();
          } else {
            throw new Error('Requested mobile age option not found');
          }
        }

        // Final calculation wait
        await page.waitForTimeout(4000);
      }

      // No Get Upto, voucher or first-currency fallback is acceptable.
      const finalText = await page.locator('body').innerText();
      blockedReason ??= collectionGuard.reason ?? cashifyBlockingTextReason(finalText);
      if (blockedReason) throw new Error(blockedReason);
      const numericPrice = parseFinalSellingPrice(finalText);
      if (numericPrice === null) throw new Error('One unambiguous final Selling price was not found');
      const priceText = `Selling price ₹${numericPrice}`;

    return {
      price: numericPrice,
      rawText: priceText,
      success: true,
      // This legacy cross-check helper has no persisted selected-state trace. Never import it as verified pricing evidence.
      verifiedEvidence: false
    };

    } catch (error: any) {
      // A late challenge may otherwise look like a selector timeout. Preserve the durable campaign stop.
      blockedReason ??= collectionGuard?.reason ?? null;
      if (!blockedReason && page) {
        try { blockedReason = cashifyBlockingTextReason(await page.locator('body').innerText({ timeout: 2000 })); } catch { /* Original failure still applies. */ }
      }
      if (blockedReason) error = new Error(blockedReason);
      logger.warn({ err: error.message }, `Scraping failed with session ${path.basename(sessionFile)}`);
      lastError = error;
      if (/captcha|sign.?in|log.?in|authentication|access denied|blocked/i.test(error.message ?? '')) break;
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

/** Reuses the existing browser walker, with a durable campaign budget and serial pacing.
 * Disabled until a NEW explicit campaign ceiling is configured. Result remains an unverified cross-check. */
export async function scrapeCashifyPrice(deviceDetails: { brand: string; model: string; storage: string; answers: unknown }) {
  const ceiling=Number(process.env.CASHIFY_FINAL_QUOTE_MAX_ATTEMPTS ?? 0);
  const campaign=process.env.CASHIFY_FINAL_QUOTE_CAMPAIGN;
  if(!campaign || !Number.isSafeInteger(ceiling) || ceiling<=0) return {success:false as const,error:'No authorized final-quote collection campaign configured'};
  const parsed=parseDiagnostics(deviceDetails.answers);
  const device=findCatalogDevice(deviceDetails.brand,deviceDetails.model,deviceDetails.storage);
  if(!parsed.ok || !device) return {success:false as const,error:'Exact catalog variant and valid diagnostics required'};
  const key=crypto.createHash('sha256').update(`${device.brand}|${device.model}|${device.storage}|${canonicalDiagnosticsHash(parsed.value)}`).digest('hex');
  let ledger;
  try { ledger=createFileFinalQuoteLedger(process.env.CASHIFY_FINAL_QUOTE_LEDGER_DIR ?? path.join(__dirname,'../../../scratch/final-quote-campaigns'),campaign); }
  catch { return {success:false as const,error:'Collection worker already active or campaign ledger unavailable'}; }
  let captured: Awaited<ReturnType<typeof scrapeCashifyPriceAttempt>> | undefined;
  try {
    const interval=Number(process.env.CASHIFY_FINAL_QUOTE_MIN_INTERVAL_MS ?? 30000);
    const result=await refreshFinalQuotes({jobs:[{key,priority:1,device,diagnostics:parsed.value}],authorizedAttempts:ceiling,minStartIntervalMs:interval,ledger,
      fetch:async()=>{
        const r=await scrapeCashifyPriceAttempt({...device,answers:parsed.value});
        if(!r.success){if(/captcha|auth|blocked|access denied/i.test(r.error??''))throw new CashifyCollectionBlocked(r.error);throw new Error(r.error);}
        captured=r;return {id:key};
      },accept:async()=>{}});
    return captured ?? {success:false as const,error:`Collection stopped: ${result.stopped}`};
  } finally {ledger.release();}
}
