import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  color: string;
}

export interface User {
  id: string;
  phone: string;
  name?: string | null;
  role: string;
  email: string | null;
  referralCode?: string;
  referredBy?: string;
}

export interface Listing {
  id: string;
  userId: string;
  deviceId: string;
  brand: string;
  model: string;
  storage?: string;
  condition: string;
  price: number;
  status: 'active' | 'pending' | 'sold';
  city: string;
  description?: string;
  images: string[];
  isSelectTier?: boolean;
  locationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  quoteId: string;
  deviceId: string;
  condition: string;
  estimatedPrice: number;
  estimated_price: number; // for backward compatibility with tests
  device: Device;
  createdAt: string;
}

export interface BuyOrder {
  id: string;
  userId: string;
  listingIds: string[];
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  address: string;
  razorpayOrderId?: string;
  totalPrice?: number;
  discount?: number;
  finalPrice?: number;
  couponCode?: string;
  createdAt: string;
}

export interface SellOrder {
  id: string;
  userId: string;
  listingId: string;
  status: 'pending' | 'inspected' | 'completed' | 'cancelled';
  price: number;
  createdAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  amount: number; // Positive for credit, negative for debit
  type: string;   // e.g., 'credit', 'debit', 'cashback'
  description: string;
  balance_after: number;
  createdAt: string;
}

export interface Pickup {
  id: string;
  userId: string;
  listingId: string;
  pickupDate: string;
  timeSlot: string;
  address: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: string;
  message: string;
  status: 'pending' | 'sent';
  createdAt: string;
}

export interface RepairQuote {
  id: string;
  deviceId: string;
  issue: string; // e.g., 'Screen', 'Battery', 'Camera'
  estimatedCost: number;
  createdAt: string;
}

export interface RepairBooking {
  id: string;
  userId: string;
  repairQuoteId: string;
  deviceId: string;
  issue: string;
  estimatedCost: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  address: string;
  pickupDate: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description: string;
  isActive: boolean;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  workingHours: string;
  coordinates: { lat: number; lng: number };
  mapLink?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  storeId: string;
  date: string;
  time: string;
  purpose: 'sell' | 'buy' | 'repair';
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface QAReport {
  screen: 'pass' | 'fail';
  battery: 'pass' | 'fail';
  camera: 'pass' | 'fail';
  buttons: 'pass' | 'fail';
  notes: string;
}

export interface InventoryItem {
  id: string;
  deviceId: string;
  imei: string;
  sourceListingId?: string;
  phase: 'received' | 'qa_testing' | 'refurbishing' | 'ready_for_sale';
  qaReport?: QAReport;
  grade?: 'A-Grade' | 'B-Grade' | 'C-Grade' | 'Rejected';
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
}

export const b2bBids: Record<string, { id: string; lotId: string; partnerId: string; amount: number; timestamp: string }[]> = {};

// ─── Phase K: Logistics & Payments ──────────────────────────────────────────────
export const techFloats: Record<string, { cash: number; upi: number }> = {
  'u-tech-1': { cash: 50000, upi: 200000 },
};

export const activePickups = [
  {
    id: 'pickup-1',
    techId: 'u-tech-1',
    customerName: 'Rahul Kumar',
    device: 'Apple iPhone 13 128GB',
    declaredCondition: 'excellent',
    originalQuote: 45000,
    status: 'assigned', // assigned, requoted, completed
    address: '123 Tech Park, Bangalore',
  },
  {
    id: 'pickup-2',
    techId: 'u-tech-1',
    customerName: 'Priya S.',
    device: 'Samsung Galaxy S22 256GB',
    declaredCondition: 'good',
    originalQuote: 32000,
    status: 'assigned',
    address: '456 Koramangala, Bangalore',
  }
];

// ─── Listings & Mock Inventory ────────────────────────────────────────────────────────────────

import { SEED_DEVICES } from './seed_devices';
export { SEED_DEVICES };

export const users: User[] = [
  { id: 'u-buyer',  phone: '9876543210', role: 'buyer',  email: 'buyer@test.com', referralCode: 'REFBUYER' },
  { id: 'u-seller', phone: '9988776655', role: 'seller', email: 'seller@test.com', referralCode: 'REFSELLER' },
  { id: 'u-admin',  phone: '9000000000', role: 'admin',  email: 'admin@phoneify.com', referralCode: 'REFADMIN' },
];

export const coupons: Coupon[] = [
  { code: 'WELCOME500', discountType: 'fixed', discountValue: 500, description: '₹500 off on your first purchase', isActive: true },
  { code: 'FESTIVE10', discountType: 'percentage', discountValue: 10, description: '10% off during festival season', isActive: true },
];

export const inventory: InventoryItem[] = [
  {
    id: 'inv-3',
    deviceId: '3',
    grade: 'B-Grade',
    imei: '123456789012345',
    phase: 'ready_for_sale',
    createdAt: '2026-06-14T23:00:00.000Z'
  },
  {
    id: 'inv-4',
    deviceId: '1',
    grade: 'A-Grade',
    imei: '123456789012346',
    phase: 'ready_for_sale',
    createdAt: '2026-06-14T23:00:00.000Z'
  },
  {
    id: 'inv-5',
    deviceId: '2',
    grade: 'A-Grade',
    imei: '123456789012347',
    phase: 'ready_for_sale',
    createdAt: '2026-06-14T23:00:00.000Z'
  }
];

export let listings: Listing[] = [
  { id: 'l1', userId: 'u-seller', deviceId: 'd1',  brand: 'Apple',   model: 'iPhone 15 Pro',     storage: '256GB', condition: 'like_new',  price: 95000, status: 'active',  city: 'Mumbai',    description: 'Perfect condition, 2 months old. Bill and box available.', images: [], isSelectTier: true, locationId: 'store-1' },
  { id: 'l2', userId: 'u-seller', deviceId: 'd3',  brand: 'Samsung', model: 'Galaxy S23 Ultra',  storage: '512GB', condition: 'excellent', price: 75000, status: 'active',  city: 'Delhi',     description: 'Minor scratches on back, screen is perfect.', images: [], isSelectTier: false, locationId: 'store-2' },
  { id: 'l3', userId: 'u-admin',  deviceId: 'd2',  brand: 'Apple',   model: 'iPhone 13',         storage: '128GB', condition: 'good',      price: 45000, status: 'active',  city: 'Bangalore', description: 'Fully tested refurbished unit by Fhoneify.', images: [], isSelectTier: true, locationId: 'store-1' },
  { id: 'l4', userId: 'u-seller2',deviceId: 'd6',  brand: 'OnePlus', model: '11R',               storage: '256GB', condition: 'excellent', price: 32000, status: 'sold',    city: 'Pune',      description: 'Upgrading to newer model.', images: [], isSelectTier: false },
  { id: 'l5', userId: 'u-seller', deviceId: 'd10', brand: 'Google',  model: 'Pixel 8 Pro',       storage: '128GB', condition: 'like_new',  price: 85000, status: 'active',  city: 'Hyderabad', description: 'Barely used, like new.', images: [] },
  { id: 'l6', userId: 'u-seller', deviceId: 'd2',  brand: 'Apple',   model: 'iPhone 14',         storage: '128GB', condition: 'good',      price: 55000, status: 'pending', city: 'Mumbai',    description: 'Good condition iPhone 14.', images: [] },
  { id: 'l7', userId: 'u-seller', deviceId: 'd4',  brand: 'Samsung', model: 'Galaxy A54',        storage: '128GB', condition: 'excellent', price: 28000, status: 'pending', city: 'Chennai',   description: 'Excellent Galaxy A54.', images: [] },
];

export const stores: Store[] = [
  { id: 's-bangalore-1', name: 'Fhoneify Kalyan Nagar', city: 'Bangalore', address: 'First Floor, 34/9, Hennur Main Rd, opposite to dilawar restaurant, near Hennur Flyover, HBR Layout 4th Block, Meganahalli, Kalyan Nagar, Bengaluru, Karnataka 560043', phone: '080-45678901', workingHours: '10:00 AM - 8:00 PM', coordinates: { lat: 13.0244, lng: 77.6369 }, mapLink: 'https://share.google/U7f9j9Vvl7lBA0Lld' },
];

// ─── Mutable Stores ───────────────────────────────────────────────────────────

export const quotes = new Map<string, Quote>(); 
export const otps = new Map<string, { otp: string; expires: number }>();
export const carts = new Map<string, string[]>(); // userId -> listingId[]
export const pickups: Pickup[] = [];
export const notifications: Notification[] = [];

export const buy_orders: BuyOrder[] = [];
export const sell_orders: SellOrder[] = [];
export const wallet_ledger: WalletLedgerEntry[] = [];
export const repair_quotes = new Map<string, RepairQuote>();
export const repair_bookings: RepairBooking[] = [];
export const store_appointments: Appointment[] = [];
export const inventory_items: InventoryItem[] = [
  { id: 'inv-1', deviceId: 'd1', imei: '358912345678901', phase: 'received', createdAt: new Date().toISOString() },
  { id: 'inv-2', deviceId: 'd3', imei: '358912345678902', phase: 'qa_testing', createdAt: new Date().toISOString() },
  { id: 'inv-3', deviceId: 'd4', imei: '358912345678903', phase: 'ready_for_sale', grade: 'A-Grade', qaReport: { screen: 'pass', battery: 'pass', camera: 'pass', buttons: 'pass', notes: 'Perfect condition' }, createdAt: new Date().toISOString() }
];

export const blog_posts: BlogPost[] = [
  {
    id: 'bp-1',
    slug: 'benefits-of-refurbished-phones',
    title: '5 Reasons to Buy a Refurbished Phone in 2026',
    content: 'Buying a refurbished phone is no longer just about saving money. It is a smart, eco-friendly choice that gives you flagship features without the flagship price tag.\n\n### 1. Massive Cost Savings\nYou can save up to 40% compared to buying brand new.\n\n### 2. Environmental Impact\nE-waste is a massive problem. By buying refurbished, you extend the life of electronics and reduce carbon footprint.\n\n### 3. Rigorous Testing\nUnlike buying from a random person, certified refurbished phones undergo rigorous 32-point QA checks.\n\n### 4. Warranty Included\nFhoneify provides a 6-month warranty on all our A-Grade devices.\n\n### 5. Latest Features\nYou can get last year\'s flagship which is still 95% as fast as this year\'s model.',
    author: 'Admin',
    tags: ['Guide', 'Sustainability'],
    published: true,
    seoTitle: '5 Reasons to Buy a Refurbished Phone in 2026 | Fhoneify',
    seoDescription: 'Discover why buying a certified refurbished smartphone is the smartest financial and environmental choice you can make this year.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'bp-2',
    slug: 'how-to-prepare-phone-for-sale',
    title: 'How to Prepare Your Old Phone for Sale',
    content: 'Before you sell your old smartphone, it is crucial to wipe your data securely and prepare it for the next owner.\n\n### Step 1: Backup Your Data\nUse iCloud or Google Drive to back up your photos, contacts, and messages.\n\n### Step 2: Remove SIM and SD Cards\nDon\'t forget to pop out your SIM card!\n\n### Step 3: Factory Reset\nGo to Settings > General > Reset and erase all content and settings.\n\n### Step 4: Clean it up\nA clean phone gets a better valuation. Wipe the screen and clear out the charging port.\n\nAt Fhoneify, our technicians perform a certified data wipe on all incoming devices just to be safe!',
    author: 'Admin',
    tags: ['Tips', 'Security'],
    published: true,
    seoTitle: 'How to Prepare Your Old Phone for Sale - Secure Data Wipe Guide',
    seoDescription: 'Learn the essential steps to securely back up your data and factory reset your smartphone before selling it to a buyback program.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// ─── Counters ─────────────────────────────────────────────────────────────────

export const counters = {
  order: 1,
  listing: 8,
  quote: 1,
  pickup: 1,
  walletEntry: 1,
  sellOrder: 1,
  notification: 1,
  repairQuote: 1,
  repairBooking: 1,
  appointment: 1,
  inventory: 4,
  blog: 3,
};

// ─── Wallet Ledger Helper ─────────────────────────────────────────────────────

/**
 * Appends a new entry to the append-only wallet_ledger.
 * NEVER updates existing entries. Computes balance_after dynamically.
 */
export function addWalletLedgerEntry(userId: string, amount: number, type: string, description: string): WalletLedgerEntry {
  // Find all ledger entries for this user
  const userEntries = wallet_ledger.filter(entry => entry.userId === userId);
  
  let currentBalance = 0;
  if (userEntries.length > 0) {
    // Sort or get the last one directly because it's append-only
    const lastEntry = userEntries[userEntries.length - 1];
    currentBalance = lastEntry.balance_after;
  }
  
  const balance_after = currentBalance + amount;
  
  const newEntry: WalletLedgerEntry = {
    id: `wle-${counters.walletEntry++}`,
    userId,
    amount,
    type,
    description,
    balance_after,
    createdAt: new Date().toISOString()
  };
  
  wallet_ledger.push(newEntry);
  return newEntry;
}

export function getWalletBalance(userId: string): number {
  const userEntries = wallet_ledger.filter(entry => entry.userId === userId);
  if (userEntries.length === 0) return 0;
  return userEntries[userEntries.length - 1].balance_after;
}

// ─── Listing Helpers ──────────────────────────────────────────────────────────

/** Merge listing row with device seed data to fill missing fields. */
export function enrichListing(listing: Listing): Listing {
  const device = SEED_DEVICES.find((d) => d.id === listing.deviceId);
  return {
    ...listing,
    brand: listing.brand || device?.brand || '',
    model: listing.model || device?.model || '',
    storage: listing.storage || device?.storage || '',
  };
}

/** Return active listings, optionally filtered. */
export function getActiveListings(filters?: { brand?: string; city?: string; condition?: string; isSelectTier?: boolean; locationId?: string }) {
  let active = listings.filter((l) => l.status === 'active');
  if (filters?.brand) {
    active = active.filter((l) => l.brand?.toLowerCase() === filters.brand?.toLowerCase());
  }
  if (filters?.city) {
    active = active.filter((l) => l.city?.toLowerCase() === filters.city?.toLowerCase());
  }
  if (filters?.condition) {
    active = active.filter((l) => l.condition === filters.condition);
  }
  if (filters?.isSelectTier !== undefined) {
    active = active.filter((l) => !!l.isSelectTier === filters.isSelectTier);
  }
  if (filters?.locationId) {
    active = active.filter((l) => l.locationId === filters.locationId);
  }
  return active.map(enrichListing);
}

// ─── Redis In-Memory Mock (TTL-based) ──────────────────────────────────────────

class RedisMock {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async setEx(key: string, seconds: number, value: string): Promise<string> {
    const expiresAt = Date.now() + (seconds * 1000);
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  // Helper for cleanup of expired tokens
  flushExpired() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const redis = new RedisMock();
