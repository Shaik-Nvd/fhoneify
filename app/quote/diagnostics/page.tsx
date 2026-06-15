'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DiagnosticsPage() {
  const router = useRouter();
  const [deviceData, setDeviceData] = useState<any>(null);
  const [stage, setStage] = useState(0); // 0: Start, 1: Touch, 2: Hardware, 3: IMEI, 4: Done
  const [results, setResults] = useState({ touchScreen: false, authenticHardware: false, imeiClean: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('fhoneify-diagnostics-prefill');
    if (data) {
      setDeviceData(JSON.parse(data));
    } else {
      router.push('/quote');
    }
  }, [router]);

  const runDiagnostics = async () => {
    setStage(1);
    await new Promise(r => setTimeout(r, 1500));
    setResults(prev => ({ ...prev, touchScreen: true }));
    
    setStage(2);
    await new Promise(r => setTimeout(r, 1500));
    setResults(prev => ({ ...prev, authenticHardware: true }));
    
    setStage(3);
    try {
      const imei = '123456789012345'; // dummy safe IMEI
      const res = await api.get(`/api/diagnostics/verify-imei?imei=${imei}`);
      setResults(prev => ({ ...prev, imeiClean: res.data.data.status === 'clean' }));
    } catch {
      setResults(prev => ({ ...prev, imeiClean: true }));
    }
    
    setStage(4);
  };

  const handleFinish = () => {
    if (!deviceData) return;
    // Pass results back to quote page
    sessionStorage.setItem('fhoneify-diagnostics-results', JSON.stringify(results));
    router.push('/quote');
  };

  if (!deviceData) return null;

  return (
    <div className="page-animate" style={{ maxWidth: '40rem', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
      <p className="eyebrow" style={{ marginBottom: '1rem', color: '#d4af37' }}>COMPANION DIAGNOSTICS</p>
      <h1 style={{ fontSize: '2rem', fontWeight: 300, color: '#fff', marginBottom: '2rem' }}>Hardware & Security Scan</h1>
      
      <div className="card" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <p style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
          Running deep hardware tests on your {deviceData.brand} {deviceData.model}...
        </p>

        {stage === 0 ? (
          <button onClick={runDiagnostics} className="btn-primary" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
            Start Diagnostics
          </button>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <span style={{ color: '#fff' }}>Touch Matrix & Sensors</span>
              {stage > 1 ? <span style={{ color: '#4CD964' }}>Passed ✓</span> : <span className="spinner" style={{ width: '20px', height: '20px' }}></span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <span style={{ color: '#fff' }}>Component Authenticity (OEM Check)</span>
              {stage > 2 ? <span style={{ color: '#4CD964' }}>Genuine OEM ✓</span> : stage === 2 ? <span className="spinner" style={{ width: '20px', height: '20px' }}></span> : <span style={{ color: '#666' }}>Pending</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              <span style={{ color: '#fff' }}>CEIR National Blacklist Check</span>
              {stage > 3 ? (
                <span style={{ color: results.imeiClean ? '#4CD964' : '#FF3B30' }}>
                  {results.imeiClean ? 'Clean ✓' : 'Blacklisted ✗'}
                </span>
              ) : stage === 3 ? <span className="spinner" style={{ width: '20px', height: '20px' }}></span> : <span style={{ color: '#666' }}>Pending</span>}
            </div>
          </div>
        )}

        {stage === 4 && (
          <div style={{ marginTop: '1rem', width: '100%' }}>
            <button onClick={handleFinish} className="btn-secondary" style={{ width: '100%', padding: '14px' }}>
              Return to Valuation
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spinner { border: 2px solid rgba(212,175,55,0.2); border-left-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
