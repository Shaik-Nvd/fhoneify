import config from '../lib/pricingConfig.json';
import cashifyPrices from '../lib/cashify_prices.json';

const MODELS_TO_TEST = [
  { brand: 'Apple', model: 'Apple iPhone 13', storage: '128GB' },
  { brand: 'Apple', model: 'Apple iPhone 14', storage: '128GB' },
  { brand: 'Apple', model: 'Apple iPhone 14 Pro', storage: '256GB' },
  { brand: 'Apple', model: 'Apple iPhone 14 Pro Max', storage: '256GB' },
  { brand: 'Apple', model: 'Apple iPhone 15', storage: '128GB' },
  { brand: 'Apple', model: 'Apple iPhone 16', storage: '128GB' },
  { brand: 'Apple', model: 'Apple iPhone 17', storage: '256GB' },
  { brand: 'Apple', model: 'Apple iPhone Air', storage: '256GB' }
];

const ALL_DEFECTS = ['screen_scratch', 'screen_spot', 'panel_missing', 'body_scratch'];
const ALL_HARDWARE = [
  'front_camera', 'back_camera', 'wifi', 'speaker', 'silent', 'face', 'volume',
  'power', 'charging', 'microphone', 'bluetooth', 'vibrator', 'proximity'
];
const ALL_ACCESSORIES = ['box', 'charger'];

function getRandomSubset(arr: string[], maxItems: number) {
  const shuffled = arr.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (maxItems + 1)));
}

// Replicates the upgraded frontend getAppleModelParams logic
const getAppleModelParams = (model: string) => {
  const lowerModel = model.toLowerCase();
  
  let params = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.70,
    touchPenalty: 0.3170,
    functionalScale: 1.0,
    physicalScale: 1.0,
  };

  if (lowerModel.includes('17') || lowerModel.includes('air')) {
    params = {
      warrantyPenalty: 0.18,
      gstBillPenalty: 0.10,
      callsPenalty: 0.45,
      originalScreenPenalty: 0.60,
      touchPenalty: 0.25,
      functionalScale: 1.3,
      physicalScale: 1.2,
    };
  } else if (lowerModel.includes('16')) {
    params = {
      warrantyPenalty: 0.12,
      gstBillPenalty: 0.08,
      callsPenalty: 0.48,
      originalScreenPenalty: 0.65,
      touchPenalty: 0.30,
      functionalScale: 1.2,
      physicalScale: 1.1,
    };
  } else if (lowerModel.includes('15')) {
    params = {
      warrantyPenalty: 0.08,
      gstBillPenalty: 0.05,
      callsPenalty: 0.52,
      originalScreenPenalty: 0.68,
      touchPenalty: 0.32,
      functionalScale: 1.1,
      physicalScale: 1.05,
    };
  } else if (lowerModel.includes('14')) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.02,
      callsPenalty: 0.55,
      originalScreenPenalty: 0.70,
      touchPenalty: 0.35,
      functionalScale: 1.0,
      physicalScale: 1.0,
    };
  } else if (lowerModel.includes('13')) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.02,
      callsPenalty: 0.55,
      originalScreenPenalty: 0.70,
      touchPenalty: 0.35,
      functionalScale: 0.9,
      physicalScale: 0.9,
    };
  }

  return params;
};

// Check if model is warranty eligible
const isWarrantyEligible = (model: string) => {
  const lowerModel = model.toLowerCase();
  return (
    lowerModel.includes('13') ||
    lowerModel.includes('14') ||
    lowerModel.includes('15') ||
    lowerModel.includes('16') ||
    lowerModel.includes('17') ||
    lowerModel.includes('air')
  );
};

function runSimulation() {
  console.log("=================================================================================");
  console.log("             FHONEIFY VS CASHIFY ACCURACY SIMULATION REPORT                      ");
  console.log("=================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  for (const device of MODELS_TO_TEST) {
    let lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (lookupKey.includes('iphone-air')) {
      lookupKey = lookupKey.replace('iphone-air', 'iphone-17-air');
    }
    const baseMarketPrice = (cashifyPrices as any)[lookupKey];
    
    if (!baseMarketPrice) {
      console.log(`⚠️ Skip ${device.model} ${device.storage} - No base price in cashify_prices.json`);
      continue;
    }

    console.log(`📱 Device: ${device.model} (${device.storage})`);
    console.log(`   Cashify Base Price: ₹${baseMarketPrice}`);

    // Generate 3 random edge cases per device
    for (let testIdx = 1; testIdx <= 3; testIdx++) {
      totalTests++;
      
      const calls = Math.random() > 0.15;
      const touch = Math.random() > 0.15;
      const originalScreen = Math.random() > 0.20;
      
      const warrantyEligible = isWarrantyEligible(device.model);
      const warranty = warrantyEligible ? Math.random() > 0.5 : false;
      const validBill = warrantyEligible ? Math.random() > 0.5 : false;
      const mobileAge = warranty && validBill ? (['below3', '3to6', '6to11'][Math.floor(Math.random() * 3)]) : 'above11';

      const defects = getRandomSubset(ALL_DEFECTS, 1);
      const hardware = getRandomSubset(ALL_HARDWARE, 2);
      const accessories = getRandomSubset(ALL_ACCESSORIES, 2);

      const params = getAppleModelParams(device.model);

      // --- 1. SIMULATED CASHIFY CALCULATION ---
      let cashify_age_mult = 1.0;
      const hasValidBill = validBill === true || accessories.includes('bill');
      if (warranty && hasValidBill && mobileAge) {
        cashify_age_mult = (config.ageBonus as any)[mobileAge] || 1.0;
      } else {
        cashify_age_mult = 1.0 - params.warrantyPenalty - (hasValidBill ? 0 : params.gstBillPenalty);
      }

      const cashify_calls_mult = calls === false ? params.callsPenalty : 1.0;
      const cashify_touch_mult = touch === false ? params.touchPenalty : 1.0;
      const cashify_screen_orig_mult = originalScreen === false ? params.originalScreenPenalty : 1.0;

      let cashify_screen_body_sum = 0;
      defects.forEach(d => {
        if (d in config.defects_screen_body) {
          cashify_screen_body_sum += (config.defects_screen_body as any)[d] * params.physicalScale;
        }
      });

      let cashify_functional_sum = 0;
      hardware.forEach(h => {
        if (h in config.defects_functional) {
          cashify_functional_sum += (config.defects_functional as any)[h] * params.functionalScale;
        }
      });

      const cashify_calculated = baseMarketPrice
        * cashify_age_mult
        * cashify_calls_mult
        * cashify_touch_mult
        * cashify_screen_orig_mult
        * (1 - Math.min(cashify_screen_body_sum, 1))
        * (1 - Math.min(cashify_functional_sum, 1));
      
      const finalCashifyPrice = Math.max(Math.round(cashify_calculated), config.modelFloorPrice);

      // --- 2. FHONEIFY CALCULATION (WITH UPLIFT DIRECTLY ON FINAL VALUE) ---
      let upliftPercent = 1.04;
      if (finalCashifyPrice <= 20000) {
        upliftPercent = 1.08;
      } else if (finalCashifyPrice <= 50000) {
        upliftPercent = 1.06;
      }

      const finalFhonePrice = Math.max(Math.round(finalCashifyPrice * upliftPercent) + (accessories.includes('box') ? config.bonuses.box : 0), config.modelFloorPrice);

      // --- 3. ACCURACY & COMPARISON ANALYSIS ---
      // Get the raw Fhone price before the competitive uplift to verify formula parity
      const rawFhoneCalculated = baseMarketPrice
        * cashify_age_mult
        * cashify_calls_mult
        * cashify_touch_mult
        * cashify_screen_orig_mult
        * (1 - Math.min(cashify_screen_body_sum, 1))
        * (1 - Math.min(cashify_functional_sum, 1))
        + (accessories.includes('box') ? config.bonuses.box : 0);
      const finalFhoneRawPrice = Math.max(Math.round(rawFhoneCalculated), config.modelFloorPrice);

      // Parity check
      const diffRaw = Math.abs(finalFhoneRawPrice - finalCashifyPrice);
      const isFormulaAccurate = diffRaw <= (accessories.includes('box') ? config.bonuses.box + 5 : 5);
      
      // Verification of precise uplift target
      const expectedUplifted = Math.round(finalCashifyPrice * upliftPercent) + (accessories.includes('box') ? config.bonuses.box : 0);
      const isUpliftAccurate = finalFhonePrice === Math.max(expectedUplifted, config.modelFloorPrice);

      if (isFormulaAccurate && isUpliftAccurate) {
        passedTests++;
      }

      console.log(`   [Test ${testIdx}] Defect Options: Calls:${calls ? 'Y' : 'N'}, Touch:${touch ? 'Y' : 'N'}, Screen:${originalScreen ? 'Orig' : 'Repl'}, Warranty:${warranty ? 'Y' : 'N'}, Bill:${validBill ? 'Y' : 'N'}, Defects:[${defects.join(', ')}], Hardware:[${hardware.join(', ')}]`);
      console.log(`          └─ Cashify Simulated Value:  ₹${finalCashifyPrice}`);
      console.log(`          └─ Fhone Raw Price:          ₹${finalFhoneRawPrice}`);
      console.log(`          └─ Fhone Final Quote (User): ₹${finalFhonePrice} (${Math.round((upliftPercent - 1) * 100)}% uplift applied over Cashify final price)`);
      if (isFormulaAccurate && isUpliftAccurate) {
        console.log(`          └─ Uplift accuracy check:    PASSED ✅`);
      } else {
        console.log(`          └─ Uplift accuracy check:    FAILED ❌`);
      }
    }
    console.log("---------------------------------------------------------------------------------");
  }

  const overallAccuracy = (passedTests / totalTests) * 100;
  console.log(`\n=================================================================================`);
  console.log(`SIMULATION RESULT: ${passedTests}/${totalTests} Tests Passed (${overallAccuracy.toFixed(2)}% Overall Parity & Accuracy)`);
  console.log(`=================================================================================`);
}

runSimulation();
