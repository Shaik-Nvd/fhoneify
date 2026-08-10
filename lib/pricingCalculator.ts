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

/**
 * Fhoneify Production Pricing Engine Algorithm
 * Calibrated against Cashify reverse logic for Apple, Samsung, Xiaomi, Redmi, Vivo, OnePlus, OPPO, and generic Android devices.
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
  xiaomiSeriesAgeBonus: { below3: 1, "3to6": 0.94, "6to11": 0.86, above11: 0.75 },
  redmiNoteSeriesAgeBonus: { below3: 1, "3to6": 0.93, "6to11": 0.85, above11: 0.74 },
  vivoXSeriesAgeBonus: { below3: 1, "3to6": 0.93, "6to11": 0.88, above11: 0.75 },
  vivoXFoldSeriesAgeBonus: { below3: 0.98, "3to6": 0.925, "6to11": 0.8845226, above11: 0.7526315789473684 },
  oppoFindX9sSeriesAgeBonus: { below3: 0.9915555555555555, "3to6": 0.94, "6to11": 0.90, above11: 0.7966 },
  oppoFindX9UltraSeriesAgeBonus: { below3: 0.99525, "3to6": 0.94, "6to11": 0.90, above11: 0.7966 },
  oppoFindX9ProSeriesAgeBonus: { below3: 0.98, "3to6": 0.90, "6to11": 0.85408, above11: 0.7966 },
  oppoReno16SeriesAgeBonus: { below3: 0.9909523809523809, "3to6": 0.93, "6to11": 0.90, above11: 0.7966 },
  oppoReno16cSeriesAgeBonus: { below3: 0.9886567164179104, "3to6": 0.93, "6to11": 0.90, above11: 0.7966 },
  sA35SeriesAgeBonus: { below3: 0.98, "3to6": 0.92, "6to11": 0.88, above11: 0.7689422355588897 },
  sA34SeriesAgeBonus: { below3: 0.98, "3to6": 0.92, "6to11": 0.88, above11: 0.7807625649913345 },
  sASeriesAgeBonus: { below3: 0.7431261770244821, "3to6": 0.8765432098765432, "6to11": 0.8500264970853207, above11: 0.7586206896551724 },
  bonuses: { box: 380, missingChargerPenalty: 80, missingChargerA34Penalty: 280, chargerOnlyBonus: 280 },
  modelFloorPrice: 100
};

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
  
  if (lowerBrand === "xiaomi" || lowerBrand === "redmi" || lowerModel.includes("xiaomi") || lowerModel.includes("redmi")) {
    params = {
      warrantyPenalty: 0.1,
      gstBillPenalty: 0.08,
      callsPenalty: 0.5,
      originalScreenPenalty: 0.6,
      touchPenalty: 0.4,
      functionalScale: 1.0,
      physicalScale: 1.0
    };
  } else if (lowerBrand === "vivo" || lowerModel.includes("vivo")) {
    if (lowerModel.includes("fold")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.02656641604010025,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6,
        touchPenalty: 0.4,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.8002385938173499,
        touchPenalty: 0.34764077227429186,
        functionalScale: 1.0,
        physicalScale: 0.8
      };
    }
  } else if (lowerBrand === "oppo" || lowerModel.includes("oppo")) {
    if (lowerModel.includes("find x9s")) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.25866666666666666, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
    } else if (lowerModel.includes("find x9 ultra")) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.251625, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
    } else if (lowerModel.includes("find x9 pro")) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.24032, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
    } else if (lowerModel.includes("reno16c")) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.2611940298507462, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
    } else if (lowerModel.includes("reno16")) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.2621428571428571, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
    }
  }
  return params;
};

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
  const lowerBrand = safeBrand.toLowerCase();
  
  const isXiaomiOrRedmi = lowerBrand === "xiaomi" || lowerBrand === "redmi" || lowerModel.includes("xiaomi") || lowerModel.includes("redmi");
  const isRedmiNote = isXiaomiOrRedmi && lowerModel.includes("note");
  const isVivo = lowerBrand === "vivo" || lowerModel.includes("vivo");
  const isVivoXFold = isVivo && lowerModel.includes("fold");
  const isOppo = lowerBrand === "oppo" || lowerModel.includes("oppo");
  const isOppoFindX9s = isOppo && lowerModel.includes("find x9s");
  const isOppoFindX9Ultra = isOppo && !isOppoFindX9s && lowerModel.includes("find x9 ultra");
  const isOppoFindX9Pro = isOppo && !isOppoFindX9s && !isOppoFindX9Ultra && lowerModel.includes("find x9 pro");
  const isOppoReno16c = isOppo && lowerModel.includes("reno16c");
  const isOppoReno16 = isOppo && lowerModel.includes("reno16") && !isOppoReno16c;

  let ageConfig: Record<string, number> = pricingConfig.ageBonus;
  if (isVivoXFold) ageConfig = pricingConfig.vivoXFoldSeriesAgeBonus;
  else if (isOppoFindX9s) ageConfig = pricingConfig.oppoFindX9sSeriesAgeBonus;
  else if (isOppoFindX9Ultra) ageConfig = pricingConfig.oppoFindX9UltraSeriesAgeBonus;
  else if (isOppoFindX9Pro) ageConfig = pricingConfig.oppoFindX9ProSeriesAgeBonus;
  else if (isOppoReno16) ageConfig = pricingConfig.oppoReno16SeriesAgeBonus;
  else if (isOppoReno16c) ageConfig = pricingConfig.oppoReno16cSeriesAgeBonus;
  else if (isRedmiNote) ageConfig = pricingConfig.redmiNoteSeriesAgeBonus;
  else if (isXiaomiOrRedmi) ageConfig = pricingConfig.xiaomiSeriesAgeBonus;
  else if (isVivo) ageConfig = pricingConfig.vivoXSeriesAgeBonus;

  const params = getAndroidModelParams(safeBrand, safeModel);
  const bodyScale = params.bodyScale || params.physicalScale;

  const applyGranularDefects = (scale: number, bScale: number) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach((d) => {
      let penalty = (pricingConfig.defects_screen_body as any)[d] || 0;
      if (d === "body_scratch") {
        let scratchPenalty = 0;
        let dentPenalty = 0;
        if (diagnostics.bodyScratches?.includes("More than 2")) {
          scratchPenalty = 0.05;
        } else if (diagnostics.bodyScratches?.includes("1-2")) {
          scratchPenalty = 0.02;
        }
        if (diagnostics.bodyDents?.includes("1-2")) {
          dentPenalty = 0.02;
        }
        penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
      }
      sum += penalty * scale;
    });
    return sum;
  };

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  const isOutOfWarranty = diagnostics.warranty === false || diagnostics.mobileAge === 'above11';

  if (isOutOfWarranty) {
    age_multiplier = ageConfig["above11"];
  } else if (diagnostics.mobileAge) {
    const ageKey = String(diagnostics.mobileAge).toLowerCase();
    if (ageKey.includes("below 3") || ageKey.includes("below3")) age_multiplier = ageConfig["below3"];
    else if (ageKey.includes("3") && ageKey.includes("6")) age_multiplier = ageConfig["3to6"];
    else if (ageKey.includes("6") && ageKey.includes("11")) age_multiplier = ageConfig["6to11"];
    else age_multiplier = ageConfig["above11"];
  } else {
    age_multiplier = ageConfig["below3"] || ageConfig["above11"];
  }
  
  if (!hasValidBill) {
    if (diagnostics.warranty !== false) {
      age_multiplier -= params.gstBillPenalty;
    }
  }

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1;
  
  screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const hasCharger = (diagnostics.accessories || []).includes("charger") || diagnostics.charger === true;

  let box_bonus = 0;
  if (hasBox) {
    box_bonus = pricingConfig.bonuses.box;
    if (hasCharger === false && diagnostics.charger !== undefined) {
      box_bonus -= pricingConfig.bonuses.missingChargerPenalty;
    }
  } else if (hasCharger) {
    box_bonus = pricingConfig.bonuses.chargerOnlyBonus;
  }
  
  let total_penalty_sum = (1 - calls_multiplier) + (1 - touch_multiplier) + (1 - screen_orig_mult) + screen_body_sum + functional_sum;

  const rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
  let cashifyPrice = rawCalculated + box_bonus;

  const exactCashifyPrice = Math.round(cashifyPrice);
  let upliftPercent = basePrice <= 20000 ? 1.08 : basePrice <= 50000 ? 1.06 : 1.04;
  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  const fhoneifyPrice = Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), floor_price);

  return {
    cashifyBasePrice: exactCashifyPrice,
    fhoneifyPrice: fhoneifyPrice
  };
}
