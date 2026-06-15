'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function SecurityCenterPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useHydratedAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.push('/auth'); return; }
    
    async function fetchCerts() {
      try {
        const response = await api.get('/api/security/certificates');
        setCerts(response.data.data);
      } catch (err) {
        console.error('Failed to fetch certificates', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCerts();
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>DATA SECURITY</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 300, color: '#fff', marginBottom: '1rem' }}>Security Center</h1>
        <p style={{ color: '#a0a0a0', maxWidth: '32rem', margin: '0 auto' }}>
          We guarantee 100% data destruction for every device sold to Fhoneify. View your device status and download official wiping certificates below.
        </p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '200px' }} />
      ) : certs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#a0a0a0' }}>No devices found. Sell a device to see its data destruction status here.</p>
          <Link href="/quote" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Sell a Device</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {certs.map(cert => (
            <div key={cert.id} className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{cert.deviceModel}</h3>
                <p style={{ color: '#a0a0a0', fontSize: '0.85rem', fontFamily: 'monospace' }}>IMEI: {cert.imei}</p>
                <div style={{ marginTop: '0.75rem' }}>
                  {cert.status === 'securely_erased' ? (
                    <span className="badge badge-success">✓ Securely Erased on {new Date(cert.wipedAt).toLocaleDateString()}</span>
                  ) : (
                    <span className="badge badge-pending">Wipe Pending (In Transit to Lab)</span>
                  )}
                </div>
              </div>
              
              <div>
                {cert.status === 'securely_erased' ? (
                  <a 
                    href={`http://localhost:3001/api/security/certificates/${cert.id}/download`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    Download Certificate
                  </a>
                ) : (
                  <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Certificate Unavailable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
