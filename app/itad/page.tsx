'use client';

import Link from 'next/link';

export default function ITADLandingPage() {
  return (
    <div className="page-animate" style={{ width: '100%', backgroundColor: '#050505', minHeight: '100vh', color: '#fff' }}>
      {/* ITAD Hero */}
      <section style={{ padding: '6rem 1.5rem', textAlign: 'center', borderBottom: '1px solid #1a1a1a', background: 'radial-gradient(circle at center, #1a1a1a 0%, #050505 100%)' }}>
        <p className="eyebrow" style={{ marginBottom: '1.5rem', color: '#d4af37' }}>CORPORATE IT ASSET DISPOSITION</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300, lineHeight: 1.15, marginBottom: '1.5rem' }}>
          Secure Enterprise <br /> Liquidation.
        </h1>
        <p style={{ color: '#a0a0a0', fontSize: '1.1rem', maxWidth: '36rem', margin: '0 auto 3rem', lineHeight: 1.6 }}>
          Upgrade your company&apos;s devices with confidence. Fhoneify B2B provides maximum value recovery, certified DoD 5220.22-M data destruction, and seamless bulk logistics.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
          <button className="btn-primary" style={{ padding: '16px 40px', fontSize: '1rem' }}>Get Enterprise Valuation</button>
          <Link href="/partner" className="btn-outline" style={{ padding: '16px 40px', fontSize: '1rem' }}>Partner Portal</Link>
        </div>
      </section>

      {/* ITAD Features */}
      <section style={{ maxWidth: '80rem', margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="card" style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>Bulk Value Recovery</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Our B2B auction engine ensures your retired corporate fleets are bid on by hundreds of verified dealers, guaranteeing the highest market return.
            </p>
          </div>
          <div className="card" style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>Certified Erasure</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Every device undergoes rigorous 3-pass wiping. We issue legally compliant Certificates of Data Destruction for your compliance records.
            </p>
          </div>
          <div className="card" style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚚</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>White-Glove Logistics</h3>
            <p style={{ color: '#a0a0a0', fontSize: '0.95rem', lineHeight: 1.6 }}>
              We handle everything. From secure packing at your office to bonded transport and final laboratory processing. Zero hassle for your IT team.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
