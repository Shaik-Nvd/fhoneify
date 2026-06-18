import { SEED_DEVICES, quotes, counters, Quote, Device, leads, Lead } from '../../data';
import fs from 'fs';
import path from 'path';

// Load the Cashify prices dictionary
let cashifyPrices: Record<string, number> = {};
try {
  const dataPath = path.join(process.cwd(), 'server', 'data', 'cashify_prices.json');
  if (fs.existsSync(dataPath)) {
    cashifyPrices = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load cashify_prices.json", err);
}

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

  // Form the key to lookup Cashify price, e.g. "apple-iphone-11-128gb"
  const lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // 1. Get Base Market Price
  let baseMarketPrice = cashifyPrices[lookupKey] || device.basePrice || 100000;

  // 2. Apply Competitive Uplift (Fhoneify beats Cashify)
  let upliftedBasePrice = baseMarketPrice;
  if (baseMarketPrice <= 20000) {
    upliftedBasePrice = baseMarketPrice * 1.08; // 8% greater
  } else if (baseMarketPrice <= 50000) {
    upliftedBasePrice = baseMarketPrice * 1.06; // 6% greater
  } else {
    upliftedBasePrice = baseMarketPrice * 1.04; // 4% greater
  }

  // 3. Apply Condition Multiplier to the Uplifted Base
  let estimatedPrice = Math.round(upliftedBasePrice * multiplier);
  
  // Dynamic Market Depreciation Engine (Optional legacy logic, can be kept)
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
  return { estimatedPrice, deviceId, condition, quoteId, upliftedBasePrice };
}

export function getQuoteById(quoteId: string): Quote | null {
  return quotes.get(quoteId) || null;
}

export function createLead(data: { userId?: string; name?: string; phone: string; brand: string; model: string; storage: string; quotedPrice: number; pickupDate?: string; pickupTime?: string }): Lead {
  const lead: Lead = {
    id: `lead-${Date.now()}`,
    userId: data.userId,
    name: data.name,
    phone: data.phone,
    brand: data.brand,
    model: data.model,
    storage: data.storage,
    quotedPrice: data.quotedPrice,
    pickupDate: data.pickupDate,
    pickupTime: data.pickupTime,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  leads.push(lead);
  return lead;
}
