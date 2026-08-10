import { DiagnosticsType, PricingResult } from "../types";
import { COMMON_BONUSES, applyCompetitorUplift } from "../commonHelpers";

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
