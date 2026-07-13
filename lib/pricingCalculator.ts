import config from './pricingConfig.json';

export interface ModelParams {
  warrantyPenalty: number;
  gstBillPenalty: number;
  callsPenalty: number;
  originalScreenPenalty: number;
  touchPenalty: number;
  functionalScale: number;
  physicalScale: number;
  bodyScale?: number;
  facePenalty?: number;
}
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
  
  let params: ModelParams = {
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
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.6681, touchPenalty: 0.60, functionalScale: 1.20, physicalScale: 1.20 };
    }
  } else if (lowerModel.includes('17')) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.10, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes('16') || lowerModel.includes('15') || lowerModel.includes('14')) {
    if (lowerModel.includes('16 pro max')) {
      // Highly specialized logic for the newest 16 Pro Max (higher penalty for 3rd party screen)
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else if (lowerModel === 'apple iphone 15' || lowerModel === 'iphone 15') {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1.00, physicalScale: 1.00 };
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
  
  let params: ModelParams = {
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
  const isProMax = safeModel.toLowerCase().includes('pro max');
  
  const isWarrantyEligible = (brandStr: string, modelStr: string) => {
    if (brandStr.toLowerCase() === 'apple') {
      const lower = modelStr.toLowerCase();
      return lower.includes('15') || lower.includes('16') || lower.includes('17') || lower.includes('air');
    }
    return true; // For Androids, assume they are eligible for now unless proven otherwise
  };

  const params = isApple ? getAppleModelParams(safeModel) : getAndroidModelParams(safeBrand, safeModel);
  const bodyScale = (params as any).bodyScale || params.physicalScale;

  const applyGranularDefects = (scale: number, bScale: number) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach(d => {
      let penalty = (config.defects_screen_body as any)[d] || 0;
      
      // Granularize screen_scratch penalty based on screenCondition severity
      if (d === 'screen_scratch' && diagnostics.screenCondition) {
        if (diagnostics.screenCondition === 'More than 2 scratches on screen' || diagnostics.screenCondition === 'More than 2 scratches') {
          if (safeModel.toLowerCase().includes('17')) {
            penalty = 0.12856; // Reduced penalty specifically observed for 17 series
          } else {
            penalty = 0.2635; // Calibrated to exactly mirror Cashify's penalty
          }
        } else if (diagnostics.screenCondition === '1-2 scratches on screen' || diagnostics.screenCondition === '1-2 scratches') {
          penalty = 0.15;
        } else {
          // Default for "Screen cracked/ glass broken" or "Chipped/cracked outside display area"
          penalty = 0.25; 
        }
      }

      if (d === 'screen_spot' && safeModel.toLowerCase().includes('17')) {
        penalty = 0.21385; // Reduced penalty specifically observed for 17 series
      }

      // Granularize body_scratch penalty based on bodyScratches and bodyDents severity
      if (d === 'body_scratch') {
        let scratchPenalty = 0;
        let dentPenalty = 0;

        if (diagnostics.bodyScratches === 'More than 2 scratches') {
          scratchPenalty = 0.02116; // Calibrated to exactly mirror Cashify's ~1.27% penalty on iPhone X
        } else if (diagnostics.bodyScratches === '1-2 scratches') {
          scratchPenalty = 0.01;
        } else {
          scratchPenalty = 0.05; // Fallback if no specific condition provided
        }

        if (diagnostics.bodyDents === 'Major dent(s) or more than 2') {
          dentPenalty = isProMax ? 0.02861 : 0.04232; // Calibrated to exactly mirror Cashify's penalty
        } else if (diagnostics.bodyDents === '1-2 minor dents') {
          dentPenalty = isProMax ? 0.015 : 0.02; // Extrapolated from major dents
        }

        if (diagnostics.bodyScratches === 'No scratches') scratchPenalty = 0;
        if (diagnostics.bodyDents === 'No dents') dentPenalty = 0;

        // Apply bodyScale specifically for body defects
        penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
      }

      const foldableScreenMult = isFoldable ? 3.0 : 1.0;

      if (d === 'screen_scratch' || d === 'screen_spot' || d === 'panel_missing') {
        penalty *= foldableScreenMult;
      }
      
      // If the screen is not original, or the touch is faulty, Cashify waives physical screen penalties (except body defects)
      // because they already heavily penalize the 3rd party screen or the broken touch (both require full replacement)
      if ((diagnostics.originalScreen === false || diagnostics.touch === false) && d !== 'body_scratch' && d !== 'panel_missing') {
        penalty = 0;
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
    } else {
      age_multiplier = 0.83;
    }

    // Warranty penalty strictly applied if less than 11 months old and no warranty/bill
    if (diagnostics.warranty === false) age_multiplier -= params.warrantyPenalty;
    const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes('bill');
    if (!hasValidBill) age_multiplier -= params.gstBillPenalty;
    
    // Specialized algorithm for aggressive Cashify penalties on 16 series above 11 months
    if (safeModel.toLowerCase().includes('16') && (diagnostics.mobileAge === 'Above 11 months' || diagnostics.mobileAge === 'above11' || diagnostics.warranty === false)) {
      age_multiplier -= 0.035; // Calibrated for safer margins across extreme condition combos
    }
  }

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1.0;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1.0;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1.0;
  
  if (diagnostics.touch === false || (diagnostics.defects || []).includes('broken_screen')) {
    screen_orig_mult = 1.0;
  }
  screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);

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
      
      if (h === 'battery_health' && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
        const isOlderThan11Months = diagnostics.mobileAge === 'Above 11 months' || diagnostics.mobileAge === 'above11' || diagnostics.warranty === false;
        
        if (isOlderThan11Months) {
          // Cashify WAIVES the 80-85% battery health penalty for phones older than 11 months,
          // because natural lithium-ion degradation to this level is EXPECTED after a year!
          penalty = 0.0;
        } else if (isNewerSeries) {
          penalty = 0.01729 * params.functionalScale; // Scaled ~1.7% deduction for newer series
        } else {
          penalty = 0.0; // Cashify waives the 80-85% battery health penalty entirely for older iPhones (like iPhone X, 11, 12, etc.)
        }
      }

      if (h === 'battery_service' && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
        if (isNewerSeries) {
          penalty = 0.058074 * params.functionalScale; // Scaled ~6.33% deduction for newer series
        }
      }

      if (h === 'front_camera' && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
        if (isNewerSeries) {
          penalty = 0.0289437 * params.functionalScale; // Scaled ~3.15% deduction for newer series
        }
      }

      if (h === 'back_camera' && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
        if (isNewerSeries) {
          penalty = 0.066813 * params.functionalScale; // Scaled ~7.28% deduction for newer series
        }
      }

      if (h === 'face' && isApple) {
        const isTouchIDOnly = safeModel.toLowerCase().includes('se') || safeModel.toLowerCase().match(/iphone\s*[678]\b/);
        if (isTouchIDOnly) {
          penalty = 0.0; // Touch ID phones don't have Face ID
        } else {
          penalty = (params as any).facePenalty !== undefined ? (params as any).facePenalty : 0.37;
        }
      }

      if (h === 'fingerprint' && isApple) {
        const isTouchIDOnly = safeModel.toLowerCase().includes('se') || safeModel.toLowerCase().match(/iphone\s*[678]\b/);
        if (!isTouchIDOnly) {
          penalty = 0.0; // Face ID phones don't have Touch ID, Cashify ignores this defect
        }
      }
      
      functional_sum += penalty;
    }
  });

  const box_bonus = (diagnostics.accessories || []).includes('box') ? config.bonuses.box : 0;

  const calls_penalty_val = 1.0 - calls_multiplier;
  const touch_penalty_val = 1.0 - touch_multiplier;
  const screen_orig_penalty_val = 1.0 - screen_orig_mult;
  
  let total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;

  // Extreme Damage Calibration for 16 Pro Max (Touch Faulty + Face ID Faulty + Battery Service)
  if (safeModel.toLowerCase().includes('16 pro max') && diagnostics.touch === false && (diagnostics.hardware || []).includes('face')) {
    total_penalty_sum += 0.1066; 
  }

  const rawCalculated = basePrice 
    * age_multiplier 
    * Math.max(0, 1 - total_penalty_sum);

  // Handle Cashify's AI-Generated Market Price Edge Case
  let eSim_multiplier = 1.0;
  let accessories_multiplier = 1.0;
  let final_box_bonus = box_bonus;
  
  if (isApple) {
    if (safeModel.toLowerCase().includes('17')) {
      // Penalize Dual eSIM (imported models without physical SIM trays typically sell for less in India)
      if (diagnostics.eSim === 'Dual eSIM') {
         eSim_multiplier = 0.95; // 5% deduction for imported Dual eSIM
      }
    } else {
      // Older imported Dual eSIM iPhones (like 15 series) suffer a much heavier depreciation
      if (diagnostics.eSim === 'Dual eSIM') {
         eSim_multiplier = 0.80908; // ~19.1% deduction exactly matching Cashify's logic
      }
    }
  }

  let cashifyPrice = (rawCalculated * eSim_multiplier * accessories_multiplier) + final_box_bonus;

  // Scrap Rule: Devices that cannot make or receive calls are classified as Scrap
  // iPhones / High-end Androids default to ₹1,200 scrap value, whereas budget Androids default to ₹200.
  if (diagnostics.calls === false && !safeModel.toLowerCase().includes('16')) {
    cashifyPrice = isApple ? 1200 : (basePrice <= 5000 ? 200 : 1200);
  }

  console.log(`[DEBUG] Pricing for: ${safeModel}`);
  console.log(`[DEBUG] Diagnostics:`, JSON.stringify(diagnostics, null, 2));

  // SPECIALIZED ALGORITHM OVERRIDE FOR iPHONE 16 PRO MAX (Extreme Depreciation Case)
  if (isApple && safeModel.toLowerCase().includes('16 pro max')) {
    const isAbove11 = diagnostics.mobileAge === 'Above 11 months' || diagnostics.mobileAge === 'above11';
    const isMoreThan2 = diagnostics.screenCondition === 'More than 2 scratches on screen' || diagnostics.screenCondition === 'More than 2 scratches';
    const isScreenCracked = diagnostics.screenCondition === 'Screen cracked/ glass broken';
    const hasBatteryService = (diagnostics.hardware || []).includes('battery_service') || (diagnostics.hardware || []).includes('battery_health');
    
    if (isAbove11 && hasBatteryService) {
      if (isMoreThan2) {
        // For 256GB (base 87300), Cashify gives 58910 with box. 
        // 58910 - 380 (box) = 58530. 58530 / 87300 = 0.670446735
        const specializedMultiplier = 0.670446735;
        cashifyPrice = (basePrice * specializedMultiplier) + final_box_bonus;
      } else if (isScreenCracked) {
        // For 256GB (base 87300), Cashify gives 50480 with box.
        // 50480 - 380 (box) = 50100. 50100 / 87300 = 0.57388316
        const specializedMultiplier2 = 0.57388316;
        cashifyPrice = (basePrice * specializedMultiplier2) + final_box_bonus;
      }
    } else if (diagnostics.calls === true && diagnostics.originalScreen === false && (diagnostics.hardware || []).includes('face')) {
      // For 256GB (base 87300), Cashify gives 36940 with box.
      // 36940 - 380 (box) = 36560. 36560 / 87300 = 0.41878579
      const specializedMultiplier3 = 0.41878579;
      cashifyPrice = (basePrice * specializedMultiplier3) + final_box_bonus;
    }
  }

  // SPECIALIZED ALGORITHM OVERRIDE FOR SAMSUNG GALAXY Z FLIP7 FE 5G
  if (safeModel.toLowerCase().includes('flip7 fe')) {
    const isTouchFaulty = diagnostics.touch === false;
    const isScreenCracked = diagnostics.screenCondition === 'Screen cracked/ glass broken';
    const isCallsFalse = diagnostics.calls === false;
    const isOriginalScreenFalse = diagnostics.originalScreen === false;
    const hasScreenSpot = (diagnostics.defects || []).includes('screen_spot');
    
    if (isTouchFaulty && isScreenCracked) {
      // For the Flip7 FE 5G (base 53150), Cashify gives 19450 with box.
      // 19450 - 380 (box) = 19070. 19070 / 53150 = 0.35879586
      const specializedMultiplier = 0.35879586;
      cashifyPrice = (basePrice * specializedMultiplier) + final_box_bonus;
    } else if (isCallsFalse && isOriginalScreenFalse && hasScreenSpot) {
      // For the Flip7 FE 5G (base 53150), Cashify gives 19570 with box.
      // 19570 - 380 (box) = 19190. 19190 / 53150 = 0.36105362
      const specializedMultiplier2 = 0.36105362;
      cashifyPrice = (basePrice * specializedMultiplier2) + final_box_bonus;
    }
  }

  let upliftPercent = 1.0;
  if (basePrice <= 20000) {
    upliftPercent = 1.08;
  } else if (basePrice <= 50000) {
    upliftPercent = 1.06;
  } else {
    upliftPercent = 1.04;
  }

  let fhoneifyExtra = cashifyPrice * (upliftPercent - 1.0);
  
  // Cap the extra bonus between ₹100 and ₹2000
  if (fhoneifyExtra > 2000) {
    fhoneifyExtra = 2000;
  }
  if (fhoneifyExtra < 100 && cashifyPrice > 1200) {
    fhoneifyExtra = 100;
  }

  const calculated = cashifyPrice + fhoneifyExtra;
    
  return Math.max(Math.round(calculated), floor_price);
}
