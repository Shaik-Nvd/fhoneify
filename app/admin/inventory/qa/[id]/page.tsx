'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function QAGradingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [screen, setScreen] = useState<'pass'|'fail'>('pass');
  const [battery, setBattery] = useState<'pass'|'fail'>('pass');
  const [camera, setCamera] = useState<'pass'|'fail'>('pass');
  const [buttons, setButtons] = useState<'pass'|'fail'>('pass');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    
    api.get(`/api/inventory/${params.id}`)
       .then(res => setItem(res.data.data))
       .catch(err => { console.error(err); router.push('/admin/inventory'); })
       .finally(() => setLoading(false));
  }, [hydrated, isAuthenticated, user, router, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Auto calculate grade based on passes
    const fails = [screen, battery, camera, buttons].filter(x => x === 'fail').length;
    let grade = 'A-Grade';
    if (fails === 1) grade = 'B-Grade';
    if (fails === 2) grade = 'C-Grade';
    if (fails >= 3) grade = 'Rejected';
    
    try {
      await api.put(`/api/inventory/${params.id}/qa`, {
        report: { screen, battery, camera, buttons, notes },
        grade
      });
      router.push('/admin/inventory');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit QA');
      setSubmitting(false);
    }
  };

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  if (loading) return <div className="page-animate container" style={{ padding: '4rem' }}><div className="skeleton" style={{ height: '400px' }} /></div>;

  return (
    <div className="page-animate" style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/admin/inventory" style={{ color: '#a0a0a0', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>← Back to Inventory</Link>
      
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>QA TESTING</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>{item.device.brand} {item.device.model}</h1>
          <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>IMEI: {item.imei}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge badge-warning">IN PROGRESS</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#fff', borderBottom: '1px solid #2a2a2a', paddingBottom: '1rem' }}>Hardware Checklist</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Screen Condition</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setScreen('pass')} className={screen === 'pass' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Pass</button>
              <button type="button" onClick={() => setScreen('fail')} className={screen === 'fail' ? 'btn-danger' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Fail</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Battery Health (&gt;80%)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setBattery('pass')} className={battery === 'pass' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Pass</button>
              <button type="button" onClick={() => setBattery('fail')} className={battery === 'fail' ? 'btn-danger' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Fail</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Camera (Front & Back)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setCamera('pass')} className={camera === 'pass' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Pass</button>
              <button type="button" onClick={() => setCamera('fail')} className={camera === 'fail' ? 'btn-danger' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Fail</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Physical Buttons</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setButtons('pass')} className={buttons === 'pass' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Pass</button>
              <button type="button" onClick={() => setButtons('fail')} className={buttons === 'fail' ? 'btn-danger' : 'btn-outline'} style={{ flex: 1, padding: '8px' }}>Fail</button>
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Technician Notes</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            rows={3} 
            style={{ width: '100%', resize: 'none' }}
            placeholder="Describe any scratches, dents, or failures in detail..."
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '16px', marginTop: '1rem', width: '100%' }}>
          {submitting ? 'Saving...' : 'Submit QA & Generate Grade'}
        </button>
      </form>
    </div>
  );
}
