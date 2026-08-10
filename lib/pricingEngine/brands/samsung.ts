import { DiagnosticsType, ModelParams, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
