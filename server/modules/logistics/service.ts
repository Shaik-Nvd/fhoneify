import crypto from 'crypto';
import { techFloats, activePickups } from '../../data';
import logger from '../../lib/logger';
import config from '../../config';

/**
 * Re-quote confirmation codes, keyed by pickup.
 *
 * This flow authorizes a CHANGE TO WHAT THE CUSTOMER IS PAID, so it previously
 * had two holes: the code was generated with Math.random() and returned in the
 * API response for the technician's own screen to autofill, and verification
 * accepted ANY four digits. Either one lets a technician approve a re-quote
 * the customer never agreed to.
 *
 * Now: the code is random, hashed, expiring, single-use and attempt-limited,
 * and it is never returned to the caller. Delivering it to the customer is not
 * implemented, so in production the endpoint reports that instead of handing
 * the technician a code to type in themselves.
 */
const REQUOTE_TTL_MS = 10 * 60 * 1000;
const REQUOTE_MAX_ATTEMPTS = 5;
const requoteCodes = new Map<string, { hash: string; expiresAt: number; attempts: number }>();

function hashRequoteCode(pickupId: string, code: string): string {
  // config.JWT_SECRET is validated at boot; no fallback key here.
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`${pickupId}:${code}`).digest('hex');
}

export const LogisticsService = {
  getTechFloat(techId: string) {
    return techFloats[techId] || { cash: 0, upi: 0 };
  },

  getAssignedPickups(techId: string) {
    return activePickups.filter(p => p.techId === techId);
  },

  async requestRequote(pickupId: string, newCondition: string, newQuote: number) {
    const pickup = activePickups.find(p => p.id === pickupId);
    if (!pickup) return null;

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    requoteCodes.set(pickup.id, {
      hash: hashRequoteCode(pickup.id, code),
      expiresAt: Date.now() + REQUOTE_TTL_MS,
      attempts: 0,
    });
    pickup.status = 'requoted';

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // No delivery channel is implemented for this code. Returning it to the
      // technician would let them approve their own re-quote, so the endpoint
      // reports the gap instead.
      logger.error({ pickupId: pickup.id }, 'Re-quote code generated but no customer delivery channel is configured');
      return { pickupId: pickup.id, newQuote, delivered: false, message: 'Re-quote confirmation is not available yet' };
    }

    // Local development only: the code is written to the server console, never
    // to the API response.
    process.stdout.write(`[DEV REQUOTE OTP] ${pickup.id} -> ${code}\n`);
    return { pickupId: pickup.id, newQuote, delivered: false, message: 'Confirmation code generated (dev console)' };
  },

  async verifyRequoteOtp(pickupId: string, otp: string) {
    const pickup = activePickups.find(p => p.id === pickupId);
    if (!pickup) return false;

    const entry = requoteCodes.get(pickupId);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      requoteCodes.delete(pickupId);
      return false;
    }
    if (entry.attempts >= REQUOTE_MAX_ATTEMPTS) {
      requoteCodes.delete(pickupId);
      return false;
    }

    const expected = Buffer.from(entry.hash, 'utf8');
    const actual = Buffer.from(hashRequoteCode(pickupId, String(otp ?? '')), 'utf8');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    if (!matches) {
      entry.attempts += 1;
      return false;
    }

    // Single use.
    requoteCodes.delete(pickupId);
    pickup.status = 'completed';
    return true;
  }
};
