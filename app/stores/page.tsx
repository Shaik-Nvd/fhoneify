'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  workingHours: string;
  mapLink?: string;
}

export default function StoresPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState<'sell' | 'buy' | 'repair'>('repair');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const query = selectedCity ? `?city=${selectedCity}` : '';
        const [storesRes, listingsRes] = await Promise.all([
          api.get(`/api/stores${query}`),
          api.get('/api/buy/listings')
        ]);
        setStores(storesRes.data.data);
        
        const counts: Record<string, number> = {};
        const listings = listingsRes.data?.data?.listings ?? [];
        listings.forEach((l: any) => {
          if (l.locationId) {
            counts[l.locationId] = (counts[l.locationId] || 0) + 1;
          }
        });
        setStockCounts(counts);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStores();
  }, [selectedCity]);

  const cities = Array.from(new Set(stores.map(s => s.city)));

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!selectedStore || !date || !time || !purpose) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/api/stores/appointments', {
        storeId: selectedStore.id,
        date,
        time,
        purpose
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', maxWidth: '40rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h1 className="page-title" style={{ marginBottom: '1rem' }}>Appointment Confirmed!</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
            We look forward to seeing you at {selectedStore?.name} on {new Date(date).toLocaleDateString()} at {time}.
          </p>
          <button onClick={() => setSuccess(false)} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '64rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p className="eyebrow" style={{ marginBottom: '1rem' }}>LOCATE US</p>
        <h1 className="page-title" style={{ marginBottom: '1rem' }}>Fhoneify Offline Stores</h1>
        <p className="page-subtitle" style={{ maxWidth: '32rem', margin: '0 auto' }}>
          Find a store near you to drop off devices for repair, or trade in your old phone in person.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Stores List */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Cities</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '600px', overflowY: 'auto', paddingRight: '1rem' }}>
            {stores.map(store => (
              <div 
                key={store.id} 
                className="card"
                onClick={() => setSelectedStore(store)}
                style={{ 
                  cursor: 'pointer', 
                  border: selectedStore?.id === store.id ? '2px solid var(--gold)' : '1px solid var(--border)',
                  backgroundColor: selectedStore?.id === store.id ? 'rgba(212,175,55,0.05)' : 'var(--surface)'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', marginBottom: '0.5rem' }}>{store.name}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{store.address}</p>
                <div style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold)', borderRadius: '4px', color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {stockCounts[store.id] || 0} Devices in Stock
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--gold)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>{store.workingHours}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{store.phone}</span>
                  </div>
                  {store.mapLink && (
                    <a 
                      href={store.mapLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Get Directions
                    </a>
                  )}
                </div>
              </div>
            ))}
            {stores.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '2rem 0' }}>
                No stores found in this city.
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div>
          {selectedStore ? (
            <form onSubmit={handleBook} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '100px' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--foreground)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                Book Appointment
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                At <strong style={{ color: 'var(--foreground)' }}>{selectedStore.name}</strong>
              </p>

              {error && <div className="alert-error">{error}</div>}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Purpose of Visit</label>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as any)} style={{ width: '100%' }}>
                  <option value="repair">Device Repair</option>
                  <option value="sell">Sell Old Phone</option>
                  <option value="buy">Pick Up Device</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Time</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%' }} required>
                    <option value="">Select Time</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !date || !time}
                className="btn-primary"
                style={{ width: '100%', padding: '16px', marginTop: '1rem', opacity: (loading || !date || !time) ? 0.5 : 1 }}
              >
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </form>
          ) : (
            <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Select a store from the list to book an appointment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
