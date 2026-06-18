import { users, leads, listings, buy_orders, enrichListing, Listing, BuyOrder, User, Lead } from '../../data';

export function getAnalytics() {
  const paidOrders = buy_orders.filter((o) => o.status === 'paid');
  
  let revenue = 0;
  for (const o of paidOrders) {
    const ids = o.listingIds || [];
    for (const id of ids) {
      const listing = listings.find((l) => l.id === id);
      if (listing) {
        revenue += listing.price;
      }
    }
  }

  return {
    totalUsers: users.length,
    totalListings: listings.length,
    activeListings: listings.filter((l) => l.status === 'active').length,
    pendingListings: listings.filter((l) => l.status === 'pending').length,
    totalOrders: buy_orders.length,
    revenue,
    ordersByStatus: {
      pending: buy_orders.filter((o) => o.status === 'pending').length,
      paid: buy_orders.filter((o) => o.status === 'paid').length,
    },
  };
}

export function getListings(): Listing[] {
  return listings.map(enrichListing);
}

export function getOrders(): BuyOrder[] {
  return buy_orders;
}

export function getFraudListings(): Listing[] {
  return listings.filter((l) => l.status === 'rejected');
}

export function approveListing(id: string): Listing | null {
  const listing = listings.find((l) => l.id === id);
  if (!listing) return null;
  listing.status = 'active';
  return listing;
}

export function rejectListing(id: string): Listing | null {
  const listing = listings.find((l) => l.id === id);
  if (!listing) return null;
  listing.status = 'rejected';
  return listing;
}

export function getUsers(): User[] {
  return users;
}

export function getLeads(): Lead[] {
  return leads;
}
