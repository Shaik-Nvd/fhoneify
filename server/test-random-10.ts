import { scrapeCashifyPrice } from './modules/quote/cashifyScraper';
import config from '../lib/pricingConfig.json';
import cashifyPrices from '../lib/cashify_prices.json';

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

async function runTests() {
  const brand = 'Apple';
  const model = 'Apple iPhone 15';
  const storage = '128GB';
  
  const lookupKey = `${model}-${storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const baseMarketPrice = (cashifyPrices as any)[lookupKey] || 40000;

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

  for (let i = 1; i <= 3; i++) {
    // Generate Random Inputs
    const answers = {
      calls: Math.random() > 0.1,
      touch: Math.random() > 0.2,
      originalScreen: Math.random() > 0.2,
      warranty: Math.random() > 0.5,
      mobileAge: ['below3', '3to6', '6to11', 'above11'][Math.floor(Math.random() * 4)] as 'below3' | '3to6' | '6to11' | 'above11',
      defects: getRandomSubset(ALL_DEFECTS, 2),
      hardware: getRandomSubset(ALL_HARDWARE, 3),
      accessories: getRandomSubset(ALL_ACCESSORIES, 3),
      validBill: Math.random() > 0.5,
    };

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
    console.log(`\n--- Test ${i}/10 ---`);
    console.log(`Scraping Cashify for random inputs...`);
    
    try {
      const res = await scrapeCashifyPrice({ brand, model, storage, answers });
      if (!res.success) throw new Error(res.error);
      const cashifyPrice = res.data;
      
      console.log(`Fhone Calculated Price: ₹${fhonePrice}`);
      console.log(`Cashify Actual Price:   ₹${cashifyPrice}`);
      
      const diff = Math.abs(fhonePrice - cashifyPrice);
      const diffPercent = ((diff / cashifyPrice) * 100).toFixed(2);
      
      if (fhonePrice === cashifyPrice) {
        console.log(`Result: PERFECT MATCH ✅`);
      } else if (diffPercent < '5.00') {
        console.log(`Result: DIFF ₹${diff} (${diffPercent}%) ⚠️ (Within 5% margin)`);
      } else {
        console.log(`Result: DIFF ₹${diff} (${diffPercent}%) ❌`);
      }
    } catch (err: any) {
      console.error(`Error scraping test ${i}: ${err.message}`);
    }
  }
}

runTests();
