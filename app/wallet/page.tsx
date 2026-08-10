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
          <h3 style={{ color: 'var(--foreground)', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>Refer & Earn ₹250</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Share your referral code with friends. When they sign up, you both get ₹250 credited to your wallet instantly!
          </p>
          
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem', fontWeight: 500 }}>Your Unique Referral Code</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              readOnly 
              value={data?.referralCode || 'Not generated yet'} 
              style={{ flex: 1, minWidth: '150px', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '2px', color: 'var(--gold)', fontWeight: 700, backgroundColor: 'rgba(212,175,55,0.05)', borderColor: 'var(--gold)' }}
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
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Sign up on Fhoneify using my referral code ${data?.referralCode} and get ₹250! ${typeof window !== 'undefined' ? window.location.origin : 'https://fhoneify.com'}?ref=${data?.referralCode}&utm_source=whatsapp&utm_medium=share`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', color: 'white', border: 'none' }}
              title="Share on WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px' }}>
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
              </svg>
              Share
            </a>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Transaction History */}
        <div className="card" style={{ flex: 2 }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Ledger History</h2>
          
          {(!data?.history || data.history.length === 0) ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.history.map((entry: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i !== data.history.length - 1 ? '1px solid #1f1f1f' : 'none' }}>
                  <div>
                    <p style={{ color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }}>{entry.type.replace('_', ' ')}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{entry.description}</p>
                    <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '0.25rem' }}>{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <div style={{ color: entry.amount > 0 ? '#34C759' : 'var(--foreground)', fontWeight: 600, fontSize: '1.1rem' }}>
                    {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Coupons */}
        <div className="card" style={{ flex: 1, height: 'fit-content' }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Active Promo Codes</h2>
          
          {(!data?.coupons || data.coupons.length === 0) ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No active coupons available right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.coupons.map((c: any) => (
                <div key={c.code} style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px dashed #2a2a2a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '1px' }}>{c.code}</span>
                    <span className="badge-gold">
                      {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                    </span>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
