import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
