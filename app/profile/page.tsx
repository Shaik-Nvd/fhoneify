'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function ProfilePage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user, logout } = useHydratedAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '40rem', margin: '0 auto', minHeight: '80vh' }}>
      <h1 className="page-title" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>My Profile</h1>
      <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>{user?.phone || 'Verified User'}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <Link href="/sell" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 500, margin: 0 }}>Seller Dashboard</h3>
              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>View your active listings & quotes</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#666" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </Link>

        <Link href="/wallet" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 500, margin: 0 }}>My Wallet</h3>
              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>Check balance and transactions</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#666" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </Link>

        <Link href="/security" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 500, margin: 0 }}>Security</h3>
              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>Manage login and passwords</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#666" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </Link>

        {user?.role === 'admin' && (
          <Link href="/admin" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div>
                <h3 style={{ color: '#d4af37', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Admin Panel</h3>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>Manage platform settings</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#d4af37" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Link>
        )}

      </div>

      <button 
        onClick={handleLogout}
        className="w-full mt-8 p-4 rounded-xl font-bold text-center border"
        style={{ color: '#FF3B30', borderColor: 'rgba(255, 59, 48, 0.3)', backgroundColor: 'rgba(255, 59, 48, 0.05)' }}
      >
        Log Out
      </button>

    </div>
  );
}
