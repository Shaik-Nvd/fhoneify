'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

interface PrefillData {
  deviceId: string;
  brand: string;
  model: string;
  storage: string;
  condition: string;
  estimatedPrice: number;
}

export default function CreateListingPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useHydratedAuth();
  const [prefill, setPrefill] = useState<PrefillData | null>(null);
  const [city, setCity] = useState('Bangalore');
  const [pickupDate, setPickupDate] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.push('/auth'); return; }
    try {
      const saved = sessionStorage.getItem('fhoneify-quote-prefill');
      if (saved) setPrefill(JSON.parse(saved));
      else router.push('/quote');
    } catch { router.push('/quote'); }
  }, [hydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefill || !address || !pickupDate) return;
    try {
      setLoading(true); setError(null);
      const res = await api.post('/api/sell/listings', {
        deviceId: prefill.deviceId, condition: prefill.condition, city, address, pickupDate,
      });
      sessionStorage.removeItem('fhoneify-quote-prefill');
      router.push('/sell');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  if (!hydrated || !isAuthenticated || !prefill) return null;

  return (
    <div className="page-animate" style={{ maxWidth: '36rem', margin: '0 auto', padding: '3rem 1rem' }}>
      <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>SELL DEVICE</p>
      <h1 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 300, color: '#fff', marginBottom: '2rem' }}>Finalize Listing</h1>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
          <p style={{ fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.25rem' }}>Device to sell</p>
          <p style={{ fontWeight: 600, color: '#fff', fontSize: '1.1rem' }}>{prefill.brand} {prefill.model}</p>
          <p style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>{prefill.storage} · Condition: {prefill.condition}</p>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>Estimated Price</span>
            <span style={{ fontWeight: 700, color: '#d4af37', fontSize: '1.1rem' }}>₹{prefill.estimatedPrice}</span>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} required style={{ width: '100%' }}>
              {['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>Pickup Date</label>
            <input type="datetime-local" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.35rem', fontWeight: 500 }}>Pickup Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} placeholder="Full address for device inspection and pickup" style={{ width: '100%', resize: 'none' }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: '0.5rem', opacity: loading ? 0.4 : 1 }}>
            {loading ? 'Creating Listing...' : 'Confirm & Schedule Pickup'}
          </button>
        </form>
      </div>
    </div>
  );
}
