'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';
import { useCartStore } from '@/lib/cartStore';
interface Listing {
  id: string;
  brand: string;
  model: string;
  storage?: string;
  condition: string;
  price: number;
  city: string;
  description?: string;
}

const conditionLabel: Record<string, string> = {
  like_new: 'Like New',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem, items } = useCartStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/buy/listings/${id}`);
        setListing(res.data?.data ?? null);
        if (res.data?.data) {
          document.title = `${res.data.data.brand} ${res.data.data.model} | Fhoneify`;
        }
      } catch {
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const inCart = items.some((i) => i.id === id);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!listing) return;
    try {
      setAdding(true);
      await api.post('/api/buy/cart', { listingId: listing.id });
      addItem({
        id: listing.id,
        brand: listing.brand,
        model: listing.model,
        storage: listing.storage,
        price: listing.price,
        condition: listing.condition,
        city: listing.city,
      });
      setMessage('Added to cart!');
    } catch {
      setMessage('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-4 py-12">
        <div className="skeleton mb-6 h-64" />
        <div className="skeleton mb-4 h-8 w-1/2" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="mb-4 text-muted">Listing not found</p>
        <Link href="/buy" className="text-link">Back to listings</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/buy" className="text-link mb-4 inline-block text-sm">
        ← Back to listings
      </Link>

      <div className="card overflow-hidden p-0">
        <div className="flex h-64 items-center justify-center bg-surface-elevated text-8xl">📱</div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground">
            {listing.brand} {listing.model}
          </h1>
          <p className="mt-1 text-muted">
            {listing.storage} · {conditionLabel[listing.condition] || listing.condition} · {listing.city}
          </p>
          <p className="price-gold mt-4 text-3xl">{formatCurrency(listing.price)}</p>
          {listing.description && (
            <p className="mt-4 text-muted">{listing.description}</p>
          )}

          {message && (
            <p className={`mt-4 text-sm ${message.includes('Added') ? 'text-success' : 'text-danger'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={adding || inCart}
            className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inCart ? 'Already in cart' : adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
