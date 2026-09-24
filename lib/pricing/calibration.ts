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
    appleRetention: 0.87,
  },
  heavyBody: {
    // Scale on the heavy cosmetic body tier (">2 scratches", "major dents /
    // more than 2"). Body-only control 2026-09-24: Galaxy S24 5G 8/256, out
    // of warranty, bill, box, >2 scratches + major dents, Cashify ₹24,320 on
    // a ₹34,710 reference = 11.13% deduction vs the engine's 22.0%
    // (0.20 x S-series scale 1.1) -> 0.506. Cross-checks with a local
    // display: iPhone 13 (−₹425), Galaxy S22 Ultra (−₹1.7k, within the
    // display-only spread). Light scratches/minor dents unchanged.
    cosmeticScale: 0.506,
  },
} as const;
