import crypto from 'crypto';
import { FIRST_TIME_COUPON_BONUS } from '../../../lib/pricing/payout';

/**
 * Server-side coupon rules.
 *
 * The quote page used to generate the first-time code in the browser and also
 * accepted two hardcoded codes, and the server stored `couponApplied` as an
 * unverified boolean. Any visitor could therefore add Rs 299 to their payout
 * by editing a request. Now the server alone decides whether a coupon is
 * honoured; a client boolean is ignored.
 *
 * Rules
 *  - first-time code: derived from the customer's verified phone with an HMAC,
 *    so it cannot be invented or shared, and valid only while that phone has
 *    no earlier lead.
 *  - promo codes (PROMO_COUPON_CODES, default the two that were hardcoded in
 *    the bundle): one redemption per phone.
 *  - a redemption is recorded on the lead (answers.pricing.couponRedeemed and
 *    couponPhoneKey), so no schema change is needed.
 *
 * The coupon changes only the display/payout layer (customerPayout). It never
 * changes the signed quote price, the uplift, or the reference price.
 */
export const DEFAULT_PROMO_CODES = ['WELCOME299', 'FHONEIFY299'];

export type CouponReason =
  | 'missing'
  | 'invalid'
  | 'already_redeemed'
  | 'not_first_time'
  | 'login_required'
  | 'phone_mismatch';

export interface CouponResult {
  valid: boolean;
  bonus: number;
  kind?: 'first_time' | 'promo';
  code?: string;
  reason?: CouponReason;
}

/** What is already on record for a phone. Injected so tests never need a DB. */
export interface RedemptionLookup {
  (phoneKey: string): Promise<{ totalLeads: number; redeemedLeads: number }>;
}

/** Last 10 digits: tolerates "+91", spaces and dashes in stored phones. */
export function phoneKey(phone: string | undefined | null): string {
  return String(phone ?? '').replace(/\D/g, '').slice(-10);
}

export const isVerifiedPhone = (phone: string | undefined | null) => phoneKey(phone).length === 10;

export function firstTimeCode(secret: string, phone: string): string {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`fhoneify:first-time-coupon:v1:${phoneKey(phone)}`)
    .digest('hex');
  return `NEW${digest.slice(0, 5).toUpperCase()}`;
}

export function parsePromoCodes(raw: string | undefined): string[] {
  if (raw === undefined) return DEFAULT_PROMO_CODES;
  return raw.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export interface CouponDeps {
  secret: string;
  promoCodes: string[];
  lookup: RedemptionLookup;
}

const denied = (reason: CouponReason): CouponResult => ({ valid: false, bonus: 0, reason });

/** Decides a coupon for a VERIFIED phone. Never trusts the client. */
export async function evaluateCoupon(
  deps: CouponDeps,
  input: { code?: string | null; verifiedPhone?: string | null }
): Promise<CouponResult> {
  const code = String(input.code ?? '').trim().toUpperCase();
  if (!code) return denied('missing');
  if (!isVerifiedPhone(input.verifiedPhone)) return denied('login_required');

  const key = phoneKey(input.verifiedPhone);
  const isFirstTimeCode = safeEqual(code, firstTimeCode(deps.secret, key));
  const isPromo = deps.promoCodes.includes(code);
  if (!isFirstTimeCode && !isPromo) return denied('invalid');

  const { totalLeads, redeemedLeads } = await deps.lookup(key);
  if (redeemedLeads > 0) return denied('already_redeemed');
  if (isFirstTimeCode && totalLeads > 0) return denied('not_first_time');

  return { valid: true, bonus: FIRST_TIME_COUPON_BONUS, kind: isFirstTimeCode ? 'first_time' : 'promo', code };
}

/** The first-time code to offer this phone, or null if it has already sold. */
export async function offerFor(deps: CouponDeps, verifiedPhone: string | null | undefined): Promise<string | null> {
  if (!isVerifiedPhone(verifiedPhone)) return null;
  const key = phoneKey(verifiedPhone);
  const { totalLeads, redeemedLeads } = await deps.lookup(key);
  if (totalLeads > 0 || redeemedLeads > 0) return null;
  return firstTimeCode(deps.secret, key);
}
