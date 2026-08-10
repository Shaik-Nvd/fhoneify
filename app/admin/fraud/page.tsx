'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function FraudDashboardPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    
    // Simulate fetching fraud alerts (we'll just generate some mock ones on the client for the demo)
    setTimeout(() => {
      setAlerts([
        {
          id: 'FA-991',
          userId: 'u-102',
          phone: '9876543210',
          imei: '999812345678901',
          score: 'High',
          flags: ['IMEI found on potential blacklist pattern', 'Suspicious activity timing'],
          timestamp: new Date().toISOString(),
          status: 'pending'
        },
        {
          id: 'FA-992',
          userId: 'u-105',
          phone: '9999999999',
          imei: '358912345678000',
          score: 'Critical',
          flags: ['Multiple accounts active from this IP address', 'Repeated failed OTPs'],
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'blocked'
        }
      ]);
      setLoading(false);
    }, 1000);

  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin" style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--foreground)' }}>Fraud & Security Alerts</h1>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '300px' }} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Alert ID</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>User / IMEI</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Risk Score</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Flags</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', color: 'var(--foreground)', fontSize: '0.9rem' }}>{alert.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}>{alert.phone}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{alert.imei}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge badge-danger" style={{ backgroundColor: alert.score === 'Critical' ? 'rgba(255,0,0,0.2)' : undefined }}>
                      {alert.score.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {alert.flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select 
                      defaultValue={alert.status} 
                      style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: 'var(--background)' }}
                    >
                      <option value="pending">Reviewing</option>
                      <option value="cleared">Cleared</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
