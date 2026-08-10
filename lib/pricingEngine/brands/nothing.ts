import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
