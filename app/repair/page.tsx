'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { sortBrands } from '@/lib/brands';

interface Device {
  id: string;
  brand: string;
  model: string;
}

interface RepairQuote {
  id: string;
  deviceId: string;
  issue: string;
  estimatedCost: number;
  device?: Device;
}

export default function RepairPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [issues, setIssues] = useState<string[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  
  const [quote, setQuote] = useState<RepairQuote | null>(null);
  const [address, setAddress] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch issues
    api.get('/api/repair/issues').then(res => setIssues(res.data.data)).catch(console.error);
    // Fetch devices (using quote/devices endpoint since we need a list of devices)
    api.get('/api/quote/devices').then(res => setDevices(res.data.data)).catch(console.error);
  }, []);

  const brands = sortBrands(Array.from(new Set(devices.map(d => d.brand))));
  const models = devices.filter(d => d.brand === selectedBrand);

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !selectedIssue) {
      setError('Please select a model and an issue.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/repair/quote', {
        deviceId: selectedModel,
        issue: selectedIssue
      });
      setQuote(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!address || !pickupDate) {
      setError('Please provide address and pickup date.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await api.post('/api/repair/book', {
        quoteId: quote!.id,
        address,
        pickupDate
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book repair');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', maxWidth: '40rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h1 className="page-title" style={{ marginBottom: '1rem' }}>Repair Booked!</h1>
          <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>
            Your repair request for {quote?.issue} on your {quote?.device?.brand} {quote?.device?.model} has been scheduled.
            Our executive will visit you on {new Date(pickupDate).toLocaleDateString()} for doorstep repair.
          </p>
          <Link href="/" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '48rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p className="eyebrow" style={{ marginBottom: '1rem' }}>DOORSTEP SERVICE</p>
        <h1 className="page-title" style={{ marginBottom: '1rem' }}>Mobile Repair Services</h1>
        <p className="page-subtitle" style={{ maxWidth: '32rem', margin: '0 auto' }}>
          Get instant quotes for screen, battery, and motherboard repairs. We fix it at your doorstep.
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {!quote ? (
        <form onSubmit={handleGetQuote} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Select Brand</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
              {brands.map(brand => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => { setSelectedBrand(brand); setSelectedModel(''); setQuote(null); }}
                  style={{
                    padding: '10px', borderRadius: '8px', border: selectedBrand === brand ? '2px solid #d4af37' : '1px solid #2a2a2a',
                    backgroundColor: selectedBrand === brand ? 'rgba(212,175,55,0.1)' : '#111', color: '#fff', fontSize: '0.9rem', transition: 'all 150ms'
                  }}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {selectedBrand && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Select Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Choose your model --</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.model}</option>
                ))}
              </select>
            </div>
          )}

          {selectedModel && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Select Issue</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {issues.map(issue => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => { setSelectedIssue(issue); setQuote(null); }}
                    style={{
                      padding: '12px', borderRadius: '8px', border: selectedIssue === issue ? '2px solid #d4af37' : '1px solid #2a2a2a',
                      backgroundColor: selectedIssue === issue ? 'rgba(212,175,55,0.1)' : '#111', color: '#fff', fontSize: '0.9rem', transition: 'all 150ms',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedModel || !selectedIssue || loading}
            className="btn-primary"
            style={{ width: '100%', padding: '16px', marginTop: '1rem', opacity: (!selectedModel || !selectedIssue || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Calculating...' : 'Get Instant Quote'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBookRepair} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid #2a2a2a', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Estimated Repair Cost</h2>
            <div className="price-gold" style={{ fontSize: '3rem', letterSpacing: '-1px' }}>₹{quote.estimatedCost.toLocaleString()}</div>
            <p style={{ color: '#fff', marginTop: '0.5rem', fontWeight: 500 }}>{quote.device?.brand} {quote.device?.model} - {quote.issue} Repair</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Pickup Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your complete address for the doorstep repair"
              rows={3}
              style={{ width: '100%', resize: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem', fontWeight: 500 }}>Schedule Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setQuote(null)}
              className="btn-outline"
              style={{ flex: 1, padding: '16px' }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2, padding: '16px', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Booking...' : (isAuthenticated ? 'Book Repair' : 'Login to Book')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
