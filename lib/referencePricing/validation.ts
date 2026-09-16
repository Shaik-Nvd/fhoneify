/**
 * Validation and anomaly policy for incoming reference-price observations.
 *
 * Explicit design choice per the investigation brief: a large price DROP
 * can be real (that's literally what happened with OPPO Find X9s and
 * OnePlus 15R - Cashify's real price crashed ~3x in 10-12 weeks). This
 * module never auto-rejects a value just because it's surprising; it only
 * rejects genuinely malformed/impossible values, and FLAGS suspicious
 * swings for human review without blocking the update.
 */

export const VALIDATION_POLICY = {
  minPrice: 1,
  maxPrice: Number(process.env.REFERENCE_PRICE_MAX_SANE_VALUE ?? 500000), // ₹5,00,000 - above any real device's realistic buyback value; catches parsing garbage (e.g. a price with a stray extra digit or a scraped non-price string coerced to a huge number)
  /** Swings at or beyond this fraction of the previous price are flagged
   * for review rather than silently accepted. Configurable because "how
   * suspicious is suspicious" is a judgment call, not a fact. */
  flagSwingFraction: Number(process.env.REFERENCE_PRICE_FLAG_SWING_FRACTION ?? 0.4),
};

export interface ValidationResult {
  valid: boolean;
  reason?: string; // set when valid=false
  flagged?: boolean; // valid=true but worth a human look
  flagReason?: string;
}

export function validatePriceObservation(params: {
  price: number;
  previousPrice?: number | null;
}): ValidationResult {
  const { price, previousPrice } = params;

  if (!Number.isFinite(price)) {
    return { valid: false, reason: `not a finite number: ${price}` };
  }
  if (price < VALIDATION_POLICY.minPrice) {
    return { valid: false, reason: `price ${price} is below the minimum sane value (${VALIDATION_POLICY.minPrice}) - likely a parsing failure` };
  }
  if (price > VALIDATION_POLICY.maxPrice) {
    return { valid: false, reason: `price ${price} exceeds the maximum sane value (${VALIDATION_POLICY.maxPrice}) - likely a parsing failure, not a real device price` };
  }

  if (previousPrice && previousPrice > 0) {
    const swing = Math.abs(price - previousPrice) / previousPrice;
    if (swing >= VALIDATION_POLICY.flagSwingFraction) {
      return {
        valid: true,
        flagged: true,
        flagReason: `price moved ${(swing * 100).toFixed(0)}% from the previous verified value (${previousPrice} -> ${price}) - accepted, but flagged for review. A large drop can be legitimate (see PRICING_ACCURACY_INVESTIGATION.md); this is not auto-rejected.`,
      };
    }
  }

  return { valid: true };
}
