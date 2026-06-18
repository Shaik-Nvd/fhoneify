'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLeadsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const [usersRes, leadsRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/users`, { headers }),
          fetch(`${apiUrl}/api/admin/leads`, { headers })
        ]);

        if (usersRes.status === 401 || leadsRes.status === 401) {
          router.push('/admin/login');
          return;
        }

        const usersData = await usersRes.json();
        const leadsData = await leadsRes.json();

        if (usersData.success) setUsers(usersData.data);
        if (leadsData.success) setLeads(leadsData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', fontWeight: 600 }}>Admin Leads Dashboard</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/admin/login');
          }}
          style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {error && <div style={{ color: '#FF3B30', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Users Section */}
        <div style={{ background: '#1c1c1e', padding: '1.5rem', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#d4af37', marginBottom: '1rem' }}>Logged-In Users ({users.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#a0a0a0' }}>
                  <th style={{ padding: '0.75rem 0' }}>ID</th>
                  <th style={{ padding: '0.75rem 0' }}>Phone</th>
                  <th style={{ padding: '0.75rem 0' }}>Role</th>
                  <th style={{ padding: '0.75rem 0' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #2a2a2c', color: '#fff' }}>
                    <td style={{ padding: '0.75rem 0', fontSize: '0.9rem' }}>{u.id}</td>
                    <td style={{ padding: '0.75rem 0' }}>{u.phone}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0' }}>{u.name || '-'}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4} style={{ padding: '1rem 0', color: '#666', textAlign: 'center' }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leads Section */}
        <div style={{ background: '#1c1c1e', padding: '1.5rem', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#4CD964', marginBottom: '1rem' }}>Scheduled Pickups (Leads) ({leads.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#a0a0a0' }}>
                  <th style={{ padding: '0.75rem 0' }}>Date</th>
                  <th style={{ padding: '0.75rem 0' }}>Name</th>
                  <th style={{ padding: '0.75rem 0' }}>Phone</th>
                  <th style={{ padding: '0.75rem 0' }}>Device</th>
                  <th style={{ padding: '0.75rem 0' }}>Quoted Price</th>
                  <th style={{ padding: '0.75rem 0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #2a2a2c', color: '#fff' }}>
                    <td style={{ padding: '0.75rem 0', fontSize: '0.9rem' }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0' }}>{l.name || '-'}</td>
                    <td style={{ padding: '0.75rem 0' }}>{l.phone}</td>
                    <td style={{ padding: '0.75rem 0' }}>{l.brand} {l.model} ({l.storage})</td>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#d4af37' }}>₹{l.quotedPrice}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      <span style={{ padding: '0.2rem 0.5rem', background: '#4CD96420', color: '#4CD964', borderRadius: '4px', fontSize: '0.8rem' }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && <tr><td colSpan={6} style={{ padding: '1rem 0', color: '#666', textAlign: 'center' }}>No leads yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
