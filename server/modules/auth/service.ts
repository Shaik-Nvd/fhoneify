import jwt from 'jsonwebtoken';
import config from '../../config';
import { users, otps, redis, User } from '../../data';
import logger from '../../lib/logger';
import twilio from 'twilio';

// Initialize Twilio client (requires ENV vars to be set in production)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'AC_dummy_sid_for_dev',
  process.env.TWILIO_AUTH_TOKEN || 'dummy_token_for_dev'
);

export async function sendOtp(phone: string): Promise<string> {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(phone, { otp, expires: Date.now() + 10 * 60 * 1000 });

  // If Cunnekt credentials are provided, send a real WhatsApp message
  if (process.env.CUNNEKT_API_KEY && process.env.CUNNEKT_BASE_URL) {
    try {
      // Ensure phone is in format without '+' but with country code '91' for Indian numbers
      const formattedPhone = phone.replace(/^\+/, '');
      const finalPhone = formattedPhone.startsWith('91') || formattedPhone.length > 10 ? formattedPhone : `91${formattedPhone}`;
      
      const axios = require('axios');
      const https = require('https');
      
      // Sending template message via Cunnekt API. 
      const cunnektUrl = process.env.CUNNEKT_BASE_URL?.endsWith('/') 
        ? `${process.env.CUNNEKT_BASE_URL}sendnotification` 
        : `${process.env.CUNNEKT_BASE_URL}/sendnotification`;

      await axios.post(
        cunnektUrl, 
        {
          mobile: finalPhone,
          templateid: "otptemplate",
          template: {
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: otp
                  }
                ]
              }
            ]
          }
        },
        {
          headers: {
            'API-KEY': process.env.CUNNEKT_API_KEY,
            'Content-Type': 'application/json'
          },
          // Bypass SSL "unable to verify the first certificate" error
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        }
      );
      logger.info({ phone: finalPhone }, 'OTP sent via Cunnekt WhatsApp successfully');
    } catch (error: any) {
      logger.error({ phone, err: error.response?.data || error.message }, 'Failed to send OTP via Cunnekt');
      // We don't throw here so that dev environments can still use the console fallback
      process.stdout.write(`[DEV OTP FALLBACK] Phone ${phone} → OTP: ${otp}\n`);
    }
  } else {
    // Development fallback if no real credentials are provided
    process.stdout.write(`[DEV OTP] Phone ${phone} → OTP: ${otp}\n`);
  }
  
  logger.info({ phone, otp }, 'OTP generated and logged');
  return otp;
}

export async function verifyOtp(phone: string, otp: string, usedReferralCode?: string) {
  const stored = otps.get(phone);
  if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
    logger.warn({ phone, otp }, 'Invalid or expired OTP verification attempt');
    return null;
  }
  otps.delete(phone);

  let user = users.find((u) => u.phone === phone);
  let isNewUser = false;
  if (!user) {
    const myReferralCode = 'REF' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    let referredBy: string | undefined;
    if (usedReferralCode) {
      const referrer = users.find(u => u.referralCode === usedReferralCode);
      if (referrer) {
        referredBy = referrer.id;
        const { addWalletLedgerEntry } = require('../../data');
        addWalletLedgerEntry(referrer.id, 250, 'referral_bonus', `Bonus for referring user ${phone}`);
      }
    }

    user = { id: `u-${Date.now()}`, phone, name: null, role: 'buyer', email: null, referralCode: myReferralCode, referredBy };
    users.push(user);
    isNewUser = true;
    logger.info({ userId: user.id, phone }, 'New user registered via OTP verification');

    if (referredBy) {
      const { addWalletLedgerEntry } = require('../../data');
      addWalletLedgerEntry(user.id, 250, 'signup_bonus', 'Signup bonus from referral code');
    }
  } else {
    logger.info({ userId: user.id }, 'Existing user logged in via OTP verification');
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY as any }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRY as any }
  );

  // Store refresh token in Redis mock (7 days expiry)
  await redis.setEx(`refresh:${refreshToken}`, 7 * 24 * 3600, JSON.stringify({ userId: user.id }));

  return {
    accessToken,
    refreshToken,
    isNewUser,
    user: { id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email },
  };
}

export async function refreshTokens(oldRefreshToken: string) {
  try {
    // Check if refresh token exists in Redis mock
    const sessionData = await redis.get(`refresh:${oldRefreshToken}`);
    if (!sessionData) {
      logger.warn('Refresh token not found in Redis (possibly revoked)');
      return null;
    }

    // Verify refresh token using jwt
    const decoded = jwt.verify(oldRefreshToken, config.JWT_SECRET) as { userId: string };
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      logger.warn({ userId: decoded.userId }, 'User for refresh token not found');
      return null;
    }

    // Revoke old refresh token
    await redis.del(`refresh:${oldRefreshToken}`);

    // Create new tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRY as any }
    );

    // Store new refresh token in Redis mock
    await redis.setEx(`refresh:${refreshToken}`, 7 * 24 * 3600, JSON.stringify({ userId: user.id }));

    logger.info({ userId: user.id }, 'Tokens successfully refreshed');
    return { accessToken, refreshToken };
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to refresh tokens');
    return null;
  }
}

export async function logout(accessToken: string | null, refreshToken?: string) {
  if (accessToken) {
    // Blacklist access token for remaining duration (e.g. 15 minutes max)
    await redis.setEx(`blacklist:${accessToken}`, 900, '1');
    logger.info('Access token blacklisted on logout');
  }
  if (refreshToken) {
    await redis.del(`refresh:${refreshToken}`);
    logger.info('Refresh token deleted on logout');
  }
}

export function getMe(user: User) {
  return { id: user.id, phone: user.phone, role: user.role, email: user.email };
}

export async function adminLoginWithPassword(username: string, password: string) {
  // Hardcoded for now based on user requirements. In production, this should be in DB and hashed.
  if (username === 'admin' && password === '9739063840') {
    // Find or mock the admin user
    let user = users.find((u) => u.role === 'admin');
    if (!user) {
      user = { id: `u-admin-${Date.now()}`, phone: '9739063840', name: 'Super Admin', role: 'admin', email: 'admin@fhoneify.com' };
      users.push(user);
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRY as any }
    );

    await redis.setEx(`refresh:${refreshToken}`, 7 * 24 * 3600, JSON.stringify({ userId: user.id }));

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email },
    };
  }
  return null;
}
