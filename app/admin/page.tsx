'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

interface AdminStats {
  pendingPickups: number;
  activeListings: number;
  totalUsers: number;
  systemWallet: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    async function load() {
      try { const res = await api.get('/api/admin/stats'); setStats(res.data.data); }
      catch { setStats(null); }
      finally { setLoading(false); }
    }
    load();
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>ADMINISTRATION</p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', marginBottom: '2rem' }}>System Dashboard</h1>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: '7rem' }} />)}
        </div>
      ) : !stats ? (
        <div className="alert-error">Failed to load stats.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#a0a0a0', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Pickups</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#d4af37', lineHeight: 1 }}>{stats.pendingPickups}</p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#a0a0a0', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Listings</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{stats.activeListings}</p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#a0a0a0', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Users</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{stats.totalUsers}</p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: '#a0a0a0', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>System Wallet</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>₹{stats.systemWallet}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <Link href="/admin/listings" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>Manage Listings</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Approve, reject, or mark as sold</p>
          </div>
          <span style={{ color: '#d4af37' }}>→</span>
        </Link>
        <Link href="/admin/inventory" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>Inventory & QA</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Manage stock, IMEI, and device grading</p>
          </div>
          <span style={{ color: '#d4af37' }}>→</span>
        </Link>
        <Link href="/admin/cms" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>Blog CMS</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Write articles and manage SEO</p>
          </div>
          <span style={{ color: '#d4af37' }}>→</span>
        </Link>
        <Link href="/admin/fraud" className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,59,48,0.3)' }}>
          <div>
            <h3 style={{ color: '#FF3B30', fontWeight: 600, marginBottom: '0.25rem' }}>Fraud & Security</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Review high-risk transactions</p>
          </div>
          <span style={{ color: '#FF3B30' }}>→</span>
        </Link>
        <div className="card" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>Manage Pickups</h3>
          <p style={{ color: '#a0a0a0', fontSize: '0.85rem' }}>Coming soon</p>
        </div>
      </div>
    </div>
  );
}
