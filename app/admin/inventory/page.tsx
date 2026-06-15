'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

interface InventoryItem {
  id: string;
  deviceId: string;
  imei: string;
  phase: string;
  grade?: string;
  device?: {
    brand: string;
    model: string;
  };
}

export default function InventoryAdminPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Intake form state
  const [showIntake, setShowIntake] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newImei, setNewImei] = useState('');
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    
    fetchInventory();
    api.get('/api/quote/devices').then(res => setDevices(res.data.data)).catch(console.error);
  }, [hydrated, isAuthenticated, user, router]);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/inventory');
      setItems(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/inventory/intake', { deviceId: newDeviceId, imei: newImei });
      setShowIntake(false);
      setNewDeviceId('');
      setNewImei('');
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to intake device');
    }
  };

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin" style={{ color: '#a0a0a0', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff' }}>Inventory & QA Pipeline</h1>
        </div>
        <button onClick={() => setShowIntake(!showIntake)} className="btn-primary">
          {showIntake ? 'Cancel Intake' : '+ Intake Device'}
        </button>
      </div>

      {showIntake && (
        <form onSubmit={handleIntake} className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>Device Model</label>
            <select value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} required style={{ width: '100%' }}>
              <option value="">Select Device...</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.storage})</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '0.5rem' }}>IMEI (15 digits)</label>
            <input type="text" value={newImei} onChange={(e) => setNewImei(e.target.value)} required minLength={15} maxLength={15} style={{ width: '100%' }} placeholder="e.g. 358912345678901" />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>Intake</button>
        </form>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: '400px' }} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a', backgroundColor: '#0a0a0a' }}>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>ID</th>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>Model</th>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>IMEI</th>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>Phase</th>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>Grade</th>
                <th style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '1rem', color: '#fff', fontSize: '0.9rem' }}>{item.id}</td>
                  <td style={{ padding: '1rem', color: '#fff', fontSize: '0.9rem' }}>{item.device?.brand} {item.device?.model}</td>
                  <td style={{ padding: '1rem', color: '#a0a0a0', fontSize: '0.85rem', fontFamily: 'monospace' }}>{item.imei}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${
                      item.phase === 'received' ? 'badge-muted' : 
                      item.phase === 'qa_testing' ? 'badge-warning' : 
                      item.phase === 'refurbishing' ? 'badge-info' : 'badge-success'
                    }`}>
                      {item.phase.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#d4af37', fontWeight: 600, fontSize: '0.9rem' }}>
                    {item.grade || '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {item.phase === 'qa_testing' ? (
                      <Link href={`/admin/inventory/qa/${item.id}`} className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                        Start QA
                      </Link>
                    ) : item.phase === 'received' ? (
                      <button 
                        onClick={() => api.put(`/api/inventory/${item.id}/phase`, { phase: 'qa_testing' }).then(fetchInventory)}
                        className="btn-outline" 
                        style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                      >
                        Send to QA
                      </button>
                    ) : (
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>No Action</span>
                    )}
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
