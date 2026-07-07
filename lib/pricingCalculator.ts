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

  const isPro = lowerModel.includes('pro');
  const isProMax = lowerModel.includes('pro max');
  const isPlus = lowerModel.includes('plus');
  
  params = {
    warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.50, originalScreenPenalty: 0.70, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.0,
  };

  if (lowerModel.includes('17e')) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.35, functionalScale: 0.55, physicalScale: 0.55 };
  } else if (lowerModel.includes('17') || lowerModel.includes('16') || lowerModel.includes('15') || lowerModel.includes('14')) {
    if (isProMax || (isPlus && lowerModel.includes('17'))) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.55, touchPenalty: 0.25, functionalScale: 0.75, physicalScale: 0.75 };
    } else if (isPro || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.30, functionalScale: 0.70, physicalScale: 0.70 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.65, physicalScale: 0.65 };
    }
  } else if (lowerModel.includes('13') || lowerModel.includes('se (2022') || lowerModel.includes('se 2022')) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.55, touchPenalty: 0.25, functionalScale: 0.70, physicalScale: 0.70 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.30, functionalScale: 0.65, physicalScale: 0.65 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.35, functionalScale: 0.60, physicalScale: 0.60 };
    }
  } else if (lowerModel.includes('12')) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.0 };
    } else {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.75, touchPenalty: 0.40, functionalScale: 0.5, physicalScale: 0.7 };
    }
  } else if (lowerModel.includes('11') || lowerModel.includes('se (2020') || lowerModel.includes('se 2020')) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.9 };
    } else {
      params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.78, touchPenalty: 0.40, functionalScale: 0.7, physicalScale: 0.7 };
    }
  } else if (lowerModel.includes('xs') || lowerModel.includes('xr') || lowerModel.includes('x')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.62, originalScreenPenalty: 0.80, touchPenalty: 0.45, functionalScale: 0.6, physicalScale: 0.6,
    };
  } else if (lowerModel.includes('8') || lowerModel.includes('7') || lowerModel.includes('6') || lowerModel.includes('se')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.65, originalScreenPenalty: 0.82, touchPenalty: 0.50, functionalScale: 0.5, physicalScale: 0.5,
    };
  }

  return params;
};

export const getAndroidModelParams = (brand: string, model: string) => {
  const lowerBrand = brand.toLowerCase();
  const lowerModel = model.toLowerCase();
  
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

  const applyGranularDefects = (scale: number) => {
    let sum = 0;
    diagnostics.defects.forEach(d => {
      let penalty = (config.defects_screen_body as any)[d] || 0;
      if (d === 'screen_scratch' && diagnostics.screenCondition) {
        if (diagnostics.screenCondition === 'Chipped/cracked outside display area') penalty = 0.20;
        else if (diagnostics.screenCondition === 'More than 2 scratches on screen') penalty = 0.15;
        else if (diagnostics.screenCondition === '1-2 scratches on screen') penalty = 0.08;
      }
      if (d === 'screen_spot') {
        let spotPenalty = penalty;
        if (diagnostics.screenSpots === '3 or more minor spots on screen') spotPenalty = 0.25;
        else if (diagnostics.screenSpots === '1-2 minor spots on screen') spotPenalty = 0.15;
        else if (diagnostics.screenSpots === 'No spots on screen') spotPenalty = 0;
        if (diagnostics.screenLines === 'Visible line(s) on display') spotPenalty = Math.max(spotPenalty, 0.30);
        else if (diagnostics.screenLines === 'Display faded along edges') spotPenalty = Math.max(spotPenalty, 0.20);
        if (diagnostics.screenDiscoloration === 'Major Discoloration') spotPenalty = Math.max(spotPenalty, 0.25);
        else if (diagnostics.screenDiscoloration === 'Minor Discoloration') spotPenalty = Math.max(spotPenalty, 0.10);
        penalty = spotPenalty;
      }
      if (d === 'body_scratch') {
        let bPenalty = 0;
        if (diagnostics.bodyScratches === 'More than 2 scratches') bPenalty += 0.08;
        else if (diagnostics.bodyScratches === '1-2 scratches') bPenalty += 0.03;
        if (diagnostics.bodyDents === 'Major dent(s) or more than 2') bPenalty += 0.12;
        else if (diagnostics.bodyDents === '1-2 minor dents') bPenalty += 0.05;
        if (bPenalty > 0) penalty = bPenalty;
      }
      if (d === 'panel_missing') {
        let pPenalty = 0;
        if (diagnostics.bodyPanel === 'Missing side or back panel') pPenalty = 0.20;
        else if (diagnostics.bodyPanel === 'Cracked/ broken side or back panel') pPenalty = 0.15;
        if (diagnostics.bodyBent === 'Bent/ curved panel') pPenalty = Math.max(pPenalty, 0.25);
        else if (diagnostics.bodyBent === 'Loose screen (Gap in screen and body)') pPenalty = Math.max(pPenalty, 0.15);
        if (pPenalty > 0) penalty = pPenalty;
      }
      sum += penalty * scale;
    });
    return sum;
  };

  const isApple = brand.toLowerCase() === 'apple';
  const params = isApple ? getAppleModelParams(model) : getAndroidModelParams(brand, model);

  let generationScale = 1.0;
  if (isApple) {
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('17') && !lowerModel.includes('17e')) generationScale = 0.84;
    else if (lowerModel.includes('17e')) generationScale = 0.80;
    else if (lowerModel.includes('16')) generationScale = 0.86;
    else if (lowerModel.includes('15')) generationScale = 0.94;
  }

  const hasValidBill = diagnostics.validBill === true || diagnostics.accessories.includes('bill');
  if (diagnostics.mobileAge) {
    age_multiplier = (config.ageBonus as any)[diagnostics.mobileAge] || 1.0;
    if (isApple) {
      const lowerModel = model.toLowerCase();
      // Cashify clamps age for brand new models. A 17-series can't realistically be >11 months yet.
      if (lowerModel.includes('17') && (diagnostics.mobileAge === 'above11' || diagnostics.mobileAge === '6to11')) {
        age_multiplier = (config.ageBonus as any)['below3'] || 1.0;
      } else if (lowerModel.includes('16') && diagnostics.mobileAge === 'above11') {
        age_multiplier = (config.ageBonus as any)['6to11'] || 0.9114;
      }
    }

    // Add extra penalties if they claimed recent age but don't have bill/warranty
    if (diagnostics.mobileAge !== 'above11' && !hasValidBill) {
      age_multiplier -= params.gstBillPenalty;
    }
  } else {
    age_multiplier = 1.0 - params.warrantyPenalty - (hasValidBill ? 0 : params.gstBillPenalty);
  }
  
  age_multiplier *= generationScale;

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1.0;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1.0;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1.0;
  
  if (diagnostics.touch === false || diagnostics.defects.includes('broken_screen')) {
    screen_orig_mult = 1.0;
  }

  screen_body_sum = applyGranularDefects(params.physicalScale);

  diagnostics.hardware.forEach(h => { 
    if (h in config.defects_functional) {
      functional_sum += (config.defects_functional as any)[h] * params.functionalScale;
    }
  });

  const box_bonus = diagnostics.accessories.includes('box') ? config.bonuses.box : 0;
  
  const rawCalculated = basePrice 
    * age_multiplier 
    * calls_multiplier 
    * touch_multiplier 
    * screen_orig_mult 
    * (1 - Math.min(screen_body_sum, 1)) 
    * (1 - Math.min(functional_sum, 1));

  let upliftPercent = 1.06;
  if (rawCalculated <= 20000) {
    upliftPercent = 1.08;
  } else if (rawCalculated <= 50000) {
    upliftPercent = 1.06;
  }

  const calculated = (rawCalculated * upliftPercent) + box_bonus;
    
  return Math.max(Math.round(calculated), floor_price);
}
