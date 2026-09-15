import { Request, Response } from 'express';
import logger from '../../lib/logger';

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode && token) {
    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      logger.info('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      logger.warn('WEBHOOK_VERIFICATION_FAILED');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
}

export function receiveWebhook(req: Request, res: Response) {
  const body = req.body;
  
  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      logger.info('Webhook message received from Meta');
    } else if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.statuses &&
      body.entry[0].changes[0].value.statuses[0]
    ) {
      const status = body.entry[0].changes[0].value.statuses[0];
      logger.info({ status: status.status, recipient_id: status.recipient_id }, 'Message status update');
    }
    return res.sendStatus(200);
  } else {
    return res.sendStatus(404);
  }
}
