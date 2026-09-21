/**
 * What the customer is shown on the final quote screen, derived from the
 * signed quote price. The rules are the quote page's existing ones, moved
 * here unchanged so the screen and the stored lead use the same code:
 *
 *   - ₹99 is deducted from the displayed estimate, except when the quote is
 *     exactly ₹1,200. (NOTE: a non-working device's quote is ₹1,200 AFTER
 *     the uplift, i.e. ₹1,248-₹1,296, so this exemption never matches today.
 *     Kept as-is: changing it is a business decision.)
 *   - A coupon adds ₹299. Whether it applies is decided by the server
 *     (server/modules/quote/coupon.ts); the browser only shows the result of
 *     that decision and sends a code, never a boolean.
 *
 * Browser-safe: no imports.
 */
export const DISPLAY_DEDUCTION = 99;
export const DISPLAY_DEDUCTION_EXEMPT_PRICE = 1200;
export const FIRST_TIME_COUPON_BONUS = 299;

export interface CustomerPayout {
  quotePrice: number;
  deduction: number;
  couponBonus: number;
  payout: number;
}

export function customerPayout(quotePrice: number, couponApplied: boolean): CustomerPayout {
  const deduction = quotePrice === DISPLAY_DEDUCTION_EXEMPT_PRICE ? 0 : DISPLAY_DEDUCTION;
  const couponBonus = couponApplied ? FIRST_TIME_COUPON_BONUS : 0;
  return { quotePrice, deduction, couponBonus, payout: quotePrice - deduction + couponBonus };
}

/**
 * What a lead stores in `answers`: the verified diagnostics, the pricing
 * audit, and the figure the quote screen showed (customerPayout), derived from
 * the verified price by the same function the screen uses - so the admin sees
 * both numbers and why they differ (₹99 fee / coupon).
 */
export function buildLeadAnswers(
  verified: { price: number; diagnostics: object; audit: object },
  couponClaimed: boolean,
  redemption?: { code: string; phoneKey: string }
) {
  return {
    ...verified.diagnostics,
    pricing: {
      ...verified.audit,
      customerPayout: customerPayout(verified.price, couponClaimed),
      // Kept under this name for the admin leads screen. It is now the
      // SERVER's decision, never the client's claim.
      couponClaimed,
      // Written only when the server honoured a coupon; the coupon rules
      // read these back to enforce one redemption per phone.
      ...(redemption ? { couponRedeemed: true, couponCode: redemption.code, couponPhoneKey: redemption.phoneKey } : {}),
    },
  };
}
