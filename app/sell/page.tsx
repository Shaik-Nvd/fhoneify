'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';
import { formatCurrency } from '@/lib/format';
import { Metadata } from 'next';

interface DashboardData {
  listings: Array<{ id: string; brand: string; model: string; price: number; status: string; city: string }>;
  pickups: Array<{ id: string; listingId: string; pickupDate: string; status: string }>;
  walletBalance: number;
  activeCount: number;
  pendingCount: number;
}

export default function SellDashboardPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.push('/auth'); return; }
    async function load() {
      try { const res = await api.get('/api/sell/dashboard'); setData(res.data.data); }
      catch { setData(null); }
      finally { setLoading(false); }
    }
    load();
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="page-animate" style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>SELLER DASHBOARD</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--foreground)' }}>Welcome back{user?.phone ? `, ${user.phone}` : ''}</h1>
        </div>
        <Link href="/sell/create" className="btn-primary" style={{ padding: '10px 20px' }}>
          Sell New Device
        </Link>
      </div>

      {loading ? (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '7rem' }} />)}
          </div>
          <div className="skeleton" style={{ height: '20rem' }} />
        </div>
      ) : !data ? (
        <div className="alert-error" style={{ marginTop: '2rem' }}>Failed to load dashboard.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Balance</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{formatCurrency(data.walletBalance)}</p>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Listings</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{data.activeCount}</p>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Approvals</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{data.pendingCount}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(26,26,26,0.5)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Your Listings</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {data.listings.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>You have no listings yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.listings.map((l) => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)' }}>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{l.brand} {l.model}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{l.city} · {formatCurrency(l.price)}</p>
                        </div>
                        <span className={`badge ${l.status === 'active' ? 'badge-success' : l.status === 'pending' ? 'badge-pending' : 'badge-muted'}`}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(26,26,26,0.5)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Scheduled Pickups</h2>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {data.pickups.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No pending pickups.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.pickups.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)' }}>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>Listing #{p.listingId}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(p.pickupDate).toLocaleString()}</p>
                        </div>
                        <span className={`badge ${p.status === 'completed' ? 'badge-success' : p.status === 'pending' ? 'badge-pending' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
