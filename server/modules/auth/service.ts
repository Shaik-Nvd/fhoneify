import jwt from 'jsonwebtoken';
import config from '../../config';
import { users, redis, User } from '../../data';
import logger from '../../lib/logger';
import { verifyPassword, isValidPasswordHash, timingSafeStringEqual, getDummyPasswordHash } from '../../lib/password';
import crypto from 'crypto';

/**
 * Options for every token this service issues. The random jwtid makes each
 * token unique: without it, two tokens for the same user minted in the same
 * second are byte-identical, so refresh-token rotation could "revoke" a token
 * and then immediately re-store the very same string - leaving the old refresh
 * token reusable. The algorithm is pinned to match verification.
 */
function tokenOptions(expiresIn: string): jwt.SignOptions {
  return { expiresIn: expiresIn as any, jwtid: crypto.randomUUID(), algorithm: 'HS256' };
}

export async function generateTokensForUser(phone: string, usedReferralCode?: string) {
  let user = users.find((u) => u.phone === phone);
  let isNewUser = false;
  if (!user) {
    const myReferralCode = 'REF' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
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
    if (user.role === 'admin') {
      // Admin access requires the admin password. A phone OTP proves control of
      // a WhatsApp number, not the admin secret, so it must never mint an admin
      // session - otherwise whoever receives OTPs for the admin record's phone
      // number is an admin.
      logger.warn({ userId: user.id }, 'OTP login refused for an admin account; admin must use password login');
      return null;
    }
    logger.info({ userId: user.id }, 'Existing user logged in via OTP verification');
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    config.JWT_SECRET,
    tokenOptions(config.JWT_EXPIRY)
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    config.JWT_SECRET,
    tokenOptions(config.REFRESH_TOKEN_EXPIRY)
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

    // Verify refresh token using jwt. Only a token minted as a refresh token
    // may be exchanged; an access token must never extend its own lifetime.
    const decoded = jwt.verify(oldRefreshToken, config.JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; tokenType?: string };
    if (decoded.tokenType !== 'refresh') {
      logger.warn('Refresh rejected: token is not a refresh token');
      return null;
    }
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
      tokenOptions(config.JWT_EXPIRY)
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      config.JWT_SECRET,
      tokenOptions(config.REFRESH_TOKEN_EXPIRY)
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

let warnedAboutLegacyPlaintext = false;

export async function adminLoginWithPassword(username: string, password: string) {
  const validUsername = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  // The plaintext ADMIN_PASSWORD variable is no longer read for authentication
  // at all. If it is still configured, say so (without its value) so it gets
  // removed from the environment.
  if (process.env.ADMIN_PASSWORD && !warnedAboutLegacyPlaintext) {
    warnedAboutLegacyPlaintext = true;
    logger.warn('ADMIN_PASSWORD (plaintext) is set but ignored; admin login uses ADMIN_PASSWORD_HASH only. Remove ADMIN_PASSWORD from the environment.');
  }

  if (!validUsername || !passwordHash || !isValidPasswordHash(passwordHash)) {
    // Fail closed. No hardcoded default, no plaintext fallback: without a
    // configured username and a well-formed hash, nobody can log in as admin.
    logger.error(
      { usernameConfigured: !!validUsername, hashConfigured: !!passwordHash, hashWellFormed: isValidPasswordHash(passwordHash) },
      'Admin login is disabled: ADMIN_USERNAME and a valid ADMIN_PASSWORD_HASH must both be configured'
    );
    return null;
  }

  const usernameMatches = timingSafeStringEqual(username, validUsername);
  // Always spend the scrypt cost, even for a wrong username, so response
  // timing does not reveal which part of the credentials was wrong.
  const passwordMatches = await verifyPassword(password, usernameMatches ? passwordHash : await getDummyPasswordHash());

  if (usernameMatches && passwordMatches) {
    // Find or mock the admin user
    let user = users.find((u) => u.role === 'admin');
    if (!user) {
      user = { id: `u-admin-${Date.now()}`, phone: '9739063840', name: 'Super Admin', role: 'admin', email: 'admin@fhoneify.com' };
      users.push(user);
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      tokenOptions(config.JWT_EXPIRY)
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      config.JWT_SECRET,
      tokenOptions(config.REFRESH_TOKEN_EXPIRY)
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
