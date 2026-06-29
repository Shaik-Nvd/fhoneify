import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SendOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
});

const VerifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  otp: z.string().optional(),
  firebaseToken: z.string().optional(),
  referralCode: z.string().optional(),
});

const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export async function sendOtp(req: Request, res: Response) {
  const { phone } = req.body; // Needs to be format "+1234567890"
  if (!phone) { return res.status(400).json({ error: 'Phone required' }); }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  try {
    await prisma.whatsAppOTP.upsert({
      where: { phone },
      update: { code, expiresAt, createdAt: new Date() },
      create: { phone, code, expiresAt },
    });

    const response = await fetch(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
          language: { code: 'en_US' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
          ]
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error(err);
      return res.status(500).json({ error: 'WhatsApp delivery failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server database error' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  const { phone, code, referralCode } = req.body;
  try {
    const record = await prisma.whatsAppOTP.findUnique({ where: { phone } });
    if (!record || record.code !== code || new Date() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await prisma.whatsAppOTP.delete({ where: { phone } });
    
    const loginResult = await authService.generateTokensForUser(phone, referralCode);
    return res.json({ success: true, data: loginResult, message: 'Login successful' });
  } catch (e) {
    logger.error(e, 'Verification system error');
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
