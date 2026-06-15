import { buy_orders, listings, addWalletLedgerEntry, notifications, counters, BuyOrder } from '../../data';
import logger from '../../lib/logger';

export function createRazorpayOrder(userId: string, orderId: string) {
  const order = buy_orders.find((o) => o.id === orderId && o.userId === userId);
  if (!order) return null;

  const rzpId = `rzp_order_${Date.now()}`;
  order.razorpayOrderId = rzpId;
  
  logger.info({ orderId, rzpId }, 'Razorpay order created in memory');
  return { razorpayOrderId: rzpId, amount: 100 }; // mock response structure
}

export function verifyRazorpayPayment(userId: string, razorpayOrderId: string) {
  const order = buy_orders.find((o) => o.razorpayOrderId === razorpayOrderId);
  if (!order) {
    logger.warn({ razorpayOrderId }, 'Order not found for Razorpay order ID verification');
    return null;
  }

  // Update order status to paid
  order.status = 'paid';
  logger.info({ orderId: order.id }, 'Order status updated to paid');

  // Mark all listings in this order as sold and credit the sellers
  const listingIds = order.listingIds || [];
  for (const listingId of listingIds) {
    const listing = listings.find((l) => l.id === listingId);
    if (listing) {
      listing.status = 'sold';
      
      // Credit seller's wallet via the append-only ledger helper
      const creditEntry = addWalletLedgerEntry(
        listing.userId,
        listing.price,
        'credit',
        `Device Sold: ${listing.brand} ${listing.model} (${listing.storage})`
      );
      
      logger.info({ 
        sellerId: listing.userId, 
        amount: listing.price, 
        balanceAfter: creditEntry.balance_after 
      }, 'Credited seller wallet for sold device');

      // Create notification for seller
      notifications.push({
        id: `notif-${counters.notification++}`,
        userId: listing.userId,
        type: 'listing_sold',
        channel: 'in_app',
        message: `Congratulations! Your listing for ${listing.brand} ${listing.model} has been sold for ₹${listing.price}.`,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  }

  // Create notification for buyer
  notifications.push({
    id: `notif-${counters.notification++}`,
    userId: order.userId,
    type: 'order_paid',
    channel: 'in_app',
    message: `Your payment for order ${order.id} was successful. We are processing it!`,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  return { status: 'paid' };
}
