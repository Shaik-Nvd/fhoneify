import { Router, Request, Response } from 'express';

const router = Router();

// White-Label Trade-In API Hook for 3rd-party resellers
router.post('/trade-in', async (req: Request, res: Response) => {
  try {
    // Expecting API Key in headers for white-label authentication
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'test-white-label-key') {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid White-Label API Key' });
    }

    const { deviceId, condition, imei } = req.body;

    // Simulate Valuation Engine Hook
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({
      success: true,
      data: {
        fhoneifyQuoteId: 'ext-quote-' + Date.now(),
        estimatedValue: 35000,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        instructions: 'Ship device to Fhoneify B2B lab or drop at nearest flagship store.'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as externalRouter };
