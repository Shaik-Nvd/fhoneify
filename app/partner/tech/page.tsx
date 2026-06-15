'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';

export default function FieldTechDashboard() {
  const [float, setFloat] = useState<{ cash: number; upi: number } | null>(null);
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-quote modal state
  const [showRequote, setShowRequote] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [newQuote, setNewQuote] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(''); // For demo
  const [enteredOtp, setEnteredOtp] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [floatRes, pickupsRes] = await Promise.all([
        api.get('/api/logistics/float'),
        api.get('/api/logistics/pickups')
      ]);
      setFloat(floatRes.data.data);
      setPickups(pickupsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRequote = async () => {
    try {
      const res = await api.post('/api/logistics/requote', {
        pickupId: selectedPickup.id,
        newCondition: 'poor', // simplified
        newQuote: Number(newQuote)
      });
      setOtpSent(true);
      setGeneratedOtp(res.data.data.otp); // Demo purposes only
    } catch (err) {
      alert('Failed to request re-quote');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await api.post('/api/logistics/requote/verify', {
        pickupId: selectedPickup.id,
        otp: enteredOtp
      });
      alert('Re-quote approved! Pickup completed.');
      setShowRequote(false);
      setOtpSent(false);
      setEnteredOtp('');
      fetchData();
    } catch (err) {
      alert('Invalid OTP');
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem', textAlign: 'center' }}>Loading Fleet Dashboard...</div>;

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
        <h1 style={{ color: '#d4af37', fontSize: '1.5rem', marginBottom: '2rem' }}>Fhoneify Tech App</h1>

        {/* Tech Float Ledger */}
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem' }}>
          <div>
            <p className="eyebrow">TECH FLOAT (CASH)</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(float?.cash || 0)}</p>
          </div>
          <div>
            <p className="eyebrow">TECH FLOAT (UPI)</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(float?.upi || 0)}</p>
          </div>
        </div>

        {/* Pickups */}
        <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem' }}>Today&apos;s Pickups</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pickups.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: p.status === 'completed' ? 0.5 : 1 }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.device}</h3>
                <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{p.customerName} • {p.address}</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span className="badge-info">Declared: {p.declaredCondition.toUpperCase()}</span>
                  <span className="badge-gold">Quote: {formatCurrency(p.originalQuote)}</span>
                  <span className="badge-muted">Status: {p.status.toUpperCase()}</span>
                </div>
              </div>
              {p.status !== 'completed' && (
                <button 
                  onClick={() => { setSelectedPickup(p); setShowRequote(true); setNewQuote(''); setOtpSent(false); }} 
                  className="btn-danger"
                >
                  Issue Re-quote
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Requote Modal */}
      {showRequote && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '28rem', backgroundColor: '#111' }}>
            <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Re-evaluate Device</h2>
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              If {selectedPickup?.device} is in worse condition than &quot;{selectedPickup?.declaredCondition}&quot;, issue a lower quote. The customer must approve via OTP.
            </p>

            {!otpSent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Original Quote: {formatCurrency(selectedPickup?.originalQuote)}</label>
                  <input 
                    type="number" 
                    placeholder="Enter revised lower amount" 
                    value={newQuote} 
                    onChange={e => setNewQuote(e.target.value)} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setShowRequote(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                  <button onClick={handleRequestRequote} disabled={!newQuote} className="btn-danger" style={{ flex: 1 }}>Send Re-quote OTP</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="alert-info">Demo Note: Customer received OTP <strong>{generatedOtp}</strong></div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Ask customer for OTP to approve {formatCurrency(Number(newQuote))}</label>
                  <input 
                    type="text" 
                    placeholder="Enter 4-digit OTP" 
                    value={enteredOtp} 
                    onChange={e => setEnteredOtp(e.target.value)} 
                    style={{ width: '100%', letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }}
                    maxLength={4}
                  />
                </div>
                <button onClick={handleVerifyOtp} disabled={enteredOtp.length !== 4} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Verify & Pay
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
