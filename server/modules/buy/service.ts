import { listings, carts, buy_orders, counters, enrichListing, getActiveListings, Listing, BuyOrder } from '../../data';

export function getListings(filters: { brand?: string; city?: string; condition?: string; isSelectTier?: boolean }) {
  const active = getActiveListings(filters);
  return { listings: active, total: active.length };
}

export function getListingById(id: string): Listing | null {
  const listing = listings.find((l) => l.id === id);
  if (!listing || listing.status !== 'active') return null;
  return enrichListing(listing);
}

export function getCart(userId: string): Listing[] {
  const cartIds = carts.get(userId) || [];
  return cartIds
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => l !== undefined)
    .map(enrichListing);
}

export function addToCart(userId: string, listingId: string): boolean {
  const listing = listings.find((l) => l.id === listingId && l.status === 'active');
  if (!listing) return false;

  const cart = carts.get(userId) || [];
  if (!cart.includes(listingId)) {
    cart.push(listingId);
  }
  carts.set(userId, cart);
  return true;
}

export function createOrder(userId: string, body: { address: string; couponCode?: string }): BuyOrder | null {
  const cartIds = carts.get(userId) || [];
  if (cartIds.length === 0) return null;

  // Calculate prices
  const items = cartIds.map(id => listings.find(l => l.id === id)).filter(l => l !== undefined) as Listing[];
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  
  let discount = 0;
  let finalPrice = totalPrice;
  const couponCode = body.couponCode?.trim().toUpperCase();

  if (couponCode) {
    const { coupons } = require('../../data');
    const coupon = coupons.find((c: any) => c.code === couponCode && c.isActive);
    if (coupon) {
      if (coupon.discountType === 'fixed') {
        discount = coupon.discountValue;
      } else if (coupon.discountType === 'percentage') {
        discount = (totalPrice * coupon.discountValue) / 100;
      }
      finalPrice = Math.max(0, totalPrice - discount);
    }
  }

  const order: BuyOrder = {
    id: `ord-${counters.order++}`,
    userId,
    listingIds: [...cartIds],
    status: 'pending',
    address: body.address || '',
    totalPrice,
    discount,
    finalPrice,
    couponCode: discount > 0 ? couponCode : undefined,
    createdAt: new Date().toISOString(),
  };

  buy_orders.push(order);
  
  // Clear cart
  carts.set(userId, []);

  // Credit 2% Loyalty Cashback
  if (finalPrice > 0) {
    const { addWalletLedgerEntry } = require('../../data');
    const cashback = Math.floor(finalPrice * 0.02);
    addWalletLedgerEntry(userId, cashback, 'cashback', `2% Loyalty Cashback on Order ${order.id}`);
  }

  return order;
}

export function getOrderById(userId: string, id: string): BuyOrder | null {
  const order = buy_orders.find((o) => o.id === id);
  if (!order) return null;
  // This is the buyer-facing lookup - only the order's own buyer may view it.
  // (Admin order access goes through the separate admin module, which lists
  // all orders directly rather than calling this function.)
  if (order.userId !== userId) return null;
  return order;
}
