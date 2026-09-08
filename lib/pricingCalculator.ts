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
  charger?: boolean | null;
};

export interface PricingResult {
  cashifyBasePrice: number;
  fhoneifyPrice: number;
}

// ============================================================================
// SHARED CONSTANTS & HELPERS
// ============================================================================

export const COMMON_BONUSES = {
  box: 380,
  missingChargerPenalty: 80,
  missingChargerA34Penalty: 280,
  chargerOnlyBonus: 280,
  floorPrice: 100
};

export const COMMON_FUNCTIONAL_PENALTIES: Record<string, number> = {
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
};

export function applyCompetitorUplift(basePrice: number, exactCashifyPrice: number): number {
  let upliftPercent = 1;
  if (basePrice <= 20000) upliftPercent = 1.08;
  else if (basePrice <= 50000) upliftPercent = 1.06;
  else upliftPercent = 1.04;

  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;
  if (fhoneifyExtra < 100 && exactCashifyPrice > 1200) fhoneifyExtra = 100;

  return Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), COMMON_BONUSES.floorPrice);
}

// ============================================================================
// BRAND 1: APPLE / iPHONE ENGINE
// ============================================================================

export const getAppleModelParams = (model: string): ModelParams => {
  const lowerModel = String(model || "").toLowerCase();
  
  let params: ModelParams = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.70,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15,
    facePenalty: 0.05
  };

  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");

  if (lowerModel.includes("17e")) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.10287356,
      callsPenalty: 0.25,
      originalScreenPenalty: 0.10229885,
      touchPenalty: 0.31111111,
      functionalScale: 1.0,
      physicalScale: 1.0,
      facePenalty: 0.05
    };
  } else if (lowerModel.includes("16e")) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.005518,
      callsPenalty: 0.25,
      originalScreenPenalty: 0.4336,
      touchPenalty: 0.22,
      functionalScale: 1.5,
      physicalScale: 1.5,
      facePenalty: 0.05
    };
  } else if (lowerModel.includes("17") || lowerModel.includes("air")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.11184, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.123046, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus || lowerModel.includes("air")) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.114598, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.120155, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.10, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("16")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.044527, callsPenalty: 0.50, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.021212, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("15")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.011876, callsPenalty: 0.50, originalScreenPenalty: 0.62876, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.606183, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.019004, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.019888, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("14")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.017058, callsPenalty: 0.45, originalScreenPenalty: 0.701061, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.719084, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.225518 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.338111, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.629265, touchPenalty: 0.60, functionalScale: 1.2, physicalScale: 1.2, facePenalty: -0.061203 };
    }
  } else {
    params = { warrantyPenalty: 0, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.549363, touchPenalty: 0.50, functionalScale: 0.8, physicalScale: 0.8, facePenalty: 0.05 };
  }
  return params;
};

export function calculateApplePrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase().trim();
  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");
  const is17e = lowerModel.includes("17e");

  const params = getAppleModelParams(model);

  const callsOk = diagnostics.calls !== false;
  const touchOk = diagnostics.touch !== false;
  const screenOrig = diagnostics.originalScreen !== false;
  
  const isOutOfWarranty = diagnostics.warranty === false || diagnostics.mobileAge === 'above11' || diagnostics.mobileAge === 'above 11 months';
  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const age = String(diagnostics.mobileAge || "").toLowerCase();

  let ageMultiplier = 0.74961686;
  
  if (!isOutOfWarranty) {
    if (lowerModel.includes("17") || lowerModel.includes("air")) {
      if (age.includes("below 3") || age.includes("below3")) ageMultiplier = (isPro && !isProMax) ? 0.9875 : 0.98;
      else if (age.includes("3") && age.includes("6")) ageMultiplier = (isPro || isProMax) ? 0.8881 : (lowerModel.includes("air") ? 0.873448 : 0.88065134);
      else if (age.includes("6") && age.includes("11")) ageMultiplier = (isPro && !isProMax) ? 0.8601 : (isProMax ? 0.85704 : (lowerModel.includes("air") ? 0.845747 : 0.85249042));
      else ageMultiplier = 0.74961686;
    } else if (lowerModel.includes("16")) {
      if (age.includes("6") && age.includes("11")) ageMultiplier = isProMax ? 0.908642 : (isPro ? 0.911240 : 0.9114);
      else ageMultiplier = isProMax ? 0.908642 : (isPro ? 0.911240 : 0.9114);
    } else if (lowerModel.includes("15")) {
      ageMultiplier = isProMax ? 0.752937 : (isPro ? 0.745160 : (isPlus ? 0.783929 : 0.749243));
    } else if (lowerModel.includes("14")) {
      ageMultiplier = isProMax ? 0.916788 : (isPro ? 0.914504 : (isPlus ? 0.854723 : 0.629265));
    } else {
      ageMultiplier = 0.859873;
    }
  } else {
    if (is17e) ageMultiplier = 0.74961686;
    else if (lowerModel.includes("16")) ageMultiplier = isProMax ? 0.782628 : (isPro ? 0.745663 : (isPlus ? 0.771591 : (lowerModel.includes("16e") ? 0.752445 : 0.779625)));
  }

  if (!hasValidBill && !isOutOfWarranty) {
    ageMultiplier -= params.gstBillPenalty;
  }

  const callsMult = callsOk ? 1.0 : params.callsPenalty;
  const touchMult = touchOk ? 1.0 : (is17e ? (1.0 - params.touchPenalty) : params.touchPenalty);
  let screenOrigMult = screenOrig ? 1.0 : (is17e ? (1.0 - params.originalScreenPenalty) : params.originalScreenPenalty);
  if (!touchOk || (diagnostics.defects || []).includes("broken_screen")) {
    if (!is17e) screenOrigMult = 1.0;
  }

  let physicalSum = 0.0;
  const bScale = params.bodyScale || params.physicalScale;
  const defectsList = diagnostics.defects || [];
  const screenCondition = String(diagnostics.screenCondition || "").toLowerCase();
  const bodyScratches = String(diagnostics.bodyScratches || "").toLowerCase();
  const bodyDents = String(diagnostics.bodyDents || "").toLowerCase();
  
  if (
    defectsList.includes("body_scratch") || 
    defectsList.includes("screen_scratch") ||
    defectsList.includes("Broken/scratch on device screen") || 
    defectsList.includes("Scratch/Dent on device body") || 
    screenCondition || 
    bodyScratches || 
    bodyDents
  ) {
    let scratchPen = 0.0;
    let dentPen = 0.0;

    if (screenCondition.includes("more than 2") || bodyScratches.includes("more than 2")) {
      scratchPen = is17e ? 0.11800766 : (lowerModel.includes("16e") ? 0.0025 : 0.02116);
    } else if (bodyScratches.includes("1-2") || screenCondition.includes("1-2")) {
      scratchPen = (lowerModel.includes("17") && isPro && !isProMax) ? 0.01117 : 0.01;
    }

    if (bodyDents.includes("major") || bodyDents.includes("more than 2")) {
      dentPen = isProMax ? 0.02861 : 0.04232;
    } else if (bodyDents.includes("1-2")) {
      dentPen = (isPlus || isPro) && (lowerModel.includes("16") || lowerModel.includes("15")) ? 0.0 : (isProMax ? 0.015 : 0.02);
    }

    if (bodyScratches.includes("no") && !screenCondition) scratchPen = 0;
    if (bodyDents.includes("no")) dentPen = 0;

    physicalSum += (scratchPen + dentPen) * bScale;
  }

  let functionalSum = 0.0;
  const hardwareList = diagnostics.hardware || [];
  
  if (
    hardwareList.includes("battery_health") || 
    hardwareList.includes("Battery Health 80-85%") || 
    String(diagnostics.screenSpots || "").includes("Battery")
  ) {
    if (is17e) {
      functionalSum += (age.includes("below 3") || age.includes("below3")) ? 0.01639847 : 0.02873563;
    } else {
      functionalSum += 0.0;
    }
  }

  if (hardwareList.includes("battery_service") || hardwareList.includes("Battery in Service")) {
    if (lowerModel.includes("16") && isProMax) functionalSum += 0.044527;
    else if (lowerModel.includes("16") && isPro) functionalSum += 0.022882;
    else if (lowerModel.includes("16")) functionalSum += 0.069763;
    else if (lowerModel.includes("15") && isPlus) functionalSum += 0.064474;
    else if (lowerModel.includes("15")) functionalSum += 0.048582;
    else functionalSum += 0.05 * params.functionalScale;
  }

  if (hardwareList.includes("face") || hardwareList.includes("Face Sensor not working")) {
    functionalSum += params.facePenalty! * params.functionalScale;
  }

  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;
  const totalPenaltySum = (1 - callsMult) + (1 - touchMult) + (1 - screenOrigMult) + physicalSum + functionalSum;
  
  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - totalPenaltySum) + boxBonus;

  if (is17e) {
    cashifyPrice = basePrice * (ageMultiplier - totalPenaltySum) + boxBonus;
  }

  if (!callsOk) {
    cashifyPrice = 1200;
  }

  const exactCashifyPrice = Math.round(cashifyPrice);
  
  return { 
    cashifyBasePrice: exactCashifyPrice, 
    fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) 
  };
}

// ============================================================================
// BRAND 2: SAMSUNG ENGINE
// ============================================================================

export function calculateSamsungPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isA = lowerModel.includes("galaxy a") || !!lowerModel.match(/\ba\d\d\b/);
  const isA35 = lowerModel.includes("a35");
  const isA34 = lowerModel.includes("a34");
  const isUltra = lowerModel.includes("ultra");
  const isS24Ultra = lowerModel.includes("s24 ultra");
  const isS26Ultra = lowerModel.includes("s26 ultra");
  const isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
  const isEdge = lowerModel.includes("edge");
  const isFE = lowerModel.includes("fe");

  let params: ModelParams = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
  if (isA) params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.75, touchPenalty: 0.4, functionalScale: 0.8, physicalScale: 0.75 };
  else if (isUltra) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.2, physicalScale: 1.2 };
  else if (isEdge) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.11 };
  else if (isFE) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.986 };

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  let ageMultiplier = 0.7760816326;

  if (isS24Ultra) ageMultiplier = diagnostics.warranty === false ? (hasValidBill ? 0.8032786885245902 : 0.8188914910226385) : 0.98;
  else if (isS26Ultra) ageMultiplier = diagnostics.warranty === false ? 0.8139316811781648 : 0.95;
  else if (isA35) ageMultiplier = diagnostics.warranty === false ? 0.7689422355588897 : 0.98;
  else if (isA34) ageMultiplier = diagnostics.warranty === false ? 0.7807625649913345 : 0.98;
  else if (isA) ageMultiplier = diagnostics.warranty === false ? 0.7586206896551724 : 0.7431261770244821;
  else if (diagnostics.warranty !== false) ageMultiplier = 0.98;

  if (!hasValidBill && diagnostics.warranty !== false) {
    if (isUltra) ageMultiplier -= 0.1265558194774347;
    else ageMultiplier -= params.gstBillPenalty;
  }

  let scratchPenalty = 0;
  if ((diagnostics.defects || []).includes("body_scratch")) {
    if (diagnostics.bodyScratches?.includes("More than 2")) scratchPenalty = isA35 ? 0.049756 : isA34 ? 0.033296 : isA ? 0.010277 : isS26Ultra ? 0.015111 : isS24Ultra ? 0.005932 : isPlus ? 0.010416 : 0.02116;
    else if (diagnostics.bodyScratches?.includes("1-2")) scratchPenalty = (isA35 || isA34 || isA) ? 0 : isS24Ultra ? 0.018735 : isUltra ? 0.015016 : isEdge ? 0.0111 : isPlus ? 0.016848 : 0.01677;
  }

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const hasCharger = (diagnostics.accessories || []).includes("charger") || diagnostics.charger === true;

  let boxBonus = 0;
  if (hasBox) {
    boxBonus = isA35 ? 100 : COMMON_BONUSES.box;
    if (hasCharger === false && diagnostics.charger !== undefined && !isA35) {
      boxBonus -= isA34 ? COMMON_BONUSES.missingChargerA34Penalty : COMMON_BONUSES.missingChargerPenalty;
    }
  } else if (hasCharger) {
    boxBonus = COMMON_BONUSES.chargerOnlyBonus;
  }

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - scratchPenalty) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 3: XIAOMI / REDMI / POCO ENGINE
// ============================================================================

export function calculateXiaomiPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isRedmiNote = lowerModel.includes("note");
  const ageConfig = isRedmiNote
    ? { below3: 1, "3to6": 0.93, "6to11": 0.85, above11: 0.74 }
    : { below3: 1, "3to6": 0.94, "6to11": 0.86, above11: 0.75 };

  let ageMultiplier = ageConfig.below3;
  if (diagnostics.warranty === false || diagnostics.mobileAge === "above11") {
    ageMultiplier = ageConfig.above11;
  } else if (diagnostics.mobileAge) {
    const k = diagnostics.mobileAge.toLowerCase();
    if (k.includes("3") && k.includes("6")) ageMultiplier = ageConfig["3to6"];
    else if (k.includes("6") && k.includes("11")) ageMultiplier = ageConfig["6to11"];
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= 0.08;

  let scratchPenalty = 0;
  if ((diagnostics.defects || []).includes("body_scratch")) {
    if (diagnostics.bodyScratches?.includes("More than 2")) scratchPenalty = 0.05;
    else if (diagnostics.bodyScratches?.includes("1-2")) scratchPenalty = 0.02;
  }

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - scratchPenalty) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = basePrice <= 5000 ? 200 : 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 4: VIVO / iQOO ENGINE
// ============================================================================

export function calculateVivoPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isFold = lowerModel.includes("fold");
  const params: ModelParams = isFold
    ? { warrantyPenalty: 0.1, gstBillPenalty: 0.02656641604010025, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 }
    : { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.8002385938173499, touchPenalty: 0.34764077227429186, functionalScale: 1.0, physicalScale: 0.8 };

  let ageMultiplier = 1.0;
  if (isFold) ageMultiplier = diagnostics.warranty === false ? 0.7526315789473684 : 0.98;
  else if (diagnostics.warranty === false) ageMultiplier = 0.75;
  else if (diagnostics.mobileAge) {
    const k = diagnostics.mobileAge.toLowerCase();
    if (k.includes("3") && k.includes("6")) ageMultiplier = 0.93;
    else if (k.includes("6") && k.includes("11")) ageMultiplier = 0.88;
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  let scratchPenalty = 0;
  if ((diagnostics.defects || []).includes("body_scratch")) {
    if (isFold) scratchPenalty = 0.023642990343003003;
    else scratchPenalty = diagnostics.bodyScratches?.includes("More than 2") ? 0.04 : 0.015;
  }

  let functionalSum = 0;
  if (isFold) {
    (diagnostics.hardware || []).forEach((h) => {
      if (h === "battery_health" || h === "battery_service" || h === "battery") functionalSum += 0.02992159060803527;
    });
  }

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const hasCharger = (diagnostics.accessories || []).includes("charger") || diagnostics.charger === true;

  let boxBonus = 0;
  if (hasBox) {
    boxBonus = COMMON_BONUSES.box;
    if (hasCharger === false && diagnostics.charger !== undefined) boxBonus -= COMMON_BONUSES.missingChargerPenalty;
  }

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - (scratchPenalty + functionalSum)) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 5: OPPO ENGINE
// ============================================================================

export function calculateOppoPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isFindX9s = lowerModel.includes("find x9s");
  const isFindX9Ultra = lowerModel.includes("find x9 ultra");
  const isFindX9Pro = lowerModel.includes("find x9 pro");
  const isReno16c = lowerModel.includes("reno16c");
  const isReno16 = lowerModel.includes("reno16") && !isReno16c;

  let params: ModelParams = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };

  if (isFindX9s) params.gstBillPenalty = 0.25866666666666666;
  else if (isFindX9Ultra) params.gstBillPenalty = 0.251625;
  else if (isFindX9Pro) params.gstBillPenalty = 0.24032;
  else if (isReno16c) params.gstBillPenalty = 0.2611940298507462;
  else if (isReno16) params.gstBillPenalty = 0.2621428571428571;

  let ageMultiplier = 0.98;
  if (isFindX9s) ageMultiplier = 0.9915555555555555;
  else if (isFindX9Ultra) ageMultiplier = 0.99525;
  else if (isReno16) ageMultiplier = 0.9909523809523809;
  else if (isReno16c) ageMultiplier = 0.9886567164179104;

  if (diagnostics.mobileAge) {
    const k = diagnostics.mobileAge.toLowerCase();
    if (k.includes("3") && k.includes("6")) ageMultiplier = 0.94;
    else if (k.includes("6") && k.includes("11")) ageMultiplier = isFindX9Pro ? 0.85408 : 0.90;
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  let scratchPenalty = 0;
  if ((diagnostics.defects || []).includes("body_scratch")) {
    if (diagnostics.bodyScratches?.includes("More than 2")) scratchPenalty = isFindX9Ultra ? 0.060106 : isFindX9Pro ? 0.077866 : 0.05;
    else if (diagnostics.bodyScratches?.includes("1-2")) scratchPenalty = isFindX9s ? 0.064066 : isReno16 ? 0.065593 : isReno16c ? 0.065821 : 0.02;
  }

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - scratchPenalty) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 6: ONEPLUS ENGINE
// ============================================================================

export function calculateOnePlusPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isPro = lowerModel.includes("pro");
  const isFold = lowerModel.includes("open") || lowerModel.includes("fold");

  const params: ModelParams = (isPro || isFold)
    ? { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 }
    : { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };

  if (lowerModel.includes("nord 5")) params.gstBillPenalty = 0.223828345567;
  else if (lowerModel.includes("15r")) params.gstBillPenalty = 0.245492873398;
  else if (lowerModel.includes("15")) params.gstBillPenalty = 0.184090806203;

  let ageMultiplier = diagnostics.warranty === false ? 0.7966 : 0.98;

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  let functionalSum = 0;
  (diagnostics.hardware || []).forEach((h) => {
    if (h === "front_camera") functionalSum += 0.0658385;
    else if (h === "back_camera") functionalSum += 0.1827216;
    else if (h.includes("battery")) functionalSum += 0.0620553;
  });

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - functionalSum) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 7: NOTHING & CMF ENGINE
// ============================================================================

export function calculateNothingPrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isNothing1 = lowerModel.includes("phone 1") || lowerModel.includes("phone (1)");
  const isNothing2 = lowerModel.includes("phone 2") || lowerModel.includes("phone (2)");

  const params: ModelParams = { warrantyPenalty: 0.1, gstBillPenalty: 0.223828345567476, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
  let ageMultiplier = diagnostics.warranty === false ? (isNothing1 ? 0.8805755395683453 : 0.88) : 0.98;

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  let functionalSum = 0;
  (diagnostics.hardware || []).forEach((h) => {
    if (isNothing2) {
      if (h === "front_camera") functionalSum += 0.0653835;
      else if (h === "back_camera") functionalSum += 0.1826338;
      else if (h.includes("battery")) functionalSum += 0.0620067;
    } else if (isNothing1) {
      if (h === "front_camera") functionalSum += 0.0589928;
      else if (h === "back_camera") functionalSum += 0.1352517;
      else if (h.includes("battery")) functionalSum += 0.0496402;
    } else {
      if (h === "front_camera") functionalSum += 0.0658385;
      else if (h === "back_camera") functionalSum += 0.1827216;
      else if (h.includes("battery")) functionalSum += 0.0620553;
    }
  });

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - functionalSum) + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// BRAND 8: GENERIC ANDROID FALLBACK ENGINE
// ============================================================================

export function calculateGenericAndroidPrice(brand: string, model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const params: ModelParams = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.7 };
  let ageMultiplier = diagnostics.warranty === false ? 0.75 : 0.95;

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  let cashifyPrice = basePrice * ageMultiplier + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = basePrice <= 5000 ? 200 : 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}

// ============================================================================
// CENTRAL ROUTER DISPATCHER
// ============================================================================

export function calculateFhoneifyPrice(
  brand: string,
  model: string,
  basePrice: number,
  diagnostics: DiagnosticsType
): PricingResult {
  const safeBrand = String(brand || "").toLowerCase().trim();
  const safeModel = String(model || "").toLowerCase().trim();

  if (safeBrand === "apple" || safeModel.includes("iphone")) {
    return calculateApplePrice(model, basePrice, diagnostics);
  }

  if (safeBrand === "samsung" || safeModel.includes("galaxy")) {
    return calculateSamsungPrice(model, basePrice, diagnostics);
  }

  if (
    safeBrand === "xiaomi" || safeBrand === "redmi" || safeBrand === "poco" ||
    safeModel.includes("xiaomi") || safeModel.includes("redmi") || safeModel.includes("poco")
  ) {
    return calculateXiaomiPrice(model, basePrice, diagnostics);
  }

  if (
    safeBrand === "vivo" || safeBrand === "iqoo" ||
    safeModel.includes("vivo") || safeModel.includes("iqoo")
  ) {
    return calculateVivoPrice(model, basePrice, diagnostics);
  }

  if (
    safeBrand === "oppo" || safeModel.includes("oppo") ||
    safeModel.includes("reno") || safeModel.includes("find x")
  ) {
    return calculateOppoPrice(model, basePrice, diagnostics);
  }

  if (
    safeBrand === "oneplus" || safeModel.includes("oneplus") || safeModel.includes("nord")
  ) {
    return calculateOnePlusPrice(model, basePrice, diagnostics);
  }

  if (
    safeBrand === "nothing" || safeBrand === "cmf" ||
    safeModel.includes("nothing") || safeModel.includes("cmf")
  ) {
    return calculateNothingPrice(model, basePrice, diagnostics);
  }

  return calculateGenericAndroidPrice(brand, model, basePrice, diagnostics);
}
