import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, COMMON_FUNCTIONAL_PENALTIES, applyCompetitorUplift } from "../commonHelpers";

export function calculateApplePrice(model: string, basePrice: number, diagnostics: DiagnosticsType): PricingResult {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");

  let params: ModelParams = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.7,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15
  };

  if (lowerModel.includes("17e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("16e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("17")) {
    if (isProMax || isPlus) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    else if (isPro) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    else params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.1, physicalScale: 1.05, facePenalty: 0.05 };
  } else if (lowerModel.includes("16") || lowerModel.includes("15")) {
    if (lowerModel.includes("16 pro max")) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    else if (isProMax) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    else if (isPro || isPlus) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    else if (lowerModel === "apple iphone 15" || lowerModel === "iphone 15") params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1, physicalScale: 1 };
    else params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.7, touchPenalty: 0.55, functionalScale: 1, physicalScale: 1 };
  } else if (lowerModel.includes("14")) {
    if (isProMax || isPlus) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
    else params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.6, originalScreenPenalty: 0.6681, touchPenalty: 0.6, functionalScale: 1.2, physicalScale: 1.2 };
  }

  let ageMultiplier = 0.7966;
  if (diagnostics.warranty !== false) {
    const ageKey = String(diagnostics.mobileAge || "").toLowerCase();
    if (ageKey.includes("below 3")) ageMultiplier = 1.0;
    else if (ageKey.includes("3") && ageKey.includes("6")) ageMultiplier = 0.9427;
    else if (ageKey.includes("6") && ageKey.includes("11")) ageMultiplier = 0.9114;
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const callsMult = diagnostics.calls === false ? params.callsPenalty : 1;
  const touchMult = diagnostics.touch === false ? params.touchPenalty : 1;
  let screenOrigMult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1;
  if (diagnostics.touch === false || (diagnostics.defects || []).includes("broken_screen")) screenOrigMult = 1;

  let functionalSum = 0;
  (diagnostics.hardware || []).forEach((h) => {
    if (h in COMMON_FUNCTIONAL_PENALTIES) functionalSum += COMMON_FUNCTIONAL_PENALTIES[h] * params.functionalScale;
  });

  const bScale = params.bodyScale || params.physicalScale;
  let physicalSum = 0;
  (diagnostics.defects || []).forEach((d) => {
    if (d === "screen_scratch" && diagnostics.screenCondition) {
      const penalty = diagnostics.screenCondition.includes("More than 2") ? (lowerModel.includes("17") ? 0.12856 : 0.2635) : 0.15;
      physicalSum += penalty * params.physicalScale;
    } else if (d === "body_scratch") {
      let scratch = diagnostics.bodyScratches?.includes("More than 2") ? 0.02116 : 0.01;
      let dent = diagnostics.bodyDents?.includes("Major") ? (isProMax ? 0.02861 : 0.04232) : diagnostics.bodyDents?.includes("1-2") ? (isProMax ? 0.015 : 0.02) : 0;
      if (!diagnostics.bodyScratches || diagnostics.bodyScratches.includes("No")) scratch = 0;
      if (!diagnostics.bodyDents || diagnostics.bodyDents.includes("No")) dent = 0;
      physicalSum += (scratch + dent) * bScale;
    } else if (d in COMMON_FUNCTIONAL_PENALTIES) {
      physicalSum += (COMMON_FUNCTIONAL_PENALTIES[d] || 0) * params.physicalScale;
    }
  });

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const totalPenaltySum = (1 - callsMult) + (1 - touchMult) + (1 - screenOrigMult) + physicalSum + functionalSum;
  let cashifyPrice = basePrice * ageMultiplier * Math.max(0, 1 - totalPenaltySum) + boxBonus;

  if (diagnostics.calls === false) cashifyPrice = 1200;

  const exactCashifyPrice = Math.round(cashifyPrice);
  return { cashifyBasePrice: exactCashifyPrice, fhoneifyPrice: applyCompetitorUplift(basePrice, exactCashifyPrice) };
}
