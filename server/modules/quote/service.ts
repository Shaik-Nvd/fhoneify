import { SEED_DEVICES, quotes, counters, Quote, Device } from '../../data';

const CONDITION_MULTIPLIERS: Record<string, number> = {
  like_new: 0.90,
  excellent: 0.80,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
};

const BASE_PRICE = 100000; // ₹1,00,000 baseline for Phase 1

export function listDevices(): Device[] {
  return SEED_DEVICES;
}

export function generateQuote(deviceId: string, condition: string, aiPriceAdjustment?: number) {
  const device = SEED_DEVICES.find((d) => d.id === deviceId);
  if (!device) return null;

  let multiplier = CONDITION_MULTIPLIERS[condition] ?? 0.5;
  let estimatedPrice = Math.round(BASE_PRICE * multiplier);
  
  // Dynamic Market Depreciation Engine
  // Simulate checking an internal ledger of next-gen release dates
  // If the device is an older model (e.g., iPhone 13 or 14), slash price by 15% due to newer models out
  if (device.model.includes('13') || device.model.includes('14') || device.model.includes('S22')) {
    estimatedPrice = Math.round(estimatedPrice * 0.85); // 15% depreciation
  }

  // Apply AI Price Adjustment if passed from the new AI quote flow
  if (aiPriceAdjustment) {
    estimatedPrice += aiPriceAdjustment;
  }

  const quoteId = `q-${counters.quote++}`;

  const quote: Quote = {
    quoteId,
    deviceId,
    condition,
    estimatedPrice,
    estimated_price: estimatedPrice, // snake_case alias for compatibility
    device,
    createdAt: new Date().toISOString(),
  };

  quotes.set(quoteId, quote);
  return { estimatedPrice, deviceId, condition, quoteId };
}

export function getQuoteById(quoteId: string): Quote | null {
  return quotes.get(quoteId) || null;
}
