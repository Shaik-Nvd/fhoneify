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
      heavyScreenScratchScale: 0.50,
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
} as const;
