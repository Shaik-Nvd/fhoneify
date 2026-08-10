import { DiagnosticsType, PricingResult } from "./types";
import { calculateApplePrice } from "./brands/apple";
import { calculateSamsungPrice } from "./brands/samsung";
import { calculateXiaomiPrice } from "./brands/xiaomi";
import { calculateVivoPrice } from "./brands/vivo";
import { calculateOppoPrice } from "./brands/oppo";
import { calculateOnePlusPrice } from "./brands/oneplus";
import { calculateNothingPrice } from "./brands/nothing";
import { calculateGenericAndroidPrice } from "./brands/genericAndroid";

export function calculateFhoneifyPrice(
  brand: string,
  model: string,
  basePrice: number,
  diagnostics: DiagnosticsType
): PricingResult {
  const safeBrand = String(brand || "").toLowerCase().trim();
  const safeModel = String(model || "").toLowerCase().trim();

  // Route 1: Apple
  if (safeBrand === "apple" || safeModel.includes("iphone")) {
    return calculateApplePrice(model, basePrice, diagnostics);
  }

  // Route 2: Samsung
  if (safeBrand === "samsung" || safeModel.includes("galaxy")) {
    return calculateSamsungPrice(model, basePrice, diagnostics);
  }

  // Route 3: Xiaomi / Redmi / POCO
  if (
    safeBrand === "xiaomi" || safeBrand === "redmi" || safeBrand === "poco" ||
    safeModel.includes("xiaomi") || safeModel.includes("redmi") || safeModel.includes("poco")
  ) {
    return calculateXiaomiPrice(model, basePrice, diagnostics);
  }

  // Route 4: Vivo / iQOO
  if (
    safeBrand === "vivo" || safeBrand === "iqoo" ||
    safeModel.includes("vivo") || safeModel.includes("iqoo")
  ) {
    return calculateVivoPrice(model, basePrice, diagnostics);
  }

  // Route 5: OPPO
  if (
    safeBrand === "oppo" || safeModel.includes("oppo") ||
    safeModel.includes("reno") || safeModel.includes("find x")
  ) {
    return calculateOppoPrice(model, basePrice, diagnostics);
  }

  // Route 6: OnePlus
  if (
    safeBrand === "oneplus" || safeModel.includes("oneplus") || safeModel.includes("nord")
  ) {
    return calculateOnePlusPrice(model, basePrice, diagnostics);
  }

  // Route 7: Nothing / CMF
  if (
    safeBrand === "nothing" || safeBrand === "cmf" ||
    safeModel.includes("nothing") || safeModel.includes("cmf")
  ) {
    return calculateNothingPrice(model, basePrice, diagnostics);
  }

  // Route 8: Generic Fallback (Realme, Motorola, Lenovo, Nokia, Honor, Asus, Google, LG, Infinix, Tecno, Huawei, etc.)
  return calculateGenericAndroidPrice(brand, model, basePrice, diagnostics);
}
