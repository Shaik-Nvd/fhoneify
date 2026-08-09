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
  box?: boolean | null;
};

/**
 * Fhoneify Production Pricing Engine Algorithm
 * Calibrated against Cashify reverse logic for standard, flagship, and foldable devices.
 */

export const pricingConfig = {
  defects_screen_body: {
    broken_screen: 0.4,
    screen_scratch: 0.35,
    screen_spot: 0.25,
    panel_missing: 0.2,
    body_scratch: 0.08
  },
  defects_functional: {
    fingerprint: 0.15,
    battery_service: 0.15,
    battery_health: 0.05,
    front_camera: 0.1253,
    back_camera: 0.223,
    wifi: 0.12,
    speaker: 0.1,
    audio_receiver: 0.1,
    charging: 0.1,
    microphone: 0.1,
    face: 0.05,
    volume: 0.05,
    power: 0.05,
    camera_glass: 0.05,
    bluetooth: 0.05,
    silent: 0.02,
    vibrator: 0.02,
    proximity: 0.02,
    s_pen: 0.08,
    hinge: 0.2
  },
  // Standard Age Multipliers
  ageBonus: {
    below3: 1,
    "3to6": 0.9427,
    "6to11": 0.9114,
    above11: 0.7966
  },
  // Specialized Series Multipliers
  foldableAgeBonus: {
    below3: 0.98,
    "3to6": 0.925,
    "6to11": 0.8845226,
    above11: 0.7902512
  },
  s26UltraSeriesAgeBonus: {
    below3: 0.95,
    "3to6": 0.9063182897862233,
    "6to11": 0.8907363420427553,
    above11: 0.8139316811781648
  },
  sUltraSeriesAgeBonus: {
    below3: 0.98,
    "3to6": 0.93,
    "6to11": 0.90,
    above11: 0.8139316811781648
  },
  s24UltraSeriesAgeBonus: {
    below3: 0.98,
    "3to6": 0.93,
    "6to11": 0.89,
    above11_bill: 0.8032786885245902,
    above11_nobill: 0.8188914910226385
  },
  sPlusSeriesAgeBonus: {
    below3: 0.98,
    "3to6": 0.91315104167,
    "6to11": 0.8979591836,
    above11: 0.7760816326
  },
  sSeriesAgeBonus: {
    below3: 0.95,
    "3to6": 0.9095510204,
    "6to11": 0.8979591836,
    above11: 0.7760816326
  },
  feSeriesAgeBonus: {
    below3: 0.94,
    "3to6": 0.895,
    "6to11": 0.86310559,
    above11: 0.75701863
  },
  edgeSeriesAgeBonus: {
    below3: 0.96,
    "3to6": 0.935,
    "6to11": 0.923466114868,
    above11: 0.79668938657
  },
  bonuses: {
    box: 380
  },
  modelFloorPrice: 100
};

// 1. Apple Device Base Parameters
export const getAppleModelParams = (model: string): ModelParams => {
  const lowerModel = String(model || "").toLowerCase();
  let params: ModelParams = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.7,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15
  };
  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");

  if (lowerModel.includes("17e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("16e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("17")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.1, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("16") || lowerModel.includes("15")) {
    if (lowerModel.includes("16 pro max")) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else if (lowerModel === "apple iphone 15" || lowerModel === "iphone 15") {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1, physicalScale: 1 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.7, touchPenalty: 0.55, functionalScale: 1, physicalScale: 1 };
    }
  } else if (lowerModel.includes("14")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.6, originalScreenPenalty: 0.6681, touchPenalty: 0.6, functionalScale: 1.2, physicalScale: 1.2 };
    }
  } else {
    params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.6, originalScreenPenalty: 0.7, touchPenalty: 0.5, functionalScale: 0.8, physicalScale: 0.8 };
  }
  return params;
};

// 2. Android Device Base Parameters
export const getAndroidModelParams = (brand: string, model: string): ModelParams => {
  const lowerBrand = String(brand || "").toLowerCase();
  const lowerModel = String(model || "").toLowerCase();
  let params: ModelParams = {
    warrantyPenalty: 0.1,
    gstBillPenalty: 0.05,
    callsPenalty: 0.5,
    originalScreenPenalty: 0.6,
    touchPenalty: 0.4,
    functionalScale: 0.8,
    physicalScale: 0.75
  };
  
  if (lowerBrand === "samsung") {
    const isUltra = lowerModel.includes("ultra");
    const isS = lowerModel.includes("galaxy s") || lowerModel.includes("s2") || lowerModel.includes("s1") || lowerModel.includes("s9") || lowerModel.includes("s8");
    const isZ = lowerModel.includes("fold") || lowerModel.includes("flip");
    const isFE = lowerModel.includes("fe");
    const isEdge = lowerModel.includes("edge");
    const isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
    
    if (isUltra) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.2, physicalScale: 1.2 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
    } else if (isEdge) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.11 };
    } else if (isFE) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.986 };
    } else if (isS || isZ) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
    } else {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else if (lowerBrand === "oneplus") {
    const isPro = lowerModel.includes("pro");
    const isFold = lowerModel.includes("open") || lowerModel.includes("fold");
    if (isPro || isFold) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 };
    } else {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };
    }
  } else {
    params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.7 };
  }
  return params;
};

// 3. Main Algorithm Execution Function
export function calculateFhoneifyPrice(brand: string, model: string, basePrice: number, diagnostics: DiagnosticsType): { cashifyBasePrice: number, fhoneifyPrice: number } {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };
  
  const floor_price = pricingConfig.modelFloorPrice;
  let age_multiplier = 1;
  let calls_multiplier = 1;
  let touch_multiplier = 1;
  let screen_orig_mult = 1;
  let screen_body_sum = 0;
  let functional_sum = 0;
  
  const safeBrand = String(brand || "");
  const safeModel = String(model || "");
  const lowerModel = safeModel.toLowerCase();
  const isApple = safeBrand.toLowerCase() === "apple";
  const isFoldable = lowerModel.includes("fold") || lowerModel.includes("flip") || lowerModel.includes("open");
  const isUltra = lowerModel.includes("ultra");
  const isFE = lowerModel.includes("fe");
  const isEdge = lowerModel.includes("edge");
  const isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
  const isS26Ultra = lowerModel.includes("s26 ultra");
  const isS24Ultra = lowerModel.includes("s24 ultra");
  const isSPlus = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isPlus;
  const isSUltra = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isUltra;
  const isSSeries = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && !isFE && !isEdge && !isPlus && !isUltra;
  const isProMax = lowerModel.includes("pro max");

  // Determine appropriate age configuration map
  let ageConfig: Record<string, number> = pricingConfig.ageBonus;
  if (isFoldable) ageConfig = pricingConfig.foldableAgeBonus;
  else if (isS26Ultra) ageConfig = pricingConfig.s26UltraSeriesAgeBonus;
  else if (isS24Ultra) ageConfig = pricingConfig.s24UltraSeriesAgeBonus;
  else if (isSUltra) ageConfig = pricingConfig.sUltraSeriesAgeBonus;
  else if (isSPlus) ageConfig = pricingConfig.sPlusSeriesAgeBonus;
  else if (isEdge) ageConfig = pricingConfig.edgeSeriesAgeBonus;
  else if (isFE) ageConfig = pricingConfig.feSeriesAgeBonus;
  else if (isSSeries) ageConfig = pricingConfig.sSeriesAgeBonus;

  const params = isApple ? getAppleModelParams(safeModel) : getAndroidModelParams(safeBrand, safeModel);
  const bodyScale = params.bodyScale || params.physicalScale;

  // Handle Granular Body & Screen Defects
  const applyGranularDefects = (scale: number, bScale: number) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach((d) => {
      let penalty = (pricingConfig.defects_screen_body as any)[d] || 0;
      if (d === "screen_scratch" && diagnostics.screenCondition) {
        if (diagnostics.screenCondition.includes("More than 2")) {
          penalty = lowerModel.includes("17") ? 0.12856 : isSUltra ? 0.018754186202277293 : 0.2635;
        } else if (diagnostics.screenCondition.includes("1-2")) {
          penalty = 0.15;
        } else {
          penalty = 0.25;
        }
      }
      if (d === "body_scratch") {
        let scratchPenalty = 0;
        let dentPenalty = 0;
        
        if (diagnostics.bodyScratches === "More than 2 scratches" || diagnostics.bodyScratches === "More than 2") {
          scratchPenalty = isS26Ultra ? 0.016152018998218527 : isS24Ultra ? 0.005932864949258392 : isSPlus ? 0.01041666667 : 0.02116;
        } else if (diagnostics.bodyScratches === "1-2 scratches" || diagnostics.bodyScratches === "1-2") {
          scratchPenalty = isFoldable ? 0.01979899 : isS24Ultra ? 0.01873536300078064 : isSUltra ? 0.0150167448 : isEdge ? 0.011100292112956 : isSPlus ? 0.0168489583333333 : isSSeries ? 0.0167718 : 0.01;
        } else {
          scratchPenalty = 0.05;
        }
        
        if (diagnostics.bodyDents === "Major dent(s) or more than 2") dentPenalty = isProMax ? 0.02861 : 0.04232;
        else if (diagnostics.bodyDents === "1-2 minor dents" || diagnostics.bodyDents === "1-2") {
          dentPenalty = isSUltra ? 0.0147220368 : isSPlus ? 0.0078125 : (isProMax ? 0.015 : 0.02);
        }
        
        if (diagnostics.bodyScratches === "No scratches" || diagnostics.bodyScratches === "No" || !diagnostics.bodyScratches) scratchPenalty = 0;
        if (diagnostics.bodyDents === "No dents" || diagnostics.bodyDents === "No" || !diagnostics.bodyDents) dentPenalty = 0;
        
        penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
      }
      
      const foldableScreenMult = isFoldable ? 3 : 1;
      if (d === "screen_scratch" || d === "screen_spot" || d === "panel_missing") {
        penalty *= foldableScreenMult;
      }
      if ((diagnostics.originalScreen === false || diagnostics.touch === false) && d !== "body_scratch" && d !== "panel_missing") {
        penalty = 0;
      }
      sum += penalty * scale;
    });
    return sum;
  };

  // Age & Document Deductions
  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");

  if (diagnostics.warranty === false) {
    if (isS24Ultra) {
      age_multiplier = hasValidBill ? ageConfig["above11_bill"] : ageConfig["above11_nobill"];
    } else {
      age_multiplier = ageConfig["above11"];
    }
  } else if (diagnostics.mobileAge) {
    const ageKey = String(diagnostics.mobileAge).toLowerCase();
    if (ageKey.includes("below 3") || ageKey.includes("below3")) age_multiplier = ageConfig["below3"];
    else if (ageKey.includes("3") && ageKey.includes("6")) age_multiplier = ageConfig["3to6"];
    else if (ageKey.includes("6") && ageKey.includes("11")) age_multiplier = ageConfig["6to11"];
    else age_multiplier = ageConfig["above11"];
  } else {
    age_multiplier = ageConfig["above11"];
  }
  
  // Apply GST Bill Penalty
  if (!hasValidBill) {
    if (diagnostics.warranty !== false) {
      if (isSUltra) age_multiplier -= 0.1265558194774347;
      else age_multiplier -= params.gstBillPenalty;
    }
  }

  // Major Component Multipliers
  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1;
  if (diagnostics.touch === false || (diagnostics.defects || []).includes("broken_screen")) {
    screen_orig_mult = 1;
  }
  
  screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);
  if (isFoldable && diagnostics.originalScreen === false) {
    screen_orig_mult = Math.min(screen_orig_mult, 0.35);
  }

  // Functional Hardware Checks
  const hardwareList = diagnostics.hardware || [];
  hardwareList.forEach((h) => {
    if (h in pricingConfig.defects_functional) {
      let penalty = (pricingConfig.defects_functional as any)[h] * params.functionalScale;
      functional_sum += penalty;
    }
  });

  const box_bonus = (diagnostics.accessories || []).includes("box") || diagnostics.box === true ? pricingConfig.bonuses.box : 0;
  
  const calls_penalty_val = 1 - calls_multiplier;
  const touch_penalty_val = 1 - touch_multiplier;
  const screen_orig_penalty_val = 1 - screen_orig_mult;
  
  let total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;

  // Calculate Base Cashify Depreciation
  const rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
  let cashifyPrice = rawCalculated + box_bonus;

  // Dead Network Failsafe
  if (diagnostics.calls === false && !lowerModel.includes("16")) {
    cashifyPrice = isApple ? 1200 : basePrice <= 5000 ? 200 : 1200;
  }

  // Round Cashify Base Price
  const exactCashifyPrice = Math.round(cashifyPrice);

  // Fhoneify Competitor Uplift Margin Logic
  let upliftPercent = 1;
  if (basePrice <= 20000) upliftPercent = 1.08;
  else if (basePrice <= 50000) upliftPercent = 1.06;
  else upliftPercent = 1.04;
  
  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;
  if (fhoneifyExtra < 100 && exactCashifyPrice > 1200) fhoneifyExtra = 100;
  
  const fhoneifyPrice = Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), floor_price);

  return {
    cashifyBasePrice: exactCashifyPrice,
    fhoneifyPrice: fhoneifyPrice
  };
}
