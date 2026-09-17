import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import config from '../../config';

const prisma = new PrismaClient();

/** E.164: a leading +, country code, then digits. Rejects the junk that would
 * otherwise be stored and handed to the provider verbatim. */
const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{9,14}$/, 'Enter a valid phone number with country code');

const SendOtpSchema = z.object({ phone: PhoneSchema });

const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  referralCode: z.string().trim().max(32).optional(),
  name: z.string().trim().max(120).optional(),
});

// --- OTP policy -------------------------------------------------------------
const OTP_TTL_MS = 5 * 60 * 1000;
/** Wrong guesses allowed before the code is destroyed. 6 digits with 5 tries
 * is a 1-in-200,000 chance per code. */
const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between sends for one number, so "resend" cannot be used to
 * flood a customer's WhatsApp or to farm provider spend. */
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;

/** Codes are stored as an HMAC, never in plaintext: a database dump must not
 * be enough to complete someone's login. Keyed with the server secret. */
function hashOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
}

/**
 * The OTP record store. Production always uses Prisma (the project's real
 * persistence - no process-local storage); tests substitute an in-memory
 * double so they never touch a real database. The setter refuses to do
 * anything in production, so this seam cannot become a runtime backdoor.
 */
export interface OtpRecord {
  phone: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
}

export interface OtpStore {
  find(phone: string): Promise<OtpRecord | null>;
  save(record: OtpRecord): Promise<void>;
  setAttempts(phone: string, attempts: number): Promise<void>;
  remove(phone: string): Promise<void>;
}

const prismaOtpStore: OtpStore = {
  async find(phone) {
    return prisma.whatsAppOTP.findUnique({ where: { phone } });
  },
  async save(r) {
    await prisma.whatsAppOTP.upsert({
      where: { phone: r.phone },
      update: { code: r.code, expiresAt: r.expiresAt, createdAt: r.createdAt, attempts: r.attempts },
      create: { phone: r.phone, code: r.code, expiresAt: r.expiresAt, attempts: r.attempts },
    });
  },
  async setAttempts(phone, attempts) {
    await prisma.whatsAppOTP.update({ where: { phone }, data: { attempts } });
  },
  async remove(phone) {
    await prisma.whatsAppOTP.deleteMany({ where: { phone } });
  },
};

let otpStore: OtpStore = prismaOtpStore;

/** Test-only. A no-op in production. */
export function __setOtpStoreForTests(store: OtpStore | null): void {
  if (process.env.NODE_ENV === 'production') return;
  otpStore = store ?? prismaOtpStore;
}

function otpMatches(phone: string, code: string, stored: string): boolean {
  const expected = Buffer.from(hashOtp(phone, code), 'utf8');
  const actual = Buffer.from(stored, 'utf8');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const AdminLoginSchema = z.object({
  // Upper bounds stop an oversized password from being fed into scrypt.
  username: z.string().min(1, 'Username is required').max(128, 'Invalid credentials'),
  password: z.string().min(1, 'Password is required').max(256, 'Invalid credentials'),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * Sends a login code over WhatsApp (Meta Cloud API - the provider this project
 * is configured for).
 *
 * The response reflects what actually happened. The previous version fired the
 * provider call into the background and answered {success:true} without ever
 * reading Meta's reply, so a rejected template or a bad token looked exactly
 * like a delivered code and the customer just waited for a message that was
 * never sent.
 */
export async function sendOtp(req: Request, res: Response) {
  const parsed = SendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { phone } = parsed.data;

  try {
    const existing = await otpStore.find(phone);
    if (existing && Date.now() - existing.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt.getTime())) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Please wait ${retryAfter}s before requesting another code` });
    }

    // Cryptographically secure, unlike Math.random().
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const codeHash = hashOtp(phone, code);

    const hasProvider = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_OTP_TEMPLATE_NAME);
    if (!hasProvider) {
      if (config.IS_PRODUCTION) {
        // Never fall back to returning or logging the code in production -
        // that would be a full authentication bypass.
        logger.error('WhatsApp credentials missing in production; cannot deliver OTP');
        return res.status(503).json({ error: 'OTP delivery is not configured' });
      }
      if (process.env.NODE_ENV === 'development') {
        // Local development only, and impossible in any other NODE_ENV: the
        // code goes to the developer's own console, never to the API response.
        logger.warn({ phone }, '[dev only] WhatsApp not configured; code written to the local console');
        process.stdout.write(`[DEV OTP] ${phone} -> ${code}\n`);
      } else {
        return res.status(503).json({ error: 'OTP delivery is not configured' });
      }
    } else {
      const delivery = await sendWhatsAppOtp(phone, code);
      if (!delivery.ok) {
        // Log the provider's own error (never the code) so a template or token
        // problem is diagnosable from the server logs.
        logger.error(
          { phone, providerStatus: delivery.status, providerCode: delivery.errorCode, providerSubcode: delivery.errorSubcode, providerMessage: delivery.errorMessage },
          'WhatsApp OTP delivery failed'
        );
        return res.status(502).json({ error: 'Could not send the code right now. Please try again.' });
      }
      logger.info({ phone, providerMessageId: delivery.messageId }, 'WhatsApp OTP accepted by provider');
    }

    // Stored only after delivery succeeded, so a failed send cannot invalidate
    // a code the customer already received.
    await otpStore.save({ phone, code: codeHash, expiresAt, createdAt: new Date(), attempts: 0 });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    logger.error({ err: e?.message }, 'sendOtp failed');
    return res.status(500).json({ error: 'Could not send the code right now. Please try again.' });
  }
}

interface DeliveryResult {
  ok: boolean;
  status?: number;
  messageId?: string;
  errorCode?: number;
  errorSubcode?: number;
  errorMessage?: string;
}

/** One authentication-template message through Meta's Cloud API, awaited so the
 * caller knows whether it was accepted. */
async function sendWhatsAppOtp(phone: string, code: string): Promise<DeliveryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.WHATSAPP_TIMEOUT_MS ?? 10000));
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'template',
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
          language: { code: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || 'en' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      }),
    });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok || body?.error) {
      return {
        ok: false,
        status: r.status,
        errorCode: body?.error?.code,
        errorSubcode: body?.error?.error_subcode,
        errorMessage: String(body?.error?.message ?? '').slice(0, 300),
      };
    }
    return { ok: true, status: r.status, messageId: body?.messages?.[0]?.id };
  } catch (err: any) {
    return { ok: false, errorMessage: err?.name === 'AbortError' ? 'provider request timed out' : String(err?.message ?? err).slice(0, 300) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verifies a login code. A code is single-use, expires, and is destroyed after
 * a small number of wrong guesses so it cannot be brute-forced.
 */
export async function verifyOtp(req: Request, res: Response) {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { phone, code, referralCode } = parsed.data;

  try {
    const record = await otpStore.find(phone);
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date() > record.expiresAt) {
      await otpStore.remove(phone);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (!otpMatches(phone, code, record.code)) {
      const attempts = record.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        // Burn the code rather than leaving it guessable.
        await otpStore.remove(phone);
        logger.warn({ phone }, 'OTP destroyed after too many failed attempts');
        return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
      }
      await otpStore.setAttempts(phone, attempts);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Single use: consumed the moment it succeeds.
    await otpStore.remove(phone);

    const loginResult = await authService.generateTokensForUser(phone, referralCode);
    if (!loginResult) {
      return res.status(403).json({ error: 'This account must sign in through the admin login' });
    }
    return res.json({ success: true, data: loginResult, message: 'Login successful' });
  } catch (e: any) {
    logger.error({ err: e?.message }, 'Verification system error');
    return res.status(500).json({ error: 'Verification system error' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const result = RefreshTokenSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { refreshToken } = result.data;
    const refreshResult = await authService.refreshTokens(refreshToken);
    if (!refreshResult) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
    return res.json({ success: true, data: refreshResult, message: 'Token refreshed successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in refreshToken controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    // Optional refresh token in body
    const result = LogoutSchema.safeParse(req.body);
    const refreshToken = result.success ? result.data.refreshToken : undefined;

    const auth = req.headers.authorization || '';
    const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    await authService.logout(accessToken, refreshToken);
    return res.json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in logout controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email } = req.body;
    
    // In our mock data we find the user by ID and update it
    const { users } = require('../../data');
    const user = users.find((u: any) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    logger.info({ userId }, 'User profile updated');
    
    res.json({ success: true, data: { user } });
  } catch (err) {
    logger.error(err, 'Update profile error');
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    return res.json({ success: true, data: authService.getMe(req.user) });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in getMe controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminLogin(req: Request, res: Response) {
  try {
    const result = AdminLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const { username, password } = result.data;
    const loginResult = await authService.adminLoginWithPassword(username, password);
    if (!loginResult) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }
    return res.json({ success: true, data: loginResult, message: 'Admin login successful' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in adminLogin controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
