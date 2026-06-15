'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';

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

const conditionConfig: Record<string, { label: string; className: string }> = {
  like_new: { label: 'Like New', className: 'badge-gold' },
  excellent: { label: 'Excellent', className: 'badge-gold' },
  good: { label: 'Good', className: 'badge-info' },
  fair: { label: 'Fair', className: 'badge-muted' },
  poor: { label: 'Poor', className: 'badge-danger' },
};

export default function BuyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [brandFilter, setBrandFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [isSelectTier, setIsSelectTier] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true); setError(null);
        let url = '/api/buy/listings?';
        if (isSelectTier) url += '&isSelectTier=true';
        const res = await api.get(url);
        setAllListings(res.data?.data?.listings ?? []);
      } catch { setError('Failed to load listings'); }
      finally { setLoading(false); }
    }
    fetchAll();
  }, [isSelectTier]);

  const brands = useMemo(() => [...new Set(allListings.map((l) => l.brand))].sort(), [allListings]);
  const cities = useMemo(() => [...new Set(allListings.map((l) => l.city))].sort(), [allListings]);
  const listings = useMemo(() => {
    let result = allListings;
    if (brandFilter) result = result.filter((l) => l.brand === brandFilter);
    if (cityFilter) result = result.filter((l) => l.city === cityFilter);
    return result;
  }, [allListings, brandFilter, cityFilter]);

  return (
    <div className="page-animate" style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>MARKETPLACE</p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', marginBottom: '2rem' }}>Buy Refurbished Phones</h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <aside style={{ width: '100%', maxWidth: '16rem', flexShrink: 0 }}>
          <div className="card" style={{ position: 'sticky', top: '5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ color: '#d4af37', fontWeight: 600, fontSize: '0.9rem' }}>Filters</h2>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>Brand</label>
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={{ width: '100%' }}>
                <option value="">All brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>City</label>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ width: '100%' }}>
                <option value="">All cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>Tier</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={isSelectTier} 
                  onChange={(e) => setIsSelectTier(e.target.checked)} 
                  style={{ accentColor: '#d4af37' }}
                />
                Fhoneify Select (Premium)
              </label>
            </div>
            {(brandFilter || cityFilter || isSelectTier) && (
              <button onClick={() => { setBrandFilter(''); setCityFilter(''); setIsSelectTier(false); }} className="text-link" style={{ fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>Clear filters</button>
            )}
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {error && <div className="alert-error">{error}</div>}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: '14rem' }} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</p>
              <p style={{ color: '#a0a0a0' }}>No listings match your filters.</p>
            </div>
          ) : (
            <>
              <p style={{ color: '#a0a0a0', fontSize: '0.8rem', marginBottom: '1rem' }}>{listings.length} listing(s) found</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {listings.map((listing) => (
                  <Link key={listing.id} href={`/buy/${listing.id}`} className="card" style={{ display: 'block', textDecoration: 'none', padding: 0, overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#1a1a1a', height: '8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>📱</div>
                    <div style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{listing.brand} {listing.model}</h3>
                        <span className={conditionConfig[listing.condition]?.className || 'badge-muted'}>
                          {conditionConfig[listing.condition]?.label || listing.condition}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>{listing.storage} · {listing.city}</p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#d4af37' }}>{formatCurrency(listing.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
