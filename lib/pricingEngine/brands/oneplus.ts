import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
