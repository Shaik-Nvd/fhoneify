import { SEED_DEVICES, quotes, counters, Quote, Device, leads, Lead } from '../../data';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';

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

export function generateQuote(deviceId: string, condition: string, aiPriceAdjustment?: number, answers?: any) {
  const device = SEED_DEVICES.find((d) => d.id === deviceId);
  if (!device) return null;

  let multiplier = CONDITION_MULTIPLIERS[condition] ?? 0.5;

  // Form the key to lookup Cashify price, e.g. "apple-iphone-11-128gb"
  const lookupKey = `${device.model}-${device.storage}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // 1. Get Base Market Price
  let baseMarketPrice = cashifyPrices[lookupKey] || device.basePrice || 1000;

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
  
  // Specialized Algorithm for Samsung Galaxy S25 Ultra 5G
  if (device.model.includes('S25 Ultra')) {
    if (answers) {
      let specializedPrice = 74650; // Max Theoretical Price for Flawless
      
      // Administrative Deductions
      if (answers.warranty === false) {
        specializedPrice -= 9650; 
      }
      if (answers.validBill === false) {
        specializedPrice -= 3860;
      }
      
      // Accessories
      if (answers.accessories && !answers.accessories.includes('box')) {
        specializedPrice -= 1500;
      }

      // Basic Functional / Screen Originality
      if (answers.calls === false) specializedPrice -= 15000;
      if (answers.touch === false) specializedPrice -= 12000;
      if (answers.originalScreen === false) specializedPrice -= 15000;

      // Defects
      if (answers.defects && Array.isArray(answers.defects)) {
        // Screen Defects
        if (answers.defects.includes('broken_screen') || answers.screenCondition?.includes('More than 2')) {
          specializedPrice -= 5260; 
        } else if (answers.screenCondition?.includes('Cracked')) {
          specializedPrice -= 12000;
        }

        if (answers.defects.includes('screen_spot')) {
          specializedPrice -= 10000;
        }

        // Body Defects
        if (answers.defects.includes('body_scratch')) {
          let bodyDeduction = 0;
          if (answers.bodyScratches?.includes('1-2')) bodyDeduction += 2500;
          else if (answers.bodyScratches?.includes('More than')) bodyDeduction += 3500;

          if (answers.bodyDents?.includes('1-2')) bodyDeduction += 2460;
          else if (answers.bodyDents?.includes('More than')) bodyDeduction += 3500;
          
          if (bodyDeduction === 0) bodyDeduction = 4960; // Fallback
          specializedPrice -= bodyDeduction;
        }

        // Panel Defects
        if (answers.defects.includes('panel_missing')) {
          specializedPrice -= 8000;
        }
      }

      // Hardware / Functional Defects
      if (answers.hardware && Array.isArray(answers.hardware)) {
        const hardwarePenalties: Record<string, number> = {
          'front_camera': 4000,
          'back_camera': 8000,
          'volume': 1500,
          'fingerprint': 5000,
          'wifi': 4000,
          'speaker': 2000,
          'silent': 1500,
          'face': 5000,
          'power': 1500,
          'charging': 2500,
          'audio_receiver': 2000,
          'camera_glass': 2000,
          'microphone': 2000,
          'bluetooth': 4000,
          'vibrator': 1500,
          'proximity': 1500,
          'battery_service': 3500,
          'battery_health': 1500
        };

        for (const hw of answers.hardware) {
          if (hardwarePenalties[hw]) {
            specializedPrice -= hardwarePenalties[hw];
          }
        }
      }

      // Calculate Fhoneify Inflated Markup
      let upliftPercent = 1.0;
      if (baseMarketPrice <= 20000) upliftPercent = 1.08;
      else if (baseMarketPrice <= 50000) upliftPercent = 1.06;
      else upliftPercent = 1.04;

      let fhoneifyExtra = specializedPrice * (upliftPercent - 1.0);
      if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;
      if (fhoneifyExtra < 100 && specializedPrice > 1200) fhoneifyExtra = 100;
      
      specializedPrice += fhoneifyExtra;

      // Safeguard against going below zero
      estimatedPrice = Math.max(specializedPrice, 5000);
    }
  }

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

export async function createLead(data: { userId?: string; name?: string; phone: string; brand: string; model: string; storage: string; quotedPrice: number; pickupDate?: string; pickupTime?: string; address?: string; pincode?: string; city?: string; answers?: any }) {
  const lead = await prisma.lead.create({
    data: {
      userId: data.userId || null,
      name: data.name || null,
      phone: data.phone,
      brand: data.brand,
      model: data.model,
      storage: data.storage,
      quotedPrice: data.quotedPrice,
      pickupDate: data.pickupDate || null,
      pickupTime: data.pickupTime || null,
      address: data.address || null,
      pincode: data.pincode || null,
      city: data.city || null,
      status: 'pending',
      answers: data.answers || null,
    }
  });
  return lead;
}
