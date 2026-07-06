'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function ProfilePage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user, loginAt, logout } = useHydratedAuth();
  const [durationStr, setDurationStr] = useState<string | null>(null);

  useEffect(() => {
    if (!loginAt) return;
    const updateDuration = () => {
      const diff = Date.now() - loginAt;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) setDurationStr(`${days}d ${hours % 24}h`);
      else if (hours > 0) setDurationStr(`${hours}h ${mins % 60}m`);
      else setDurationStr(`${mins}m`);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [loginAt]);

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
      {user?.name && <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0', color: '#fff' }}>{user.name}</h2>}
      <p style={{ color: '#a0a0a0', marginBottom: durationStr ? '0.25rem' : '2rem' }}>{user?.phone || 'Verified User'}</p>
      {durationStr && <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2rem' }}>Logged in for: {durationStr}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        


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
