'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Store tokens and redirect
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      router.push('/admin/leads');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', background: '#1c1c1e', borderRadius: '12px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>Admin Login</h1>
      
      {error && (
        <div style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid #FF3B30', color: '#FF3B30', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            borderRadius: '8px', 
            background: loading ? '#333' : '#d4af37', 
            color: loading ? '#a0a0a0' : '#000', 
            fontWeight: 600, 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Logging in...' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  );
}
