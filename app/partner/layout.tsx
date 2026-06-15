'use client';

import Link from 'next/link';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#050505', color: '#fff' }}>
      {/* Partner Navbar */}
      <nav style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#0a0a0a' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem', display: 'flex', height: '64px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link href="/partner" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textDecoration: 'none', letterSpacing: '2px' }}>
              FHONEIFY <span style={{ color: '#d4af37', fontWeight: 400 }}>PARTNER</span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/" style={{ color: '#a0a0a0', fontSize: '0.85rem', textDecoration: 'none' }}>Exit to Main Site</Link>
            <div style={{ padding: '6px 12px', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid #d4af37', borderRadius: '6px', color: '#d4af37', fontSize: '0.8rem', fontWeight: 600 }}>
              Authorized Dealer
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
