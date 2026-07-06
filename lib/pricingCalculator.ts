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

  if (lowerModel.includes('17') || lowerModel.includes('air')) {
    params = {
      warrantyPenalty: 0.18, gstBillPenalty: 0.10, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.25, functionalScale: 1.3, physicalScale: 1.2,
    };
  } else if (lowerModel.includes('16')) {
    params = {
      warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.48, originalScreenPenalty: 0.65, touchPenalty: 0.30, functionalScale: 1.2, physicalScale: 1.1,
    };
  } else if (lowerModel.includes('15')) {
    params = {
      warrantyPenalty: 0.08, gstBillPenalty: 0.05, callsPenalty: 0.52, originalScreenPenalty: 0.68, touchPenalty: 0.32, functionalScale: 1.1, physicalScale: 1.05,
    };
  } else if (lowerModel.includes('14')) {
    params = {
      warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.0,
    };
  } else if (lowerModel.includes('13') || lowerModel.includes('se (2022') || lowerModel.includes('se 2022')) {
    params = {
      warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.9,
    };
  } else if (lowerModel.includes('12')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.75, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.8,
    };
  } else if (lowerModel.includes('11') || lowerModel.includes('se (2020') || lowerModel.includes('se 2020')) {
    params = {
      warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.78, touchPenalty: 0.40, functionalScale: 0.7, physicalScale: 0.7,
    };
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

export const getAndroidModelParams = (brand: string) => {
  const lowerBrand = brand.toLowerCase();
  
  let params = {
    warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.70, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.8,
  };

  if (lowerBrand === 'samsung') {
    params = {
      warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.85,
    };
  } else if (lowerBrand === 'oneplus' || lowerBrand === 'google' || lowerBrand === 'nothing' || lowerBrand === 'asus' || lowerBrand === 'huawei') {
    params = {
      warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.75,
    };
  } else if (lowerBrand === 'vivo' || lowerBrand === 'oppo' || lowerBrand === 'xiaomi' || lowerBrand === 'poco' || lowerBrand === 'realme' || lowerBrand === 'motorola' || lowerBrand === 'iqoo' || lowerBrand === 'infinix' || lowerBrand === 'tecno' || lowerBrand === 'lg') {
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
  const params = isApple ? getAppleModelParams(model) : getAndroidModelParams(brand);

  const hasValidBill = diagnostics.validBill === true || diagnostics.accessories.includes('bill');
  if (diagnostics.warranty && hasValidBill && diagnostics.mobileAge) {
    age_multiplier = (config.ageBonus as any)[diagnostics.mobileAge] || 1.0;
  } else {
    age_multiplier = 1.0 - params.warrantyPenalty - (hasValidBill ? 0 : params.gstBillPenalty);
  }

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1.0;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1.0;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1.0;

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

  let upliftPercent = 1.04;
  if (basePrice <= 20000) {
    upliftPercent = 1.08;
  } else if (basePrice <= 50000) {
    upliftPercent = 1.06;
  }

  const calculated = (rawCalculated * upliftPercent) + box_bonus;
    
  return Math.max(Math.round(calculated), floor_price);
}
