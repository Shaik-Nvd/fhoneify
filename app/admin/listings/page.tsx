'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';
import { formatCurrency } from '@/lib/format';

interface AdminListing {
  id: string;
  sellerId: string;
  brand: string;
  model: string;
  price: number;
  status: 'pending' | 'active' | 'sold';
  createdAt: string;
}

export default function AdminListingsPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    fetchListings();
  }, [hydrated, isAuthenticated, user, router]);

  async function fetchListings() {
    try {
      setLoading(true); setError(null);
      const res = await api.get('/api/admin/listings');
      setListings(res.data.data.listings || []);
    } catch { setError('Failed to load listings'); }
    finally { setLoading(false); }
  }

  const handleStatusChange = async (id: string, status: 'active' | 'sold') => {
    try {
      setActionLoading(id); setError(null);
      await api.patch(`/api/admin/listings/${id}`, { status });
      await fetchListings();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to update status');
    } finally { setActionLoading(null); }
  };

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>ADMINISTRATION</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--foreground)' }}>Manage Listings</h1>
        </div>
        <button onClick={fetchListings} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
          Refresh
        </button>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(26,26,26,0.5)' }}>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>ID / Date</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Device</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Seller</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}><div className="skeleton" style={{ height: '2rem', width: '50%', margin: '0 auto' }} /></td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No listings found.</td></tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', fontFamily: 'monospace' }}>{l.id.slice(0, 8)}</p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>{new Date(l.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>{l.brand} {l.model}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{l.sellerId.slice(0, 8)}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>{formatCurrency(l.price)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${l.status === 'active' ? 'badge-success' : l.status === 'pending' ? 'badge-pending' : 'badge-muted'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {l.status === 'pending' && (
                        <button onClick={() => handleStatusChange(l.id, 'active')} disabled={actionLoading === l.id} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: actionLoading === l.id ? 0.5 : 1 }}>
                          Approve
                        </button>
                      )}
                      {l.status === 'active' && (
                        <button onClick={() => handleStatusChange(l.id, 'sold')} disabled={actionLoading === l.id} className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: actionLoading === l.id ? 0.5 : 1 }}>
                          Mark Sold
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
