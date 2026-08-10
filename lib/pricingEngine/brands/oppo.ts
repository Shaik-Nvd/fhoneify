import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
