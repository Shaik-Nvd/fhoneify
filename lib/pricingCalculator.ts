import { CASHIFY_CALIBRATION } from './pricing/calibration';
import { UNKNOWN_QUESTIONNAIRE, type QuestionnaireSemantics } from './pricing/questionnaireSemantics';
import { inrConditionValue, resolveInrGroup, type InrDeductionConfig } from './pricing/inrDeductions';
import { xiaomiInrDeductions } from './pricing/inrDeductionTables';

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
 * Price semantics. These names exist because two different concepts were
 * once both called `basePrice`:
 *
 * - CashifyGetUptoReference: Cashify's live public "Get Upto" figure for the
 *   exact variant (ReferencePrice.currentPrice, source "cashify"). It is
 *   already Cashify's best-case used-device offer, not a new/launch price, so
 *   it must never be depreciated to produce Fhoneify's own "Get Upto".
 * - The pre-2026-09-16 `lib/cashify_prices.json` values were a different,
 *   pre-inflated base (Get Upto / model multiplier, commit cbc344a). The file
 *   is now regenerated from ReferencePrice, so it holds Get Upto values too.
 * - CashifyConditionEquivalent: what Cashify's own questionnaire pays for the
 *   customer's answers (final offer only).
 * - FhoneifyGetUpto / FhoneifyFinalOffer: the two figures after the existing
 *   applyCompetitorUplift rule.
 */
export type CashifyGetUptoReference = number;
export type CashifyConditionEquivalent = number;
export type FhoneifyGetUpto = number;
export type FhoneifyFinalOffer = number;

export interface PricingResult {
  cashifyConditionEquivalent: CashifyConditionEquivalent;
  fhoneifyPrice: FhoneifyFinalOffer;
}

// ============================================================================
// SHARED CONSTANTS & HELPERS
// ============================================================================

export const COMMON_BONUSES = {
  box: 380,
  missingChargerPenalty: 80,
  missingChargerA34Penalty: 280,
  chargerOnlyBonus: 280,
  floorPrice: 100
};

export const COMMON_FUNCTIONAL_PENALTIES: Record<string, number> = {
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
};

/**
 * Condition values restored from the repository's granular-questionnaire
 * commits (1a4501c and 8623ff9). They are shared by every brand; brand/model
 * rules only scale them through ModelParams. Keeping the values here prevents
 * another brand calculator from silently forgetting a questionnaire field.
 */
export const GRANULAR_CONDITION_PENALTIES = {
  screen: {
    cracked: 0.35,
    chipped: 0.20,
    scratchesHeavy: 0.15,
    scratchesLight: 0.08,
    spotsHeavy: 0.25,
    spotsLight: 0.15,
    lines: 0.30,
    fadedEdges: 0.20,
    discolorationMajor: 0.25,
    discolorationMinor: 0.10,
  },
  body: {
    scratchesHeavy: 0.08,
    scratchesLight: 0.03,
    dentsMajor: 0.12,
    dentsMinor: 0.05,
    panelMissing: 0.20,
    panelCracked: 0.15,
    bent: 0.25,
    looseScreen: 0.15,
  },
} as const;

export interface ConditionAdjustmentBreakdown {
  touchRetention: number;
  originalScreenRetention: number;
  screenPenalty: number;
  bodyPenalty: number;
  functionalPenalty: number;
  conditionRetention: number;
}

interface ConditionAdjustmentOptions {
  touchRetention?: number;
  originalScreenRetention?: number;
  functionalOverrides?: Record<string, number>;
  heavyScreenScratchScale?: number;
  lightScreenScratchScale?: number;
  /** Scale on the heavy body tier (>2 scratches, major dents) where a
   * family has Cashify body evidence (lib/pricing/calibration.ts). */
  heavyBodyCosmeticScale?: number;
  /** Cashify questionnaire regime of the model (display values differ). */
  questionnaire?: QuestionnaireSemantics;
}

const lower = (value: unknown) => String(value ?? '').toLowerCase();

/**
 * Converts the UI diagnostics into one transparent set of condition factors.
 * Physical alternatives within one repair group use the largest applicable
 * deduction. Distinct deductions are summed against the age-adjusted base,
 * matching the penalty-summation model in place immediately before f1034f4.
 * A failed touch screen supersedes other screen-replacement charges, matching
 * the historical no-double-charge behavior.
 */
export function calculateConditionAdjustments(
  diagnostics: DiagnosticsType,
  params: ModelParams,
  options: ConditionAdjustmentOptions = {}
): ConditionAdjustmentBreakdown {
  const result = rawConditionAdjustments(diagnostics, params, options);
  // A failed touch screen or cracked glass supersedes the other screen
  // charges, so it must be charged at least what the same phone is charged
  // without it: the largest applicable screen deduction, never a smaller one
  // (e.g. a NOT_ASKED local-display deduction can exceed the cracked rule).
  const lesser: DiagnosticsType[] = [];
  if (diagnostics.touch === false) lesser.push({ ...diagnostics, touch: true });
  const screenCondition = lower(diagnostics.screenCondition);
  if (screenCondition.includes('cracked') || screenCondition.includes('glass broken') || (diagnostics.defects || []).includes('broken_screen')) {
    lesser.push({ ...diagnostics, screenCondition: null, defects: (diagnostics.defects || []).filter((d) => d !== 'broken_screen' && d !== 'screen_scratch') });
  }
  let strictest = result;
  for (const candidate of lesser) {
    const without = calculateConditionAdjustments(candidate, params, options);
    if (without.conditionRetention < strictest.conditionRetention) strictest = without;
  }
  return strictest;
}

function rawConditionAdjustments(
  diagnostics: DiagnosticsType,
  params: ModelParams,
  options: ConditionAdjustmentOptions
): ConditionAdjustmentBreakdown {
  const defects = new Set(diagnostics.defects || []);
  const screenCondition = lower(diagnostics.screenCondition);
  const screenSpots = lower(diagnostics.screenSpots);
  const screenLines = lower(diagnostics.screenLines);
  const screenDiscoloration = lower(diagnostics.screenDiscoloration);
  const bodyScratches = lower(diagnostics.bodyScratches);
  const bodyDents = lower(diagnostics.bodyDents);
  const bodyPanel = lower(diagnostics.bodyPanel);
  const bodyBent = lower(diagnostics.bodyBent);
  const bentOrCurved = (bodyBent.includes('bent') && !bodyBent.includes('not bent')) || bodyBent.includes('curved');

  const touchFailed = diagnostics.touch === false;
  const crackedScreen = screenCondition.includes('cracked') || screenCondition.includes('glass broken') || defects.has('broken_screen');

  let touchRetention = touchFailed ? (options.touchRetention ?? params.touchPenalty) : 1;
  let originalScreenRetention = diagnostics.originalScreen === false
    // Local/copy display: calibrated against real Cashify quotes on live Get
    // Upto references (lib/pricing/calibration.ts); brands may override.
    ? (options.originalScreenRetention ?? (options.questionnaire?.warrantyMode === 'NOT_ASKED'
      ? CASHIFY_CALIBRATION.localDisplay.notAskedAndroidRetention
      : CASHIFY_CALIBRATION.localDisplay.androidRetention))
    : 1;

  let physicalScreenPenalty = 0;
  let physicalScreenScale = params.physicalScale;
  if (defects.has('screen_scratch') || defects.has('broken_screen') || screenCondition) {
    if (crackedScreen && !screenCondition.includes('outside display')) physicalScreenPenalty = GRANULAR_CONDITION_PENALTIES.screen.cracked;
    else if (screenCondition.includes('outside display')) physicalScreenPenalty = GRANULAR_CONDITION_PENALTIES.screen.chipped;
    else if (screenCondition.includes('more than 2')) {
      physicalScreenPenalty = GRANULAR_CONDITION_PENALTIES.screen.scratchesHeavy;
      physicalScreenScale = options.heavyScreenScratchScale ?? params.physicalScale;
    }
    else if (screenCondition.includes('1-2')) {
      physicalScreenPenalty = GRANULAR_CONDITION_PENALTIES.screen.scratchesLight;
      physicalScreenScale = options.lightScreenScratchScale ?? params.physicalScale;
    }
    else physicalScreenPenalty = GRANULAR_CONDITION_PENALTIES.screen.cracked;
  }

  let displayPenalty = 0;
  if (defects.has('screen_spot') || screenSpots || screenLines || screenDiscoloration) {
    if (screenSpots.includes('large') || screenSpots.includes('3 or more')) displayPenalty = GRANULAR_CONDITION_PENALTIES.screen.spotsHeavy;
    else if (screenSpots.includes('1-2')) displayPenalty = GRANULAR_CONDITION_PENALTIES.screen.spotsLight;
    if (screenLines.includes('visible line')) displayPenalty = Math.max(displayPenalty, GRANULAR_CONDITION_PENALTIES.screen.lines);
    else if (screenLines.includes('faded')) displayPenalty = Math.max(displayPenalty, GRANULAR_CONDITION_PENALTIES.screen.fadedEdges);
    if (screenDiscoloration.includes('major')) displayPenalty = Math.max(displayPenalty, GRANULAR_CONDITION_PENALTIES.screen.discolorationMajor);
    else if (screenDiscoloration.includes('minor')) displayPenalty = Math.max(displayPenalty, GRANULAR_CONDITION_PENALTIES.screen.discolorationMinor);
    if (defects.has('screen_spot') && !screenSpots && !screenLines && !screenDiscoloration) {
      displayPenalty = GRANULAR_CONDITION_PENALTIES.screen.spotsHeavy;
    }
  }

  // Touch failure or a cracked display already implies screen replacement.
  // Do not stack original-screen and cosmetic screen replacement charges.
  if (touchFailed) {
    originalScreenRetention = 1;
    physicalScreenPenalty = 0;
    displayPenalty = 0;
  } else if (crackedScreen) {
    originalScreenRetention = 1;
  }

  const screenPenalty = Math.min(1, Math.max(
    physicalScreenPenalty * physicalScreenScale,
    displayPenalty * params.physicalScale,
  ));

  let cosmeticBodyPenalty = 0;
  if (defects.has('body_scratch') || bodyScratches || bodyDents) {
    if (bodyScratches.includes('more than 2')) cosmeticBodyPenalty += Math.max(GRANULAR_CONDITION_PENALTIES.body.scratchesLight, GRANULAR_CONDITION_PENALTIES.body.scratchesHeavy * (options.heavyBodyCosmeticScale ?? 1));
    else if (bodyScratches.includes('1-2')) cosmeticBodyPenalty += GRANULAR_CONDITION_PENALTIES.body.scratchesLight;
    if (bodyDents.includes('major') || bodyDents.includes('more than 2')) cosmeticBodyPenalty += Math.max(GRANULAR_CONDITION_PENALTIES.body.dentsMinor, GRANULAR_CONDITION_PENALTIES.body.dentsMajor * (options.heavyBodyCosmeticScale ?? 1));
    else if (bodyDents.includes('1-2')) cosmeticBodyPenalty += GRANULAR_CONDITION_PENALTIES.body.dentsMinor;
  }

  let panelPenalty = 0;
  if (defects.has('panel_missing') || defects.has('body_bent') || bodyPanel || bodyBent) {
    if (bodyPanel.includes('missing')) panelPenalty = GRANULAR_CONDITION_PENALTIES.body.panelMissing;
    else if (bodyPanel.includes('cracked') || bodyPanel.includes('broken')) panelPenalty = GRANULAR_CONDITION_PENALTIES.body.panelCracked;
    if (bentOrCurved) panelPenalty = Math.max(panelPenalty, GRANULAR_CONDITION_PENALTIES.body.bent);
    else if (bodyBent.includes('loose screen') || bodyBent.includes('gap')) panelPenalty = Math.max(panelPenalty, GRANULAR_CONDITION_PENALTIES.body.looseScreen);
    if (defects.has('panel_missing') && !bodyPanel && !bodyBent) panelPenalty = GRANULAR_CONDITION_PENALTIES.body.panelMissing;
  }

  const bodyPenalty = Math.min(1, (cosmeticBodyPenalty + panelPenalty) * (params.bodyScale ?? params.physicalScale));

  let functionalPenalty = 0;
  for (const hardware of new Set(diagnostics.hardware || [])) {
    const override = options.functionalOverrides?.[hardware];
    if (override !== undefined) functionalPenalty += override;
    else if (COMMON_FUNCTIONAL_PENALTIES[hardware] !== undefined) functionalPenalty += COMMON_FUNCTIONAL_PENALTIES[hardware] * params.functionalScale;
  }
  functionalPenalty = Math.min(1, functionalPenalty);

  // A local display and cosmetic body damage overlap: Cashify charges the
  // larger one in full and only part of the smaller (S24 controls 2026-09-24:
  // display ₹22,300, body ₹24,320, both ₹21,220). Every other group adds.
  const displayDeduction = 1 - originalScreenRetention;
  const overlapping = displayDeduction > 0 && bodyPenalty > 0
    ? Math.max(displayDeduction, bodyPenalty) + CASHIFY_CALIBRATION.damageOverlap.displayAndBodySecondFactor * Math.min(displayDeduction, bodyPenalty)
    : displayDeduction + bodyPenalty;
  const totalPenalty = (1 - touchRetention) +
    overlapping +
    screenPenalty +
    functionalPenalty;
  const conditionRetention = Math.max(0, 1 - totalPenalty);

  return { touchRetention, originalScreenRetention, screenPenalty, bodyPenalty, functionalPenalty, conditionRetention };
}

export function applyCompetitorUplift(basePrice: number, exactCashifyPrice: number): number {
  let upliftPercent = 1;
  if (basePrice <= 20000) upliftPercent = 1.08;
  else if (basePrice <= 50000) upliftPercent = 1.06;
  else upliftPercent = 1.04;

  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;

  return Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), COMMON_BONUSES.floorPrice);
}

/**
 * Fhoneify's public "Get Upto": Cashify's Get Upto plus the existing uplift.
 * No age, warranty, condition or accessory rule runs here - the customer has
 * not answered anything yet, and the reference is already Cashify's ceiling.
 */
export function computeFhoneifyGetUpto(reference: CashifyGetUptoReference): FhoneifyGetUpto {
  return applyCompetitorUplift(reference, reference);
}

/**
 * The age/warranty/bill factor, following Cashify's own questionnaire. When
 * Cashify does not ask warranty for a model, its quote applies no age or
 * warranty deduction - the public Get Upto already reflects the model's age -
 * so neither does this. (Controls 2026-09-24: iPhone 13 clean ₹24,030 on a
 * ₹23,710 Get Upto; Pixel 7 Pro clean ₹18,940 on ₹19,200.) ASKED and UNKNOWN
 * keep the brand's calibrated factor for the answers given.
 */
function questionnaireAgeFactor(brandAgeMultiplier: number, semantics: QuestionnaireSemantics): number {
  return semantics.warrantyMode === 'NOT_ASKED' ? 1 : brandAgeMultiplier;
}

/**
 * Shared tail of every brand model (final offer only, never Get Upto): the
 * brand rules' Cashify condition equivalent plus the existing uplift.
 */
function finalizeConditionQuote(reference: CashifyGetUptoReference, conditionValue: number): PricingResult {
  const cashifyConditionEquivalent = Math.round(conditionValue);
  return {
    cashifyConditionEquivalent,
    fhoneifyPrice: applyCompetitorUplift(reference, cashifyConditionEquivalent),
  };
}

// ============================================================================
// BRAND 1: APPLE / iPHONE ENGINE
// ============================================================================

export const getAppleModelParams = (model: string): ModelParams => {
  const lowerModel = String(model || "").toLowerCase();
  
  let params: ModelParams = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.70,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15,
    facePenalty: 0.05
  };

  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");

  if (lowerModel.includes("17e")) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.10287356,
      callsPenalty: 0.25,
      originalScreenPenalty: 0.10229885,
      touchPenalty: 0.31111111,
      functionalScale: 1.0,
      physicalScale: 1.0,
      facePenalty: 0.05
    };
  } else if (lowerModel.includes("16e")) {
    params = {
      warrantyPenalty: 0.05,
      gstBillPenalty: 0.005518,
      callsPenalty: 0.25,
      originalScreenPenalty: 0.4336,
      touchPenalty: 0.22,
      functionalScale: 1.5,
      physicalScale: 1.5,
      facePenalty: 0.05
    };
  } else if (lowerModel.includes("17") || lowerModel.includes("air")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.11184, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.123046, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus || lowerModel.includes("air")) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.114598, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.120155, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.10, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("16")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.044527, callsPenalty: 0.50, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.021212, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("15")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.011876, callsPenalty: 0.50, originalScreenPenalty: 0.62876, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.606183, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05, facePenalty: 0.05 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.019004, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.019888, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1.0, physicalScale: 1.0, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("14")) {
    if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.017058, callsPenalty: 0.45, originalScreenPenalty: 0.701061, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.719084, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.225518 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.338111, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.629265, touchPenalty: 0.60, functionalScale: 1.2, physicalScale: 1.2, facePenalty: -0.061203 };
    }
  } else {
    params = { warrantyPenalty: 0, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.549363, touchPenalty: 0.50, functionalScale: 0.8, physicalScale: 0.8, facePenalty: 0.05 };
  }
  return params;
};

export function calculateApplePrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE, storageVariant?: string): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase().trim();

  // --- SPECIALIZED ALGORITHM FOR iPHONE 12 PRO MAX (6 GB/128 GB) ---
  const is128GB = storageVariant 
    ? storageVariant.toLowerCase().includes("128") 
    : reference <= 26000;
  
  if ((lowerModel === "iphone 12 pro max" || lowerModel === "apple iphone 12 pro max") && is128GB) {
    let price = reference;
    
    // Derived precise absolute deductions for 12 Pro Max based on Cashify scaling:
    const pFace = 7220 / 24460;
    const pBattService = 1960 / 24460;
    const pScratch2 = 4260 / 24460; 
    
    // Hardware
    if (diagnostics.hardware.includes('face') || diagnostics.hardware.includes('face_sensor')) {
      price -= Math.round(reference * pFace);
    }
    if (diagnostics.hardware.includes('battery_service')) {
      price -= Math.round(reference * pBattService);
    }
    // battery_health has 0 penalty in this tier
    
    // Screen condition
    const moreThan2Scratches = diagnostics.screenCondition?.includes('More than 2 scratches');
    const hasScreenDefect = diagnostics.defects.includes('screen_scratch') || diagnostics.defects.includes('broken_scratch') || moreThan2Scratches;
    
    if (hasScreenDefect) {
      if (moreThan2Scratches) {
        price -= Math.round(reference * pScratch2);
      } else {
        price -= Math.round(reference * (pScratch2 * 0.5)); // Fallback for minor scratch
      }
    }

    // Accessories (No Charger for iPhone 12 series)
    const hasBox = diagnostics.box === true || (diagnostics.accessories || []).includes("box");
    if (!hasBox) {
      // The value of the Box is 860 across all conditions
      price -= Math.round(reference * (860 / 24460));
    }
    
    // Major functional constraints
    if (diagnostics.calls === false) price -= Math.round(reference * 0.55);
    if (diagnostics.touch === false) price -= Math.round(reference * 0.25);
    if (diagnostics.originalScreen === false) price -= Math.round(reference * 0.70);
    
    // Other hardware issues
    const otherHardware = diagnostics.hardware.filter(h => h !== 'face' && h !== 'battery_service' && h !== 'battery_health');
    if (otherHardware.length > 0) {
      price -= Math.round(reference * 0.10 * otherHardware.length);
    }
    
    return finalizeConditionQuote(reference, Math.max(price, 0));
  }
  
  // --- SPECIALIZED ALGORITHM FOR iPHONE 12 PRO MAX (6 GB/512 GB) ---
  const is512GB = storageVariant 
    ? storageVariant.toLowerCase().includes("512") 
    : reference >= 26800; // 512GB base price in Cashify is 26910, in Fhoneify DB it is 27620
  
  if ((lowerModel === "iphone 12 pro max" || lowerModel === "apple iphone 12 pro max") && is512GB) {
    let price = reference;
    
    // Derived precise absolute deductions for 512GB based on Cashify scaling:
    const pFace = 7880 / 26910;
    const pBattService = 1960 / 26910;
    const pScratch2 = 4260 / 26910;
    const pBox = 800 / 26910; 
    
    // Hardware
    if (diagnostics.hardware.includes('face') || diagnostics.hardware.includes('face_sensor')) {
      price -= Math.round(reference * pFace);
    }
    if (diagnostics.hardware.includes('battery_service')) {
      price -= Math.round(reference * pBattService);
    }
    // battery_health has 0 penalty
    
    // Screen condition
    const moreThan2Scratches = diagnostics.screenCondition?.includes('More than 2 scratches');
    const hasScreenDefect = diagnostics.defects.includes('screen_scratch') || diagnostics.defects.includes('broken_scratch') || moreThan2Scratches;
    
    if (hasScreenDefect) {
      if (moreThan2Scratches) {
        price -= Math.round(reference * pScratch2);
      } else {
        price -= Math.round(reference * (pScratch2 * 0.5)); // Fallback for minor scratch
      }
    }

    // Accessories 
    const hasBox = diagnostics.box === true || (diagnostics.accessories || []).includes("box");
    if (!hasBox) {
      // The value of the Box is uniformly 800 across conditions for 512GB
      price -= Math.round(reference * pBox);
    }
    
    // Major functional constraints
    if (diagnostics.calls === false) price -= Math.round(reference * 0.55);
    if (diagnostics.touch === false) price -= Math.round(reference * 0.25);
    if (diagnostics.originalScreen === false) price -= Math.round(reference * 0.70);
    
    // Other hardware issues
    const otherHardware = diagnostics.hardware.filter(h => h !== 'face' && h !== 'battery_service' && h !== 'battery_health');
    if (otherHardware.length > 0) {
      price -= Math.round(reference * 0.10 * otherHardware.length);
    }
    
    return finalizeConditionQuote(reference, Math.max(price, 0));
  }
  
  // --- SPECIALIZED ALGORITHM FOR iPHONE 12 PRO MAX (6 GB/256 GB) ---
  const is256GB = storageVariant 
    ? storageVariant.toLowerCase().includes("256") 
    : (reference > 26000 && reference < 26800); // 256GB base price in Cashify is 25680, in Fhoneify DB it is 26650
  
  if ((lowerModel === "iphone 12 pro max" || lowerModel === "apple iphone 12 pro max") && is256GB) {
    let price = reference;
    
    // Derived precise absolute deductions for 256GB based on Cashify scaling:
    const pFace = 7580 / 25680;
    const pBattService = 1960 / 25680;
    const pScratch2 = 4270 / 25680;
    const pBox = 800 / 25680; 
    
    // Hardware
    if (diagnostics.hardware.includes('face') || diagnostics.hardware.includes('face_sensor')) {
      price -= Math.round(reference * pFace);
    }
    if (diagnostics.hardware.includes('battery_service')) {
      price -= Math.round(reference * pBattService);
    }
    // battery_health has 0 penalty
    
    // Screen condition
    const moreThan2Scratches = diagnostics.screenCondition?.includes('More than 2 scratches');
    const hasScreenDefect = diagnostics.defects.includes('screen_scratch') || diagnostics.defects.includes('broken_scratch') || moreThan2Scratches;
    
    if (hasScreenDefect) {
      if (moreThan2Scratches) {
        price -= Math.round(reference * pScratch2);
      } else {
        price -= Math.round(reference * (pScratch2 * 0.5)); // Fallback for minor scratch
      }
    }

    // Accessories 
    const hasBox = diagnostics.box === true || (diagnostics.accessories || []).includes("box");
    if (!hasBox) {
      // The value of the Box is uniformly 800 across conditions for 256GB
      price -= Math.round(reference * pBox);
    }
    
    // Major functional constraints
    if (diagnostics.calls === false) price -= Math.round(reference * 0.55);
    if (diagnostics.touch === false) price -= Math.round(reference * 0.25);
    if (diagnostics.originalScreen === false) price -= Math.round(reference * 0.70);
    
    // Other hardware issues
    const otherHardware = diagnostics.hardware.filter(h => h !== 'face' && h !== 'battery_service' && h !== 'battery_health');
    if (otherHardware.length > 0) {
      price -= Math.round(reference * 0.10 * otherHardware.length);
    }
    
    return finalizeConditionQuote(reference, Math.max(price, 0));
  }
  // --- END SPECIALIZED ALGORITHM ---

  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");
  const is17e = lowerModel.includes("17e");

  const params = getAppleModelParams(model);

  const callsOk = diagnostics.calls !== false;
  const isOutOfWarranty = diagnostics.warranty === false || diagnostics.mobileAge === 'above11' || diagnostics.mobileAge === 'above 11 months';
  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const age = String(diagnostics.mobileAge || "").toLowerCase();

  let ageMultiplier = 0.74961686;
  
  if (!isOutOfWarranty) {
    if (lowerModel.includes("17") || lowerModel.includes("air")) {
      if (age.includes("below 3") || age.includes("below3")) ageMultiplier = (isPro && !isProMax) ? 0.9875 : 0.98;
      else if (age.includes("3") && age.includes("6")) ageMultiplier = (isPro || isProMax) ? 0.8881 : (lowerModel.includes("air") ? 0.873448 : 0.88065134);
      else if (age.includes("6") && age.includes("11")) ageMultiplier = (isPro && !isProMax) ? 0.8601 : (isProMax ? 0.85704 : (lowerModel.includes("air") ? 0.845747 : 0.85249042));
      else ageMultiplier = 0.74961686;
    } else if (lowerModel.includes("16")) {
      if (age.includes("6") && age.includes("11")) ageMultiplier = isProMax ? 0.908642 : (isPro ? 0.911240 : 0.9114);
      else ageMultiplier = isProMax ? 0.908642 : (isPro ? 0.911240 : 0.9114);
    } else if (lowerModel.includes("15")) {
      ageMultiplier = isProMax
        ? 0.752937
        : (isPro ? CASHIFY_CALIBRATION.apple.proYoungAgeByGeneration[15] : (isPlus ? 0.783929 : 0.749243));
    } else if (lowerModel.includes("14")) {
      ageMultiplier = isProMax ? 0.916788 : (isPro ? 0.914504 : (isPlus ? 0.854723 : 0.629265));
    } else {
      ageMultiplier = 0.859873;
    }
  } else {
    if (is17e) ageMultiplier = 0.74961686;
    else if (lowerModel.includes("16")) ageMultiplier = isProMax ? 0.782628 : (isPro ? 0.745663 : (isPlus ? 0.771591 : (lowerModel.includes("16e") ? 0.752445 : 0.779625)));
  }

  // A younger, in-warranty device cannot be worth less than the same device
  // after it becomes old/out of warranty. This also protects older Apple
  // generation constants that were historically calibrated independently.
  if (!isOutOfWarranty) {
    let outOfWarrantyMultiplier = 0.74961686;
    if (lowerModel.includes("16")) {
      outOfWarrantyMultiplier = isProMax ? 0.782628 : (isPro ? 0.745663 : (isPlus ? 0.771591 : (lowerModel.includes("16e") ? 0.752445 : 0.779625)));
    }
    ageMultiplier = Math.max(ageMultiplier, outOfWarrantyMultiplier);
  }

  if (!hasValidBill && !isOutOfWarranty) {
    ageMultiplier -= params.gstBillPenalty;
  }

  let batteryServicePenalty = 0.05 * params.functionalScale;
  if (lowerModel.includes("16") && isProMax) batteryServicePenalty = 0.044527;
  else if (lowerModel.includes("16") && isPro) batteryServicePenalty = 0.022882;
  else if (lowerModel.includes("16")) batteryServicePenalty = 0.069763;
  else if (lowerModel.includes("15") && isPlus) batteryServicePenalty = 0.064474;
  else if (lowerModel.includes("15")) batteryServicePenalty = 0.048582;

  const batteryHealthPenalty = is17e
    ? ((age.includes("below 3") || age.includes("below3")) ? 0.01639847 : 0.02873563)
    : 0;
  const facePenalty = params.facePenalty !== undefined && params.facePenalty > 0
    ? params.facePenalty * params.functionalScale
    : COMMON_FUNCTIONAL_PENALTIES.face * params.functionalScale;
  const adjustments = calculateConditionAdjustments(diagnostics, params, {
    touchRetention: is17e ? 1 - params.touchPenalty : params.touchPenalty,
    originalScreenRetention: semantics.warrantyMode === 'NOT_ASKED'
      ? CASHIFY_CALIBRATION.localDisplay.notAskedAppleRetention
      : CASHIFY_CALIBRATION.localDisplay.appleRetention,
    heavyBodyCosmeticScale: CASHIFY_CALIBRATION.apple.heavyBodyCosmeticScale,
    questionnaire: semantics,
    functionalOverrides: {
      battery_health: batteryHealthPenalty,
      battery_service: batteryServicePenalty,
      face: facePenalty,
    },
    heavyScreenScratchScale: (isPro || isProMax)
      ? CASHIFY_CALIBRATION.apple.proFamily.screenScratchScale
      : undefined,
    lightScreenScratchScale: (isPro || isProMax)
      ? CASHIFY_CALIBRATION.apple.proFamily.screenScratchScale
      : undefined,
  });
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;

  if (!callsOk) {
    cashifyPrice = 1200;
  }

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 2: SAMSUNG ENGINE
// ============================================================================

export function calculateSamsungPrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

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
  const isFoldable = lowerModel.includes("fold") || lowerModel.includes("flip");
  const isSFamily = lowerModel.includes("galaxy s") || /\bs\d/.test(lowerModel);

  let params: ModelParams = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
  if (isA) params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.75, touchPenalty: 0.4, functionalScale: 0.8, physicalScale: 0.75 };
  else if (isUltra) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.2, physicalScale: 1.2 };
  else if (isEdge) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.11 };
  else if (isFE) params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.986 };

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  let ageMultiplier = 0.7760816326;

  // Out of warranty the bill carries no premium (as for every other Samsung);
  // the former no-bill 0.8189 paid more than a valid bill's 0.8033.
  if (isS24Ultra) ageMultiplier = diagnostics.warranty === false ? 0.8032786885245902 : 0.98;
  else if (isS26Ultra) ageMultiplier = diagnostics.warranty === false ? 0.8139316811781648 : 0.95;
  else if (isA35) ageMultiplier = diagnostics.warranty === false ? 0.7689422355588897 : 0.98;
  else if (isA34) ageMultiplier = diagnostics.warranty === false ? 0.7807625649913345 : 0.98;
  else if (isA) ageMultiplier = diagnostics.warranty === false ? 0.7586206896551724 : 0.98;
  else if (diagnostics.warranty !== false) ageMultiplier = 0.98;

  if (!hasValidBill && diagnostics.warranty !== false) {
    if (isUltra) ageMultiplier -= 0.1265558194774347;
    else ageMultiplier -= params.gstBillPenalty;
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

  const heavyScreenScratchScale = isFoldable
    ? CASHIFY_CALIBRATION.samsung.foldable.heavyScreenScratchScale
    : (isSFamily && !isUltra && !isFE && !isEdge
      ? CASHIFY_CALIBRATION.samsung.sSeriesSlab.heavyScreenScratchScale
      : undefined);
  const heavyBodyCosmeticScale = isSFamily && !isFoldable && !isFE && !isEdge
    ? CASHIFY_CALIBRATION.samsung.sSeriesBody.heavyBodyCosmeticScale
    : undefined;
  const adjustments = calculateConditionAdjustments(diagnostics, params, { heavyScreenScratchScale, heavyBodyCosmeticScale, questionnaire: semantics });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 3: XIAOMI / REDMI / POCO ENGINE
// ============================================================================

export function calculateXiaomiPrice(
  model: string,
  reference: CashifyGetUptoReference,
  diagnostics: DiagnosticsType,
  semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE,
  inrConfig: InrDeductionConfig = xiaomiInrDeductions()
): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isRedmiNote = lowerModel.includes("note");
  const ageConfig = isRedmiNote
    ? { below3: 1, "3to6": 0.93, "6to11": 0.85, above11: 0.74 }
    : { below3: 1, "3to6": 0.94, "6to11": 0.86, above11: 0.75 };
  const params: ModelParams = {
    warrantyPenalty: 0.1,
    gstBillPenalty: 0.08,
    callsPenalty: 0.5,
    originalScreenPenalty: 0.6,
    touchPenalty: 0.4,
    functionalScale: 1.0,
    physicalScale: 1.0,
  };

  // Models with a calibrated repair-cost group use fixed-₹ deductions; out of
  // warranty they keep Cashify's measured clean-phone share (Redmi Note has
  // no measurement yet and keeps its age table).
  const inrGroup = resolveInrGroup(inrConfig, model, reference);
  const outOfWarranty = !inrGroup
    ? ageConfig.above11
    : inrConfig.warrantyRetention[lowerModel.trim()] ??
      (isRedmiNote ? ageConfig.above11 : inrConfig.defaultWarrantyRetention ?? ageConfig.above11);
  let ageMultiplier = ageConfig.below3;
  if (diagnostics.warranty === false || diagnostics.mobileAge === "above11") {
    ageMultiplier = outOfWarranty;
  } else if (diagnostics.mobileAge) {
    const k = diagnostics.mobileAge.toLowerCase();
    if (k.includes("3") && k.includes("6")) ageMultiplier = ageConfig["3to6"];
    else if (k.includes("6") && k.includes("11")) ageMultiplier = ageConfig["6to11"];
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= 0.08;

  const deadPhonePrice = reference <= 5000 ? 200 : 1200;
  if (inrGroup) {
    const { value } = inrConditionValue({
      config: inrConfig,
      group: inrGroup,
      reference,
      ageRetention: questionnaireAgeFactor(ageMultiplier, semantics),
      diagnostics,
      deadPhonePrice,
      warrantyNotAsked: semantics.warrantyMode === 'NOT_ASKED',
    });
    return finalizeConditionQuote(reference, diagnostics.calls === false ? deadPhonePrice : value);
  }

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const adjustments = calculateConditionAdjustments(diagnostics, params, { questionnaire: semantics });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = deadPhonePrice;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 4: VIVO / iQOO ENGINE
// ============================================================================

export function calculateVivoPrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

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

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const hasCharger = (diagnostics.accessories || []).includes("charger") || diagnostics.charger === true;

  let boxBonus = 0;
  if (hasBox) {
    boxBonus = COMMON_BONUSES.box;
    if (hasCharger === false && diagnostics.charger !== undefined) boxBonus -= COMMON_BONUSES.missingChargerPenalty;
  }

  const adjustments = calculateConditionAdjustments(diagnostics, params, isFold ? {
    questionnaire: semantics,
    functionalOverrides: {
      battery_health: 0.02992159060803527,
      battery_service: 0.02992159060803527,
      battery: 0.02992159060803527,
    },
  } : { questionnaire: semantics });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 5: OPPO ENGINE
// ============================================================================

export function calculateOppoPrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

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
  if (diagnostics.warranty === false || diagnostics.mobileAge === "above11") {
    ageMultiplier = Math.min(ageMultiplier, CASHIFY_CALIBRATION.oppo.outOfWarrantyAgeMultiplier);
  }

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const adjustments = calculateConditionAdjustments(diagnostics, params, { questionnaire: semantics });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 6: ONEPLUS ENGINE
// ============================================================================

export function calculateOnePlusPrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const isPro = lowerModel.includes("pro");
  const isFold = lowerModel.includes("open") || lowerModel.includes("fold");

  const params: ModelParams = (isPro || isFold)
    ? { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 }
    : { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };

  if (lowerModel.includes("nord 5")) params.gstBillPenalty = 0.223828345567;
  else if (lowerModel.includes("15r")) params.gstBillPenalty = 0.245492873398;
  else if (lowerModel.includes("15")) params.gstBillPenalty = 0.184090806203;

  const isOutOfWarranty = diagnostics.warranty === false || diagnostics.mobileAge === 'above11' || diagnostics.mobileAge === 'above 11 months';
  let ageMultiplier = isOutOfWarranty && !isPro && !isFold
    ? CASHIFY_CALIBRATION.onePlus.standard.outOfWarrantyAgeMultiplier
    : (isOutOfWarranty ? 0.7966 : 0.98);

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const adjustments = calculateConditionAdjustments(diagnostics, params, {
    questionnaire: semantics,
    functionalOverrides: {
      front_camera: 0.0658385,
      back_camera: 0.1827216,
      battery_health: 0.0620553,
      battery_service: 0.0620553,
      battery: 0.0620553,
    },
    heavyScreenScratchScale: (!isPro && !isFold)
      ? CASHIFY_CALIBRATION.onePlus.standard.heavyScreenScratchScale
      : undefined,
  });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 7: NOTHING & CMF ENGINE
// ============================================================================

/**
 * Exact Nothing model family. Substring matching sent "CMF by Nothing Phone 1"
 * to Nothing Phone 1's constants and "Phone 2a"/"2a Plus" to Phone 2's.
 */
export function nothingModelFamily(model: string): 'Phone 1' | 'Phone 2' | 'other/CMF' {
  const m = String(model || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (/cmf/.test(m)) return 'other/CMF';
  const name = m.replace(/^nothing /, '').replace(/ 5g$/, '');
  if (/^phone ?\(?1\)?$/.test(name)) return 'Phone 1';
  if (/^phone ?\(?2\)?$/.test(name)) return 'Phone 2';
  return 'other/CMF';
}

export function calculateNothingPrice(model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

  const lowerModel = String(model || "").toLowerCase();
  const nothingFamily = nothingModelFamily(model);
  const isNothing1 = nothingFamily === 'Phone 1';
  const isNothing2 = nothingFamily === 'Phone 2';

  const params: ModelParams = { warrantyPenalty: 0.1, gstBillPenalty: 0.223828345567476, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 1.0, physicalScale: 1.0 };
  let ageMultiplier = diagnostics.warranty === false ? (isNothing1 ? 0.8805755395683453 : 0.88) : 0.98;

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const frontCameraPenalty = isNothing2 ? 0.0653835 : isNothing1 ? 0.0589928 : 0.0658385;
  const backCameraPenalty = isNothing2 ? 0.1826338 : isNothing1 ? 0.1352517 : 0.1827216;
  const batteryPenalty = isNothing2 ? 0.0620067 : isNothing1 ? 0.0496402 : 0.0620553;
  const adjustments = calculateConditionAdjustments(diagnostics, params, {
    questionnaire: semantics,
    functionalOverrides: {
      front_camera: frontCameraPenalty,
      back_camera: backCameraPenalty,
      battery_health: batteryPenalty,
      battery_service: batteryPenalty,
      battery: batteryPenalty,
    },
  });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// BRAND 8: GENERIC ANDROID FALLBACK ENGINE
// ============================================================================

export function calculateGenericAndroidPrice(brand: string, model: string, reference: CashifyGetUptoReference, diagnostics: DiagnosticsType, semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE): PricingResult {
  if (!reference || reference <= 0) return { cashifyConditionEquivalent: 0, fhoneifyPrice: 0 };

  const params: ModelParams = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.7 };
  let ageMultiplier = diagnostics.warranty === false ? 0.75 : 0.95;

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) ageMultiplier -= params.gstBillPenalty;

  const hasBox = (diagnostics.accessories || []).includes("box") || diagnostics.box === true;
  const boxBonus = hasBox ? COMMON_BONUSES.box : 0;

  const adjustments = calculateConditionAdjustments(diagnostics, params, { questionnaire: semantics });
  let cashifyPrice = reference * questionnaireAgeFactor(ageMultiplier, semantics) * adjustments.conditionRetention + boxBonus;
  if (diagnostics.calls === false) cashifyPrice = reference <= 5000 ? 200 : 1200;

  return finalizeConditionQuote(reference, cashifyPrice);
}

// ============================================================================
// CENTRAL ROUTER DISPATCHER
// ============================================================================

export function calculateFhoneifyPrice(
  brand: string,
  model: string,
  cashifyGetUptoReference: CashifyGetUptoReference,
  answers: DiagnosticsType,
  semantics: QuestionnaireSemantics = UNKNOWN_QUESTIONNAIRE,
  storageVariant?: string
): PricingResult {
  // A question Cashify never asks for this model is not a "No": its answer is
  // neutral here, and questionnaireAgeFactor drops the age/warranty factor.
  const diagnostics: DiagnosticsType = {
    ...answers,
    // A missing bill answer is not a "No": it is priced neutrally, like a
    // question Cashify does not ask. The quote API refuses an exact value
    // without it where the bill is asked (lib/pricing/pricingService.ts).
    ...(semantics.billMode === 'NOT_ASKED' || answers.validBill == null ? { validBill: true } : {}),
    // Cashify never asks an age bracket when it does not ask age: the warranty
    // answer is its only age signal.
    ...(semantics.ageMode === 'NOT_ASKED' ? { mobileAge: answers.warranty === false ? 'above11' : null } : {}),
    ...(semantics.warrantyMode === 'NOT_ASKED' ? { warranty: null, mobileAge: null } : {}),
  };
  const asAnswered = routeBrandCalculator(brand, model, cashifyGetUptoReference, diagnostics, semantics, storageVariant);
  // A warranty cannot be claimed without the GST bill (Cashify asks the two
  // together), so "in warranty, no bill" never prices below the same phone
  // answered as out of warranty - the brand bill deductions alone could
  // otherwise reward answering "no warranty".
  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
  if (!hasValidBill && diagnostics.warranty !== false) {
    const asOutOfWarranty = routeBrandCalculator(brand, model, cashifyGetUptoReference, { ...diagnostics, warranty: false, mobileAge: "above11" }, semantics);
    if (asOutOfWarranty.cashifyConditionEquivalent > asAnswered.cashifyConditionEquivalent) return asOutOfWarranty;
  }
  return asAnswered;
}

function routeBrandCalculator(
  brand: string,
  model: string,
  cashifyGetUptoReference: CashifyGetUptoReference,
  diagnostics: DiagnosticsType,
  semantics: QuestionnaireSemantics,
  storageVariant?: string
): PricingResult {
  const safeBrand = String(brand || "").toLowerCase().trim();
  const safeModel = String(model || "").toLowerCase().trim();

  if (safeBrand === "apple" || safeModel.includes("iphone")) {
    return calculateApplePrice(model, cashifyGetUptoReference, diagnostics, semantics, storageVariant);
  }

  if (safeBrand === "samsung" || safeModel.includes("galaxy")) {
    return calculateSamsungPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  if (
    safeBrand === "xiaomi" || safeBrand === "redmi" || safeBrand === "poco" ||
    safeModel.includes("xiaomi") || safeModel.includes("redmi") || safeModel.includes("poco")
  ) {
    return calculateXiaomiPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  if (
    safeBrand === "vivo" || safeBrand === "iqoo" ||
    safeModel.includes("vivo") || safeModel.includes("iqoo")
  ) {
    return calculateVivoPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  if (
    safeBrand === "oppo" || safeModel.includes("oppo") ||
    safeModel.includes("reno") || safeModel.includes("find x")
  ) {
    return calculateOppoPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  if (
    safeBrand === "oneplus" || safeModel.includes("oneplus") || safeModel.includes("nord")
  ) {
    return calculateOnePlusPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  if (
    safeBrand === "nothing" || safeBrand === "cmf" ||
    safeModel.includes("nothing") || safeModel.includes("cmf")
  ) {
    return calculateNothingPrice(model, cashifyGetUptoReference, diagnostics, semantics);
  }

  return calculateGenericAndroidPrice(brand, model, cashifyGetUptoReference, diagnostics, semantics);
}
