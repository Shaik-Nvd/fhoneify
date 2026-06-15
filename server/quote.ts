import { Router, Request, Response } from 'express';
import { SEED_DEVICES } from './devices';

const router = Router();

const CONDITION_MULTIPLIERS: Record<string, number> = {
  like_new: 0.9,
  excellent: 0.8,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
};

const BRAND_MULTIPLIERS: Record<string, number> = {
  apple: 1.2,
  samsung: 1.0,
  oneplus: 0.95,
  xiaomi: 0.85,
  realme: 0.8,
  google: 1.0,
};

const BASE_PRICE = 5000;

/** GET /api/quote/devices */
router.get('/devices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: SEED_DEVICES,
    message: 'Devices fetched successfully',
  });
});

/** POST /api/quote */
router.post('/', (req: Request, res: Response) => {
  const { deviceId, condition, storage } = req.body;

  const device = SEED_DEVICES.find((d) => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  const conditionMultiplier = CONDITION_MULTIPLIERS[condition] ?? 0.5;
  const brandMultiplier =
    BRAND_MULTIPLIERS[device.brand.toLowerCase()] ?? 0.85;
  const storageBonus = storage?.includes('512') ? 1.15 : storage?.includes('256') ? 1.05 : 1;

  const estimatedPrice = Math.round(
    BASE_PRICE * 20 * conditionMultiplier * brandMultiplier * storageBonus
  );

  res.json({
    success: true,
    data: {
      estimatedPrice,
      deviceId: device.id,
      condition,
      quoteId: `q-${Date.now()}`,
    },
    message: 'Quote generated successfully',
  });
});

export default router;
