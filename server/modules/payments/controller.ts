import { Response } from 'express';
import { z } from 'zod';
import * as paymentsService from './service';
import logger from '../../lib/logger';
import { AuthenticatedRequest } from '../../middleware/auth';

const CreateRazorpayOrderSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});

const VerifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = CreateRazorpayOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const order = paymentsService.createRazorpayOrder(req.user.id, result.data.orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, data: order });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in createOrder payment controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export function verifyPayment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = VerifyRazorpayPaymentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }
    const verification = paymentsService.verifyRazorpayPayment(req.user.id, result.data.razorpayOrderId);
    if (!verification) {
      return res.status(404).json({ success: false, error: 'Order or verification failed' });
    }
    return res.json({ success: true, data: verification, message: 'Payment verified' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in verifyPayment payment controller');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
