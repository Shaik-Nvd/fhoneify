'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatCurrency } from '@/lib/format';

export default function WalletPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    
    api.get('/api/wallet/dashboard')
      .then(res => {
        setData(res.data.data);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load wallet dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '64rem' }}>
        <div className="skeleton" style={{ height: '200px', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '64rem' }}>
        <div className="alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '64rem' }}>
      <h1 className="page-title" style={{ marginBottom: '2rem' }}>My Wallet</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Balance Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem', background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)' }}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>AVAILABLE BALANCE</p>
          <p className="price-gold" style={{ fontSize: '3.5rem', lineHeight: 1 }}>{formatCurrency(data?.balance || 0)}</p>
        </div>

        {/* Referral Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>Refer & Earn ₹250</h3>
          <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Share your referral code with friends. When they sign up, you both get ₹250 credited to your wallet instantly!
          </p>
          
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#a0a0a0', marginBottom: '0.25rem', fontWeight: 500 }}>Your Unique Referral Code</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value={data?.referralCode || 'Not generated yet'} 
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '2px', color: '#d4af37', fontWeight: 700, backgroundColor: 'rgba(212,175,55,0.05)', borderColor: '#d4af37' }}
            />
            <button 
              className="btn-secondary" 
              onClick={() => {
                navigator.clipboard.writeText(data?.referralCode || '');
                alert('Copied to clipboard!');
              }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Transaction History */}
        <div className="card" style={{ flex: 2 }}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem' }}>Ledger History</h2>
          
          {(!data?.history || data.history.length === 0) ? (
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.history.map((entry: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i !== data.history.length - 1 ? '1px solid #1f1f1f' : 'none' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }}>{entry.type.replace('_', ' ')}</p>
                    <p style={{ color: '#a0a0a0', fontSize: '0.8rem' }}>{entry.description}</p>
                    <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '0.25rem' }}>{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <div style={{ color: entry.amount > 0 ? '#34C759' : '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
                    {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Coupons */}
        <div className="card" style={{ flex: 1, height: 'fit-content' }}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem' }}>Active Promo Codes</h2>
          
          {(!data?.coupons || data.coupons.length === 0) ? (
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No active coupons available right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.coupons.map((c: any) => (
                <div key={c.code} style={{ backgroundColor: '#0a0a0a', padding: '1rem', borderRadius: '8px', border: '1px dashed #2a2a2a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#d4af37', fontWeight: 700, letterSpacing: '1px' }}>{c.code}</span>
                    <span className="badge-gold">
                      {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                    </span>
                  </div>
                  <p style={{ color: '#a0a0a0', fontSize: '0.8rem' }}>{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
