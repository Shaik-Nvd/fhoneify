'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useCartStore } from '@/lib/cartStore';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.items.length);
  const [mounted, setMounted] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Hide the D2C Navbar on Partner and ITAD pages
  if (pathname?.startsWith('/partner') || pathname?.startsWith('/itad')) {
    return null;
  }

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  const navCategories = [
    {
      id: 'shop',
      title: 'Shop',
      items: [
        { label: 'Buy Phones', href: '/buy' },
      ]
    },
    {
      id: 'trade',
      title: 'Trade-In',
      items: [
        { label: 'Get Quote', href: '/quote' },
        { label: 'Sell Device', href: '/sell' },
      ]
    },
    {
      id: 'services',
      title: 'Services',
      items: [
        { label: 'Repair', href: '/repair' },
        { label: 'Find a Store', href: '/stores' },
      ]
    },
    {
      id: 'more',
      title: 'Discover',
      items: [
        { label: 'Blog', href: '/blog' },
      ]
    }
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#0a0a0a',
      borderBottom: '1px solid #2a2a2a',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        height: '64px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link
          href="/"
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#d4af37',
            letterSpacing: '3px',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          FHONEIFY
        </Link>

        {/* Middle Section: Categorized Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {navCategories.map((category) => (
            <div 
              key={category.id}
              style={{ position: 'relative' }} 
              onMouseEnter={() => setHoveredMenu(category.id)} 
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <span style={{ 
                color: hoveredMenu === category.id ? '#d4af37' : '#a0a0a0', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                cursor: 'pointer', 
                transition: 'color 150ms', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px' 
              }}>
                {category.title}
                <span style={{ 
                  fontSize: '0.55rem', 
                  transform: hoveredMenu === category.id ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 200ms ease' 
                }}>
                  ▼
                </span>
              </span>
              
              {hoveredMenu === category.id && (
                <div style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  paddingTop: '1.5rem', 
                  width: '180px' 
                }}>
                  <div style={{ 
                    backgroundColor: '#0a0a0a', 
                    border: '1px solid #2a2a2a', 
                    borderRadius: '12px', 
                    padding: '0.5rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.25rem', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)' 
                  }}>
                    {category.items.map(item => (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        style={{ 
                          color: '#a0a0a0', 
                          textDecoration: 'none', 
                          padding: '0.6rem 0.75rem', 
                          borderRadius: '8px', 
                          fontSize: '0.85rem', 
                          fontWeight: 500, 
                          transition: 'all 150ms' 
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#1a1a1a'; 
                          e.currentTarget.style.color = '#fff'; 
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = 'transparent'; 
                          e.currentTarget.style.color = '#a0a0a0'; 
                        }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Section: Auth & Cart */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/cart"
            style={{ color: '#a0a0a0', fontSize: '1rem', fontWeight: 500, textDecoration: 'none', transition: 'color 150ms', position: 'relative' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d4af37')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
          >
            🛒
            {mounted && cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-12px',
                backgroundColor: '#d4af37',
                color: '#0a0a0a',
                fontSize: '10px',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </Link>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#2a2a2a' }}></div>

          {mounted && isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{user.phone}</span>
                <span style={{ color: '#a0a0a0', fontSize: '0.7rem' }}>{user.role === 'admin' ? 'Administrator' : 'Customer'}</span>
              </div>
              
              <Link
                href="/wallet"
                style={{ color: '#a0a0a0', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#d4af37')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
              >
                Wallet
              </Link>
              
              <Link
                href="/security"
                style={{ color: '#a0a0a0', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#d4af37')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
              >
                Security
              </Link>

              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  style={{ color: '#d4af37', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'color 150ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f0c040')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d4af37')}
                >
                  Admin
                </Link>
              )}

              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid rgba(255,59,48,0.4)',
                  backgroundColor: 'transparent',
                  color: '#FF3B30',
                  transition: 'all 150ms',
                  cursor: 'pointer',
                  marginLeft: '0.5rem'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              style={{
                padding: '8px 24px',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: '#d4af37',
                color: '#0a0a0a',
                textDecoration: 'none',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0c040'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#d4af37'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Icon */}
        <div className="md:hidden flex items-center gap-4">
          <Link href="/cart" className="relative text-[#a0a0a0]">
            🛒
            {mounted && cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-[#d4af37] p-2 focus:outline-none"
          >
            <div className="space-y-1.5">
              <span className={`block w-6 h-0.5 bg-current transition-transform ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-current transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-current transition-transform ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-t border-[#2a2a2a] px-4 py-6 flex flex-col gap-6 absolute w-full left-0">
          {navCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-3">
              <span className="text-[#d4af37] font-semibold text-sm tracking-wider uppercase">{cat.title}</span>
              <div className="flex flex-col gap-2 pl-4 border-l border-[#2a2a2a]">
                {cat.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="text-[#a0a0a0] hover:text-[#fff] transition-colors py-1">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          
          <div className="border-t border-[#2a2a2a] pt-6 flex flex-col gap-4">
            {mounted && isAuthenticated && user ? (
              <>
                <span className="text-[#fff] font-medium">{user.phone}</span>
                <Link href="/wallet" onClick={() => setIsMobileMenuOpen(false)} className="text-[#a0a0a0] hover:text-[#d4af37]">Wallet</Link>
                <Link href="/security" onClick={() => setIsMobileMenuOpen(false)} className="text-[#a0a0a0] hover:text-[#d4af37]">Security</Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-[#d4af37] font-semibold">Admin Panel</Link>
                )}
                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="text-left text-[#FF3B30] font-semibold pt-2">Logout</button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)} className="bg-[#d4af37] text-[#0a0a0a] text-center font-bold py-3 rounded-lg">
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
