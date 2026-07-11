import config from './pricingConfig.json';

export type DiagnosticsType = {
  calls: boolean | null;
  touch: boolean | null;
  originalScreen: boolean | null;
  defects: string[];
  screenCondition: string | null;
  screenSpots: string | null;
  screenLines: string | null;
  screenDiscoloration: string | null;
  bodyScratches: string | null;
  bodyDents: string | null;
  bodyPanel: string | null;
  bodyBent: string | null;
  hardware: string[];
  accessories: string[];
  warranty: boolean | null;
  validBill: boolean | null;
  eSim: string | null;
  mobileAge: string | null;
};

export const getAppleModelParams = (model: string) => {
  const lowerModel = String(model || '').toLowerCase();
  
  let params = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.70,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15,
  };

  const isPro = lowerModel.includes('pro');
  const isProMax = lowerModel.includes('pro max');
  const isPlus = lowerModel.includes('plus');
  
  params = {
    warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.50, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.15, physicalScale: 1.15,
  };

  if (lowerModel.includes('17e')) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.50, physicalScale: 1.50 };
  } else if (lowerModel.includes('16e')) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.50, physicalScale: 1.50 };
  } else if (lowerModel.includes('14')) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 1.25, physicalScale: 1.25 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.6681, touchPenalty: 0.60, functionalScale: 1.20, physicalScale: 1.20 };
    }
  } else if (lowerModel.includes('17')) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 1.25, physicalScale: 1.25 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.50, functionalScale: 1.20, physicalScale: 1.20 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.50, functionalScale: 1.15, physicalScale: 1.15 };
    }
  } else if (lowerModel.includes('16') || lowerModel.includes('15') || lowerModel.includes('14')) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.50, functionalScale: 1.09, physicalScale: 1.09 };
    } else if (isPro || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.00, physicalScale: 1.00 };
    }
  } else if (lowerModel.includes('13') || lowerModel.includes('se (2022') || lowerModel.includes('se 2022')) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.55, touchPenalty: 0.50, functionalScale: 0.85, physicalScale: 0.85 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.52, functionalScale: 0.80, physicalScale: 0.80 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.6610, touchPenalty: 0.4781, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else if (lowerModel.includes('12')) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.15, physicalScale: 1.15 };
    } else {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.75, touchPenalty: 0.60, functionalScale: 0.65, physicalScale: 0.85 };
    }
  } else if (lowerModel.includes('11') || lowerModel.includes('se (2020') || lowerModel.includes('se 2020')) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.78, touchPenalty: 0.60, functionalScale: 0.85, physicalScale: 0.85 };
    }
  } else if (lowerModel.includes('xs') || lowerModel.includes('xr') || lowerModel.includes('x')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.62, originalScreenPenalty: 0.71, touchPenalty: 0.40, functionalScale: 0.6, physicalScale: 0.6,
    };
  } else if (lowerModel.includes('8') || lowerModel.includes('7') || lowerModel.includes('6') || lowerModel.includes('se')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.65, originalScreenPenalty: 0.82, touchPenalty: 0.50, functionalScale: 0.5, physicalScale: 0.5,
    };
  }

  return params;
};

export const getAndroidModelParams = (brand: string, model: string) => {
  const lowerBrand = String(brand || '').toLowerCase();
  const lowerModel = String(model || '').toLowerCase();
  
  let params = {
    warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.75,
  };

  if (lowerBrand === 'samsung') {
    const isS = lowerModel.includes('galaxy s') || lowerModel.includes('s2') || lowerModel.includes('s1') || lowerModel.includes('s9') || lowerModel.includes('s8');
    const isZ = lowerModel.includes('fold') || lowerModel.includes('flip');
    const isNote = lowerModel.includes('note');
    if (isS || isZ || isNote) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.30, functionalScale: 1.10, physicalScale: 1.10 };
    } else {
      params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else if (lowerBrand === 'oneplus') {
    const isPro = lowerModel.includes('pro');
    const isFold = lowerModel.includes('open') || lowerModel.includes('fold');
    const isNord = lowerModel.includes('nord') || lowerModel.includes('ce');
    if (isPro || isFold) {
      params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.95, physicalScale: 0.95 };
    } else if (isNord) {
      params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.65, physicalScale: 0.65 };
    } else {
      params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.85, physicalScale: 0.80 };
    }
  } else if (lowerBrand === 'xiaomi' || lowerBrand === 'poco') {
    const isPremium = lowerModel.includes('pro') || lowerModel.includes('ultra') || lowerModel.includes('fold');
    const isBudget = lowerModel.includes('redmi') || lowerModel.includes('poco c') || lowerModel.includes('poco m');
    if (isPremium) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.80 };
    } else if (isBudget) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.65, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
    } else {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.70, physicalScale: 0.65 };
    }
  } else if (lowerBrand === 'vivo' || lowerBrand === 'oppo' || lowerBrand === 'iqoo') {
    const isPremium = lowerModel.includes('pro') || lowerModel.includes('find n') || lowerModel.includes('fold') || lowerModel.includes('x-series') || lowerModel.includes(' x');
    const isBudget = lowerModel.includes(' y') || lowerModel.includes(' a') || lowerModel.includes('a-series');
    if (isPremium) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.80 };
    } else if (isBudget) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
    } else {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.70, physicalScale: 0.65 };
    }
  } else if (lowerBrand === 'google' || lowerBrand === 'nothing' || lowerBrand === 'asus' || lowerBrand === 'huawei') {
    params = {
      warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.75,
    };
  } else {
    params = {
      warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.70,
    };
  }

  return params;
};

export function calculateFhoneifyPrice(
  brand: string,
  model: string,
  basePrice: number,
  diagnostics: DiagnosticsType
): number {
  if (!basePrice) return 0;
  
  const floor_price = config.modelFloorPrice; 
  let age_multiplier = 1.0;
  let calls_multiplier = 1.0;
  let touch_multiplier = 1.0;
  let screen_orig_mult = 1.0;
  let screen_body_sum = 0;
  let functional_sum = 0;

  const safeBrand = String(brand || '');
  const safeModel = String(model || '');
  const isApple = safeBrand.toLowerCase() === 'apple';
  const isFoldable = safeModel.toLowerCase().includes('fold') || safeModel.toLowerCase().includes('flip') || safeModel.toLowerCase().includes('open');
  
  const isWarrantyEligible = (brandStr: string, modelStr: string) => {
    if (brandStr.toLowerCase() === 'apple') {
      const lower = modelStr.toLowerCase();
      return lower.includes('15') || lower.includes('16') || lower.includes('17') || lower.includes('air');
    }
    return true; // For Androids, assume they are eligible for now unless proven otherwise
  };

  const params = isApple ? getAppleModelParams(safeModel) : getAndroidModelParams(safeBrand, safeModel);

  const applyGranularDefects = (scale: number) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach(d => {
      let penalty = (config.defects_screen_body as any)[d] || 0;
      
      // Granularize screen_scratch penalty based on screenCondition severity
      if (d === 'screen_scratch' && diagnostics.screenCondition) {
        if (diagnostics.screenCondition === 'More than 2 scratches on screen' || diagnostics.screenCondition === 'More than 2 scratches') {
          penalty = 0.2685; // Calibrated to exactly mirror Cashify's ~16% penalty on iPhone X
        } else if (diagnostics.screenCondition === '1-2 scratches on screen' || diagnostics.screenCondition === '1-2 scratches') {
          penalty = 0.15;
        } else {
          // Default for "Screen cracked/ glass broken" or "Chipped/cracked outside display area"
          penalty = 0.35; 
        }
      }

      const foldableScreenMult = isFoldable ? 3.0 : 1.0;

      if (d === 'screen_scratch' || d === 'screen_spot' || d === 'panel_missing') {
        penalty *= foldableScreenMult;
      }
      
      sum += penalty * scale;
    });
    return sum;
  };

  if (!isWarrantyEligible(safeBrand, safeModel)) {
    // If not warranty eligible, the scraped base price is ALREADY the >11 months price!
    age_multiplier = 1.0;
  } else {
    // It is warranty eligible (e.g. iPhone 15/16/17), so DB price is the flawless "Below 3 months" price
    age_multiplier = (config.ageBonus as any)['above11'] || 0.7966; // Default to above11
    
    if (diagnostics.warranty === false) {
      if (isApple && (safeModel.toLowerCase().includes('16e') || safeModel.toLowerCase().includes('17e'))) {
        age_multiplier = 0.75305;
      } else {
        age_multiplier = (config.ageBonus as any)['above11'] || 0.7966;
      }
    } else if (diagnostics.mobileAge) {
      if (diagnostics.mobileAge === 'Below 3 months' || diagnostics.mobileAge === 'below3') {
        age_multiplier = (config.ageBonus as any)['below3'] || 1.0;
      } else if (diagnostics.mobileAge === '3 months - 6 months' || diagnostics.mobileAge === '3to6') {
        age_multiplier = (config.ageBonus as any)['3to6'] || 0.9427;
      } else if (diagnostics.mobileAge === '6 months - 11 months' || diagnostics.mobileAge === '6to11') {
        age_multiplier = (config.ageBonus as any)['6to11'] || 0.9114;
      } else {
        age_multiplier = (config.ageBonus as any)['above11'] || 0.7966;
      }
    }

    // Warranty penalty strictly applied if less than 11 months old and no warranty/bill
    const isLessThan11Months = diagnostics.warranty !== false && diagnostics.mobileAge !== 'Above 11 months' && diagnostics.mobileAge !== 'above11';
    if (isLessThan11Months) {
      if (!diagnostics.warranty) age_multiplier -= params.warrantyPenalty;
      const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes('bill');
      if (!hasValidBill) age_multiplier -= params.gstBillPenalty;
    }
  }

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1.0;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1.0;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1.0;
  
  if (diagnostics.touch === false || (diagnostics.defects || []).includes('broken_screen')) {
    screen_orig_mult = 1.0;
  }
  screen_body_sum = applyGranularDefects(params.physicalScale);

  if (isFoldable && diagnostics.originalScreen === false) {
    screen_orig_mult = Math.min(screen_orig_mult, 0.35);
  }

  const hardwareList = diagnostics.hardware || [];
  hardwareList.forEach(h => { 
    if (h in config.defects_functional) {
      if (h === 'battery_health' && diagnostics.warranty === true) {
        return; // Cashify waives the battery health penalty if the phone is under warranty
      }
      let penalty = (config.defects_functional as any)[h] * params.functionalScale;
      
      // Cashify only deducts a tiny flat amount (~900 INR, approx 1.6%) for battery health on iPhone 15 series
      if (h === 'battery_health' && isApple && safeModel.toLowerCase().includes('15')) {
        penalty = 0.016; 
      }
      
      functional_sum += penalty;
    }
  });

  const box_bonus = (diagnostics.accessories || []).includes('box') ? config.bonuses.box : 0;

  const rawCalculated = basePrice 
    * age_multiplier 
    * calls_multiplier 
    * touch_multiplier 
    * screen_orig_mult 
    * (1 - Math.min(screen_body_sum, 1)) 
    * (1 - Math.min(functional_sum, 1));

  let upliftPercent = 1.04;
  if (basePrice <= 20000) {
    upliftPercent = 1.08;
  } else if (basePrice <= 50000) {
    upliftPercent = 1.06;
  } else {
    upliftPercent = 1.04;
  }

  // Handle Cashify's AI-Generated Market Price Edge Case
  let eSim_multiplier = 1.0;
  let final_box_bonus = box_bonus;
  
  if (isApple) {
    // If the box is missing on an iPhone, strictly deduct exactly 1,000
    if (!diagnostics.accessories?.includes('box')) {
       final_box_bonus = -1000;
    } else {
       final_box_bonus = 0; // Box is expected by default for iPhones in the base price
    }

    if (safeModel.toLowerCase().includes('17')) {
      // Penalize Dual eSIM (imported models without physical SIM trays typically sell for less in India)
      if (diagnostics.eSim === 'Dual eSIM') {
         eSim_multiplier = 0.95; // 5% deduction for imported Dual eSIM
      }
    }
  }

  const calculated = (rawCalculated * upliftPercent * eSim_multiplier) + final_box_bonus;
    
  return Math.max(Math.round(calculated), floor_price);
}
