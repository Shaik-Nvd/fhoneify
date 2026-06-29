import { Router } from 'express';
import { verifyWebhook, receiveWebhook } from './controller';

const router = Router();

// Endpoint for Meta to verify the webhook (GET)
router.get('/', verifyWebhook);

// Endpoint for receiving webhook events from Meta (POST)
router.post('/', receiveWebhook);

export default router;
