import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from '../lib/pricingConfig.json';
import cashifyPrices from '../lib/cashify_prices.json';

puppeteer.use(StealthPlugin());

const ALL_DEFECTS = ['screen_scratch', 'screen_spot', 'panel_missing', 'body_scratch'];
const ALL_HARDWARE = [
  'fingerprint', 'battery_service', 'battery_health', 'front_camera', 'back_camera',
  'wifi', 'speaker', 'audio_receiver', 'charging', 'microphone', 'face', 'volume',
  'power', 'camera_glass', 'bluetooth', 'silent', 'vibrator', 'proximity'
];
const ALL_ACCESSORIES = ['box', 'bill', 'charger'];

function getRandomSubset(arr: string[], maxItems: number) {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (maxItems + 1)));
}

async function scrapeCashifyPriceDirect(model: string, storage: string, answers: any) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.cashify.in/sell-old-mobile-phone', { waitUntil: 'networkidle2' });
    
    // Select Brand
    await page.waitForSelector(`img[alt="Apple"]`, { timeout: 10000 });
    await page.click(`img[alt="Apple"]`);
    
    // Select Model
    await page.waitForSelector('input[placeholder="Search your model"]');
    await page.type('input[placeholder="Search your model"]', model);
    await page.waitForTimeout(1000);
    const modelItem = await page.$(`text="${model}"`);
    if (modelItem) {
        await modelItem.click();
    } else {
        const firstResult = await page.$('ul > li.cursor-pointer');
        if (firstResult) await firstResult.click();
    }
    
    // Select Storage
    await page.waitForTimeout(1000);
    const storageBtn = await page.$(`text="${storage}"`);
    if (storageBtn) await storageBtn.click();
    
    await page.waitForTimeout(2000);
    const getExactValueBtn = await page.$('text="Get Exact Value"');
    if (getExactValueBtn) await getExactValueBtn.click();
    
    await page.waitForTimeout(2000);
    const gotItBtn = await page.$('text="Got It"');
    if (gotItBtn) await gotItBtn.click();
    
    await page.waitForTimeout(2000);
    
    // 1. Calls/Touch/Original Screen
    if (answers.calls === false) await page.click('text="Able to Make and Receive Calls"');
    if (answers.touch === false) await page.click('text="Are there any issues with your device screen?"');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // 2. Defects (Body/Screen)
    if (answers.defects.includes('screen_scratch')) {
        const btn = await page.$('text="Scratches on Screen"');
        if (btn) await btn.click();
    }
    if (answers.defects.includes('screen_spot')) {
        const btn = await page.$('text="Spots / Lines on Screen"');
        if (btn) await btn.click();
    }
    if (answers.defects.includes('body_scratch')) {
        const btn = await page.$('text="Scratches / Dents on body"');
        if (btn) await btn.click();
    }
    if (answers.defects.includes('panel_missing')) {
        const btn = await page.$('text="Panel Missing / Broken"');
        if (btn) await btn.click();
    }
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // 3. Hardware (Functional)
    for (const h of answers.hardware) {
        let text = '';
        switch(h) {
            case 'front_camera': text = 'Front Camera not working'; break;
            case 'back_camera': text = 'Back Camera not working'; break;
            case 'volume': text = 'Volume Button not working'; break;
            case 'fingerprint': text = 'Finger Touch not working'; break;
            case 'wifi': text = 'WiFi not working'; break;
            case 'speaker': text = 'Speaker Faulty'; break;
            case 'silent': text = 'Silent Button not working'; break;
            case 'face': text = 'Face Sensor not working'; break;
            case 'power': text = 'Power Button not working'; break;
            case 'charging': text = 'Charging Port not working'; break;
            case 'audio_receiver': text = 'Audio Receiver not working'; break;
            case 'camera_glass': text = 'Camera Glass Broken'; break;
            case 'microphone': text = 'Microphone not working'; break;
            case 'bluetooth': text = 'Bluetooth not working'; break;
            case 'vibrator': text = 'Vibrator is not working'; break;
            case 'proximity': text = 'Proximity Sensor not working'; break;
            case 'battery_service': text = 'Battery in Service (Health is less than 80%)'; break;
            case 'battery_health': text = 'Battery Health 80-85%'; break;
        }
        if (text) {
            const btn = await page.$(`text="${text}"`);
            if (btn) await btn.click();
        }
    }
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // 4. Accessories
    if (answers.accessories.includes('box')) {
        const btn = await page.$('text="Original Box"');
        if (btn) await btn.click();
    }
    if (answers.accessories.includes('charger')) {
        const btn = await page.$('text="Original Charger"');
        if (btn) await btn.click();
    }
    if (answers.accessories.includes('bill')) {
        const btn = await page.$('text="Valid Bill"');
        if (btn) await btn.click();
    }
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // 5. Age
    let ageText = '';
    switch(answers.mobileAge) {
        case 'below3': ageText = 'Below 3 months'; break;
        case '3to6': ageText = '3 months - 6 months'; break;
        case '6to11': ageText = '6 months - 11 months'; break;
        case 'above11': ageText = 'Above 11 months'; break;
    }
    if (ageText) {
        const btn = await page.$(`text="${ageText}"`);
        if (btn) await btn.click();
    }
    await page.waitForTimeout(3000);
    
    // Get Price
    const priceElement = await page.$('.final-price-class'); // Using a generic selector, let's just grab the biggest number on screen
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
  } catch (error) {
    console.error('Scraper error:', error);
    return null;
  } finally {
    await browser.close();
  }
}

async function runTests() {
  const model = 'Apple iPhone 15';
  const storage = '128GB';
  
  const lookupKey = `${model}-${storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const baseMarketPrice = (cashifyPrices as any)[lookupKey] || 1000;

  let upliftedBasePrice = baseMarketPrice;
  if (baseMarketPrice <= 20000) {
    upliftedBasePrice = baseMarketPrice * 1.08;
  } else if (baseMarketPrice <= 50000) {
    upliftedBasePrice = baseMarketPrice * 1.06;
  } else {
    upliftedBasePrice = baseMarketPrice * 1.04;
  }

  const realStartPrice = Math.round(upliftedBasePrice);
  console.log(`Base Price for ${model} ${storage}: ₹${realStartPrice}`);

  for (let i = 1; i <= 3; i++) { // Running 3 tests to avoid taking forever
    // Generate Random Inputs
    const answers = {
      calls: Math.random() > 0.1,
      touch: Math.random() > 0.2,
      originalScreen: Math.random() > 0.2,
      warranty: Math.random() > 0.5,
      mobileAge: ['below3', '3to6', '6to11', 'above11'][Math.floor(Math.random() * 4)] as 'below3' | '3to6' | '6to11' | 'above11',
      defects: getRandomSubset(ALL_DEFECTS, 1),
      hardware: getRandomSubset(ALL_HARDWARE, 2),
      accessories: getRandomSubset(ALL_ACCESSORIES, 2),
      validBill: Math.random() > 0.5,
    };
    
    console.log(`\n--- Test ${i}/3 ---`);
    console.log('Inputs:', JSON.stringify(answers));

    // --- CALCULATE FHONE INTERNAL PRICE ---
    const floor_price = config.modelFloorPrice;
    let age_multiplier = config.multipliers.warranty_no;
    const hasValidBill = answers.validBill === true || answers.accessories.includes('bill');
    if (answers.warranty && hasValidBill && answers.mobileAge) {
      age_multiplier = (config.ageBonus as any)[answers.mobileAge] || 1.0;
    }

    const calls_multiplier = answers.calls === false ? config.multipliers.calls_no : 1.0;
    const touch_multiplier = answers.touch === false ? config.multipliers.touch_no : 1.0;
    const screen_orig_mult = answers.originalScreen === false ? config.multipliers.originalScreen_no : 1.0;

    let screen_body_sum = 0;
    answers.defects.forEach((d) => {
      if (d in config.defects_screen_body) {
        screen_body_sum += (config.defects_screen_body as any)[d];
      }
    });

    let functional_sum = 0;
    answers.hardware.forEach((h) => {
      if (h in config.defects_functional) {
        functional_sum += (config.defects_functional as any)[h];
      }
    });

    const box_bonus = answers.accessories.includes('box') ? config.bonuses.box : 0;

    const calculated = realStartPrice 
      * age_multiplier 
      * calls_multiplier 
      * touch_multiplier 
      * screen_orig_mult 
      * (1 - Math.min(screen_body_sum, 1)) 
      * (1 - Math.min(functional_sum, 1)) 
      + box_bonus;

    const fhonePrice = Math.max(Math.round(calculated), floor_price);

    // --- GET CASHIFY PRICE ---
    console.log(`Scraping Cashify...`);
    
    try {
      const cashifyPrice = await scrapeCashifyPriceDirect(model, storage, answers);
      
      console.log(`Fhone Calculated Price: ₹${fhonePrice}`);
      console.log(`Cashify Actual Price:   ₹${cashifyPrice || 'undefined'}`);
      
      if (cashifyPrice) {
          const diff = Math.abs(fhonePrice - cashifyPrice);
          const diffPercent = ((diff / cashifyPrice) * 100).toFixed(2);
          
          if (fhonePrice === cashifyPrice) {
            console.log(`Result: PERFECT MATCH ✅`);
          } else if (parseFloat(diffPercent) < 5.00) {
            console.log(`Result: DIFF ₹${diff} (${diffPercent}%) ⚠️ (Within 5% margin)`);
          } else {
            console.log(`Result: DIFF ₹${diff} (${diffPercent}%) ❌`);
          }
      }
    } catch (err: any) {
      console.error(`Error scraping test ${i}: ${err.message}`);
    }
  }
}

runTests();
