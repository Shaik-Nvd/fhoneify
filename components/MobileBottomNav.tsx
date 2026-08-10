'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', path: '/', icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ) },
    { name: 'Buy', path: '/buy', icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    ) },
    { name: 'Sell', path: '/quote', icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
    ) },
    { name: 'Profile', path: '/profile', icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ) }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-border z-50 flex justify-around items-center pb-safe pt-2 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        return (
          <Link key={item.name} href={item.path} style={{ textDecoration: 'none' }} className="flex-1 flex flex-col items-center justify-center py-2 gap-1">
            <div style={{ color: isActive ? '#34C759' : 'var(--muted)', transition: 'color 0.2s' }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#34C759' : 'var(--muted)' }}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
