import { SEED_DEVICES } from '../../data';
import { repair_quotes, repair_bookings, counters, RepairQuote, RepairBooking } from '../../data';
import logger from '../../lib/logger';

// Mock repair base costs for different issues
const REPAIR_COSTS: Record<string, number> = {
  Screen: 3500,
  Battery: 1500,
  Camera: 2000,
  ChargingPort: 1000,
  Speaker: 800,
  Motherboard: 6000,
};

// Brand multipliers
const BRAND_MULTIPLIER: Record<string, number> = {
  Apple: 2.5,
  Samsung: 1.8,
  Google: 2.0,
  OnePlus: 1.5,
  Xiaomi: 1.0,
  Vivo: 1.0,
  Oppo: 1.0,
};

export async function generateQuote(deviceId: string, issue: string): Promise<RepairQuote | null> {
  const device = SEED_DEVICES.find((d) => d.id === deviceId);
  if (!device) return null;

  const baseCost = REPAIR_COSTS[issue] || 1000;
  const brandMult = BRAND_MULTIPLIER[device.brand] || 1.2;
  
  // Calculate final estimated cost
  const estimatedCost = Math.round(baseCost * brandMult / 100) * 100;

  const quoteId = `rq-${counters.repairQuote++}`;
  const quote: RepairQuote = {
    id: quoteId,
    deviceId,
    issue,
    estimatedCost,
    createdAt: new Date().toISOString(),
  };

  repair_quotes.set(quoteId, quote);
  logger.info({ quoteId, deviceId, issue, estimatedCost }, 'Repair quote generated');

  return quote;
}

export async function bookRepair(
  userId: string,
  quoteId: string,
  address: string,
  pickupDate: string
): Promise<RepairBooking | null> {
  const quote = repair_quotes.get(quoteId);
  if (!quote) return null;

  const bookingId = `rb-${counters.repairBooking++}`;
  const booking: RepairBooking = {
    id: bookingId,
    userId,
    repairQuoteId: quoteId,
    deviceId: quote.deviceId,
    issue: quote.issue,
    estimatedCost: quote.estimatedCost,
    status: 'scheduled',
    address,
    pickupDate,
    createdAt: new Date().toISOString(),
  };

  repair_bookings.push(booking);
  logger.info({ bookingId, userId, quoteId }, 'Repair booked successfully');

  return booking;
}

export async function getUserBookings(userId: string): Promise<RepairBooking[]> {
  return repair_bookings.filter((b) => b.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
