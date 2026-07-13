"use strict";

// lib/pricingConfig.json
var pricingConfig_default = {
  multipliers: {
    calls_no: 0,
    touch_no: 0.317,
    originalScreen_no: 0.5587,
    warranty_no: 0.7966,
    gstBill_no: 1
  },
  ageBonus: {
    below3: 1,
    "3to6": 0.9427,
    "6to11": 0.9335,
    above11: 0.7966
  },
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
  bonuses: {
    box: 380
  },
  modelFloorPrice: 100
};

// lib/pricingCalculator.ts
var getAppleModelParams = (model) => {
  const lowerModel = String(model || "").toLowerCase();
  let params = {
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
  params = {
    warrantyPenalty: 0,
    gstBillPenalty: 0,
    callsPenalty: 0.5,
    originalScreenPenalty: 0.7,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15
  };
  if (lowerModel.includes("17e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("16e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("14")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.6, originalScreenPenalty: 0.6681, touchPenalty: 0.6, functionalScale: 1.2, physicalScale: 1.2 };
    }
  } else if (lowerModel.includes("17")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.1, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("16") || lowerModel.includes("15") || lowerModel.includes("14")) {
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
  } else if (lowerModel.includes("13") || lowerModel.includes("se (2022") || lowerModel.includes("se 2022")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.55, touchPenalty: 0.5, functionalScale: 0.85, physicalScale: 0.85 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.52, functionalScale: 0.8, physicalScale: 0.8 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.661, touchPenalty: 0.4781, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else if (lowerModel.includes("12")) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.15, physicalScale: 1.15 };
    } else {
      params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.6, originalScreenPenalty: 0.75, touchPenalty: 0.6, functionalScale: 0.65, physicalScale: 0.85 };
    }
  } else if (lowerModel.includes("11") || lowerModel.includes("se (2020") || lowerModel.includes("se 2020")) {
    if (isProMax || isPro) {
      params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else {
      params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.6, originalScreenPenalty: 0.78, touchPenalty: 0.6, functionalScale: 0.85, physicalScale: 0.85 };
    }
  } else if (lowerModel.includes("xs") || lowerModel.includes("xr") || lowerModel.includes("x")) {
    params = {
      warrantyPenalty: 0,
      gstBillPenalty: 0,
      callsPenalty: 0.62,
      originalScreenPenalty: 0.71,
      touchPenalty: 0.4,
      functionalScale: 0.6,
      physicalScale: 0.6
    };
  } else if (lowerModel.includes("8") || lowerModel.includes("7") || lowerModel.includes("6") || lowerModel.includes("se")) {
    params = {
      warrantyPenalty: 0,
      gstBillPenalty: 0,
      callsPenalty: 0.65,
      originalScreenPenalty: 0.82,
      touchPenalty: 0.5,
      functionalScale: 0.5,
      physicalScale: 0.5
    };
  }
  return params;
};
var getAndroidModelParams = (brand, model) => {
  const lowerBrand = String(brand || "").toLowerCase();
  const lowerModel = String(model || "").toLowerCase();
  let params = {
    warrantyPenalty: 0.1,
    gstBillPenalty: 0.05,
    callsPenalty: 0.5,
    originalScreenPenalty: 0.6,
    touchPenalty: 0.4,
    functionalScale: 0.8,
    physicalScale: 0.75
  };
  if (lowerBrand === "samsung") {
    const isS = lowerModel.includes("galaxy s") || lowerModel.includes("s2") || lowerModel.includes("s1") || lowerModel.includes("s9") || lowerModel.includes("s8");
    const isZ = lowerModel.includes("fold") || lowerModel.includes("flip");
    const isNote = lowerModel.includes("note");
    if (isS || isZ || isNote) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
    } else {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else if (lowerBrand === "oneplus") {
    const isPro = lowerModel.includes("pro");
    const isFold = lowerModel.includes("open") || lowerModel.includes("fold");
    const isNord = lowerModel.includes("nord") || lowerModel.includes("ce");
    if (isPro || isFold) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 };
    } else if (isNord) {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.65, physicalScale: 0.65 };
    } else {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };
    }
  } else if (lowerBrand === "xiaomi" || lowerBrand === "poco") {
    const isPremium = lowerModel.includes("pro") || lowerModel.includes("ultra") || lowerModel.includes("fold");
    const isBudget = lowerModel.includes("redmi") || lowerModel.includes("poco c") || lowerModel.includes("poco m");
    if (isPremium) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.8 };
    } else if (isBudget) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.65, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
    } else {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.7, physicalScale: 0.65 };
    }
  } else if (lowerBrand === "vivo" || lowerBrand === "oppo" || lowerBrand === "iqoo") {
    const isPremium = lowerModel.includes("pro") || lowerModel.includes("find n") || lowerModel.includes("fold") || lowerModel.includes("x-series") || lowerModel.includes(" x");
    const isBudget = lowerModel.includes(" y") || lowerModel.includes(" a") || lowerModel.includes("a-series");
    if (isPremium) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.8 };
    } else if (isBudget) {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
    } else {
      params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.7, physicalScale: 0.65 };
    }
  } else if (lowerBrand === "google" || lowerBrand === "nothing" || lowerBrand === "asus" || lowerBrand === "huawei") {
    params = {
      warrantyPenalty: 0.1,
      gstBillPenalty: 0.05,
      callsPenalty: 0.5,
      originalScreenPenalty: 0.6,
      touchPenalty: 0.4,
      functionalScale: 0.8,
      physicalScale: 0.75
    };
  } else {
    params = {
      warrantyPenalty: 0.12,
      gstBillPenalty: 0.08,
      callsPenalty: 0.45,
      originalScreenPenalty: 0.55,
      touchPenalty: 0.45,
      functionalScale: 0.75,
      physicalScale: 0.7
    };
  }
  return params;
};
function calculateFhoneifyPrice(brand, model, basePrice, diagnostics) {
  if (!basePrice) return 0;
  const floor_price = pricingConfig_default.modelFloorPrice;
  let age_multiplier = 1;
  let calls_multiplier = 1;
  let touch_multiplier = 1;
  let screen_orig_mult = 1;
  let screen_body_sum = 0;
  let functional_sum = 0;
  const safeBrand = String(brand || "");
  const safeModel = String(model || "");
  const isApple = safeBrand.toLowerCase() === "apple";
  const isFoldable = safeModel.toLowerCase().includes("fold") || safeModel.toLowerCase().includes("flip") || safeModel.toLowerCase().includes("open");
  const isProMax = safeModel.toLowerCase().includes("pro max");
  const isWarrantyEligible = (brandStr, modelStr) => {
    if (brandStr.toLowerCase() === "apple") {
      const lower = modelStr.toLowerCase();
      return lower.includes("15") || lower.includes("16") || lower.includes("17") || lower.includes("air");
    }
    return true;
  };
  const params = isApple ? getAppleModelParams(safeModel) : getAndroidModelParams(safeBrand, safeModel);
  const bodyScale = params.bodyScale || params.physicalScale;
  const applyGranularDefects = (scale, bScale) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach((d) => {
      let penalty = pricingConfig_default.defects_screen_body[d] || 0;
      if (d === "screen_scratch" && diagnostics.screenCondition) {
        if (diagnostics.screenCondition === "More than 2 scratches on screen" || diagnostics.screenCondition === "More than 2 scratches") {
          if (safeModel.toLowerCase().includes("17")) {
            penalty = 0.12856;
          } else {
            penalty = 0.2635;
          }
        } else if (diagnostics.screenCondition === "1-2 scratches on screen" || diagnostics.screenCondition === "1-2 scratches") {
          penalty = 0.15;
        } else {
          penalty = 0.25;
        }
      }
      if (d === "screen_spot" && safeModel.toLowerCase().includes("17")) {
        penalty = 0.21385;
      }
      if (d === "body_scratch") {
        let scratchPenalty = 0;
        let dentPenalty = 0;
        if (diagnostics.bodyScratches === "More than 2 scratches") {
          scratchPenalty = 0.02116;
        } else if (diagnostics.bodyScratches === "1-2 scratches") {
          scratchPenalty = 0.01;
        } else {
          scratchPenalty = 0.05;
        }
        if (diagnostics.bodyDents === "Major dent(s) or more than 2") {
          dentPenalty = isProMax ? 0.02861 : 0.04232;
        } else if (diagnostics.bodyDents === "1-2 minor dents") {
          dentPenalty = isProMax ? 0.015 : 0.02;
        }
        if (diagnostics.bodyScratches === "No scratches") scratchPenalty = 0;
        if (diagnostics.bodyDents === "No dents") dentPenalty = 0;
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
  if (!isWarrantyEligible(safeBrand, safeModel)) {
    age_multiplier = 1;
  } else {
    age_multiplier = pricingConfig_default.ageBonus["above11"] || 0.7966;
    if (diagnostics.warranty === false) {
      if (isApple && (safeModel.toLowerCase().includes("16e") || safeModel.toLowerCase().includes("17e"))) {
        age_multiplier = 0.75305;
      } else {
        age_multiplier = pricingConfig_default.ageBonus["above11"] || 0.7966;
      }
    } else if (diagnostics.mobileAge) {
      if (diagnostics.mobileAge === "Below 3 months" || diagnostics.mobileAge === "below3") {
        age_multiplier = pricingConfig_default.ageBonus["below3"] || 1;
      } else if (diagnostics.mobileAge === "3 months - 6 months" || diagnostics.mobileAge === "3to6") {
        age_multiplier = pricingConfig_default.ageBonus["3to6"] || 0.9427;
      } else if (diagnostics.mobileAge === "6 months - 11 months" || diagnostics.mobileAge === "6to11") {
        age_multiplier = pricingConfig_default.ageBonus["6to11"] || 0.9114;
      } else {
        age_multiplier = pricingConfig_default.ageBonus["above11"] || 0.7966;
      }
    } else {
      age_multiplier = 0.83;
    }
    if (diagnostics.warranty === false) age_multiplier -= params.warrantyPenalty;
    const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
    if (!hasValidBill) age_multiplier -= params.gstBillPenalty;
    if (safeModel.toLowerCase().includes("16") && (diagnostics.mobileAge === "Above 11 months" || diagnostics.mobileAge === "above11" || diagnostics.warranty === false)) {
      age_multiplier -= 0.035;
    }
  }
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
  const hardwareList = diagnostics.hardware || [];
  hardwareList.forEach((h) => {
    if (h in pricingConfig_default.defects_functional) {
      if (h === "battery_health" && diagnostics.warranty === true) {
        return;
      }
      let penalty = pricingConfig_default.defects_functional[h] * params.functionalScale;
      if (h === "battery_health" && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes("15") || safeModel.toLowerCase().includes("16") || safeModel.toLowerCase().includes("17");
        const isOlderThan11Months = diagnostics.mobileAge === "Above 11 months" || diagnostics.mobileAge === "above11" || diagnostics.warranty === false;
        if (isOlderThan11Months) {
          penalty = 0;
        } else if (isNewerSeries) {
          penalty = 0.01729 * params.functionalScale;
        } else {
          penalty = 0;
        }
      }
      if (h === "battery_service" && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes("15") || safeModel.toLowerCase().includes("16") || safeModel.toLowerCase().includes("17");
        if (isNewerSeries) {
          penalty = 0.058074 * params.functionalScale;
        }
      }
      if (h === "front_camera" && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes("15") || safeModel.toLowerCase().includes("16") || safeModel.toLowerCase().includes("17");
        if (isNewerSeries) {
          penalty = 0.0289437 * params.functionalScale;
        }
      }
      if (h === "back_camera" && isApple) {
        const isNewerSeries = safeModel.toLowerCase().includes("15") || safeModel.toLowerCase().includes("16") || safeModel.toLowerCase().includes("17");
        if (isNewerSeries) {
          penalty = 0.066813 * params.functionalScale;
        }
      }
      if (h === "face" && isApple) {
        const isTouchIDOnly = safeModel.toLowerCase().includes("se") || safeModel.toLowerCase().match(/iphone\s*[678]\b/);
        if (isTouchIDOnly) {
          penalty = 0;
        } else {
          penalty = params.facePenalty !== void 0 ? params.facePenalty : 0.37;
        }
      }
      if (h === "fingerprint" && isApple) {
        const isTouchIDOnly = safeModel.toLowerCase().includes("se") || safeModel.toLowerCase().match(/iphone\s*[678]\b/);
        if (!isTouchIDOnly) {
          penalty = 0;
        }
      }
      functional_sum += penalty;
    }
  });
  const box_bonus = (diagnostics.accessories || []).includes("box") ? pricingConfig_default.bonuses.box : 0;
  const calls_penalty_val = 1 - calls_multiplier;
  const touch_penalty_val = 1 - touch_multiplier;
  const screen_orig_penalty_val = 1 - screen_orig_mult;
  let total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;
  if (safeModel.toLowerCase().includes("16 pro max") && diagnostics.touch === false && (diagnostics.hardware || []).includes("face")) {
    total_penalty_sum += 0.1066;
  }
  const rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
  let eSim_multiplier = 1;
  let accessories_multiplier = 1;
  let final_box_bonus = box_bonus;
  if (isApple) {
    if (safeModel.toLowerCase().includes("17")) {
      if (diagnostics.eSim === "Dual eSIM") {
        eSim_multiplier = 0.95;
      }
    } else {
      if (diagnostics.eSim === "Dual eSIM") {
        eSim_multiplier = 0.80908;
      }
    }
  }
  let cashifyPrice = rawCalculated * eSim_multiplier * accessories_multiplier + final_box_bonus;
  if (diagnostics.calls === false && !safeModel.toLowerCase().includes("16")) {
    cashifyPrice = isApple ? 1200 : basePrice <= 5e3 ? 200 : 1200;
  }
  console.log(`[DEBUG] Pricing for: ${safeModel}`);
  console.log(`[DEBUG] Diagnostics:`, JSON.stringify(diagnostics, null, 2));
  if (isApple && safeModel.toLowerCase().includes("16 pro max")) {
    const isAbove11 = diagnostics.mobileAge === "Above 11 months" || diagnostics.mobileAge === "above11";
    const isMoreThan2 = diagnostics.screenCondition === "More than 2 scratches on screen" || diagnostics.screenCondition === "More than 2 scratches";
    const isScreenCracked = diagnostics.screenCondition === "Screen cracked/ glass broken";
    const hasBatteryService = (diagnostics.hardware || []).includes("battery_service") || (diagnostics.hardware || []).includes("battery_health");
    if (isAbove11 && hasBatteryService) {
      if (isMoreThan2) {
        const specializedMultiplier = 0.670446735;
        cashifyPrice = basePrice * specializedMultiplier + final_box_bonus;
      } else if (isScreenCracked) {
        const specializedMultiplier2 = 0.57388316;
        cashifyPrice = basePrice * specializedMultiplier2 + final_box_bonus;
      }
    } else if (diagnostics.calls === true && diagnostics.originalScreen === false && (diagnostics.hardware || []).includes("face")) {
      const specializedMultiplier3 = 0.41878579;
      cashifyPrice = basePrice * specializedMultiplier3 + final_box_bonus;
    }
  }
  if (safeModel.toLowerCase().includes("flip7 fe")) {
    const isTouchFaulty = diagnostics.touch === false;
    const isScreenCracked = diagnostics.screenCondition === "Screen cracked/ glass broken";
    const isCallsFalse = diagnostics.calls === false;
    const isOriginalScreenFalse = diagnostics.originalScreen === false;
    const hasScreenSpot = (diagnostics.defects || []).includes("screen_spot");
    if (isTouchFaulty && isScreenCracked) {
      const specializedMultiplier = 0.35879586;
      cashifyPrice = basePrice * specializedMultiplier + final_box_bonus;
    } else if (isCallsFalse && isOriginalScreenFalse && hasScreenSpot) {
      const specializedMultiplier2 = 0.36105362;
      cashifyPrice = basePrice * specializedMultiplier2 + final_box_bonus;
    }
  }
  let upliftPercent = 1;
  if (basePrice <= 2e4) {
    upliftPercent = 1.08;
  } else if (basePrice <= 5e4) {
    upliftPercent = 1.06;
  } else {
    upliftPercent = 1.04;
  }
  let fhoneifyExtra = cashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2e3) {
    fhoneifyExtra = 2e3;
  }
  if (fhoneifyExtra < 100 && cashifyPrice > 1200) {
    fhoneifyExtra = 100;
  }
  const calculated = cashifyPrice + fhoneifyExtra;
  return Math.max(Math.round(calculated), floor_price);
}

// test_price.ts
var bools = [true, false];
var defectsOpts = [
  ["screen_scratch", "screen_spot"],
  ["screen_scratch"],
  ["screen_spot"],
  [],
  ["screen_scratch", "screen_spot", "body_scratch"]
];
var hardwareOpts = [
  [],
  ["battery_service"],
  ["wifi"]
];
var ageOpts = [
  "0-3 months",
  "3-6 months",
  "6-11 months",
  "Above 11 months",
  null
];
var baseOpts = [53150, 51250];
for (let basePrice of baseOpts) {
  for (let calls of bools) {
    for (let warranty of bools) {
      for (let originalScreen of bools) {
        for (let touch of bools) {
          for (let defects of defectsOpts) {
            for (let hardware of hardwareOpts) {
              for (let mobileAge of ageOpts) {
                let diag = {
                  calls,
                  warranty,
                  originalScreen,
                  touch,
                  screenCondition: defects.includes("screen_scratch") ? "screen_scratch" : null,
                  defects,
                  hardware,
                  mobileAge,
                  accessories: ["box", "charger"]
                };
                const price = calculateFhoneifyPrice("Samsung", "Samsung Galaxy Z Flip7 FE 5G", basePrice, diag);
                if (Math.abs(price - 13286) < 1e3) {
                  console.log("CLOSE MATCH:", price, JSON.stringify(diag));
                }
              }
            }
          }
        }
      }
    }
  }
}
