import { listings, pickups, counters, SEED_DEVICES, enrichListing, getWalletBalance, Listing, Pickup } from '../../data';

export function getSellerDashboard(userId: string) {
  const myListings = listings.filter((l) => l.userId === userId);
  const myPickups = pickups.filter((p) => p.userId === userId);
  const walletBalance = getWalletBalance(userId);
  return {
    listings: myListings,
    pickups: myPickups,
    walletBalance,
    activeCount: myListings.filter((l) => l.status === 'active').length,
    pendingCount: myListings.filter((l) => l.status === 'pending').length,
  };
}

export function getMyListings(userId: string): Listing[] {
  return listings.filter((l) => l.userId === userId).map(enrichListing);
}

export function createListing(userId: string, body: {
  deviceId: string;
  storage?: string;
  condition?: string;
  askingPrice?: number;
  price?: number;
  city?: string;
  description?: string;
  images?: string[];
}): Listing {
  const device = SEED_DEVICES.find((d) => d.id === body.deviceId);
  const listing: Listing = {
    id: `l${counters.listing++}`,
    userId,
    deviceId: body.deviceId,
    brand: device?.brand || 'Unknown',
    model: device?.model || 'Unknown',
    storage: device?.storage || body.storage || '',
    condition: body.condition || 'good',
    price: body.askingPrice || body.price || 0,
    status: 'pending',
    city: body.city || 'Mumbai',
    description: body.description || '',
    images: body.images || [],
  };
  listings.push(listing);
  return listing;
}

export function schedulePickup(userId: string, body: {
  listingId: string;
  pickupDate: string;
  timeSlot: string;
  address: string;
}): Pickup {
  const pickup: Pickup = {
    id: `pickup-${counters.pickup++}`,
    userId,
    listingId: body.listingId,
    pickupDate: body.pickupDate,
    timeSlot: body.timeSlot,
    address: body.address,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };
  pickups.push(pickup);
  return pickup;
}

export function getMyPickups(userId: string): Pickup[] {
  return pickups.filter((p) => p.userId === userId);
}
