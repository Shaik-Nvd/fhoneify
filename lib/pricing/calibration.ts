/**
 * Empirical Cashify calibration layered over the historical condition rules.
 *
 * Values live at brand/family level and only affect the condition measured by
 * the comparison dataset. In particular, a heavy-scratch scale does not alter
 * cracked-screen, display-fault, body, or functional deductions.
 */
export const CASHIFY_CALIBRATION = {
  apple: {
    proFamily: {
      // Three old/heavy-scratch observations plus an isolated iPhone 15 Pro
      // screen pair support a 7.5% deduction (15% global rule x 0.50).
      screenScratchScale: 0.50,
    },
    // Heavy cosmetic body tier (>2 scratches, major dents). iPhone 13 body-only
    // control 2026-09-24 (no warranty question): Cashify ₹22,950 on ₹23,710
    // = 4.8% vs the engine's 16% (0.20 x scale 0.8) -> 0.30. The heavy tier is
    // floored at the light tier, so for Apple it prices as light (6.4%).
    heavyBodyCosmeticScale: 0.30,
    proYoungAgeByGeneration: {
      // Restores the smooth 14 Pro (0.914504) -> 16 Pro (0.911240) sequence.
      // The live young/heavy-scratch iPhone 15 Pro control supports 0.912.
      15: 0.912,
    },
  },
  samsung: {
    sSeriesSlab: {
      // Restores the pre-f1034f4 0.75 scale; the S24 isolation pair leaves a
      // ₹62 error on the standardized heavy-scratch profile.
      heavyScreenScratchScale: 0.75,
    },
    sSeriesBody: {
      // Galaxy S / Plus / Ultra (not FE, Edge or foldables): scale on the
      // heavy cosmetic body tier (">2 scratches", "major dents / more than
      // 2"). Body-only control 2026-09-24: Galaxy S24 5G 8/256, out of
      // warranty, bill, box, Cashify ₹24,320 on a ₹34,710 reference = 11.13%
      // deduction vs the engine's 22.0% (0.20 x scale 1.1) -> 0.506.
      heavyBodyCosmeticScale: 0.506,
    },
    foldable: {
      // Foldables historically had an extra screen-damage multiplier. The
      // live Fold6 pair supports 1.50 as a conservative family-level scale.
      heavyScreenScratchScale: 1.50,
    },
  },
  onePlus: {
    standard: {
      // Supported by three devices plus old/no-screen and young/scratch
      // controls for OnePlus 13.
      outOfWarrantyAgeMultiplier: 0.725,
      heavyScreenScratchScale: 1.00,
    },
  },
  oppo: {
    // Oppo had no out-of-warranty step at all (old phones kept the 0.98
    // new-phone multiplier). Team QA 2026-09-24: Reno12 Pro 12/512, out of
    // warranty, no box/bill/damage, Cashify ₹14,420 on a ₹20,250 reference
    // = 0.712. Cross-check A6 5G 6/128 (out of warranty, box, back camera
    // fault, unchanged 0.223 camera rule): predicted ₹8,331 vs Cashify ₹8,360.
    outOfWarrantyAgeMultiplier: 0.712,
  },
  localDisplay: {
    // Retention for a non-original (local/copy) display, replacing the
    // pre-reference per-brand originalScreenPenalty values (40-45% cuts).
    // Team QA 2026-09-24, local display, out of warranty, engine age rules
    // held fixed: Pixel 7 Pro 10.8%, Pixel 9 Pro 24.1%, POCO F6 23.6%,
    // Galaxy S26 Ultra 18.9% -> Android 0.81. iPhone 15 Pro Max 13.1%
    // (after its 1-2 body scratches), iPhone 13 <= 18.7% including heavy
    // body damage -> Apple 0.87.
    androidRetention: 0.81,
    // Re-derived 2026-09-24 with the display/body overlap below: iPhone 15
    // Pro Max, out of warranty, local display + 1-2 body scratches, Cashify
    // ₹44,410 -> 15.1% display.
    appleRetention: 0.849,
    // Models whose Cashify questionnaire does NOT ask warranty (no age factor
    // applies there, so the whole observed cut is condition). Android: Pixel 7
    // Pro local display only 33.1%; Galaxy S22 Ultra local display + heavy
    // body 35.7% after the body share -> 0.656. Apple: iPhone 13 local
    // display + heavy body 37.0% after the body share -> 0.630.
    notAskedAndroidRetention: 0.656,
    notAskedAppleRetention: 0.630,
  },
  damageOverlap: {
    // Local display + cosmetic body damage: the larger deduction in full plus
    // this share of the smaller. Galaxy S24 5G 8/256, out of warranty, box:
    // display only ₹22,300 (19.0%), body only ₹24,320 (11.13%), both ₹21,220
    // (22.64%) -> (22.64 - 19.0) / 11.13 = 0.327.
    displayAndBodySecondFactor: 0.327,
  },
} as const;
