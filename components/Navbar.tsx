'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { useCartStore } from '@/lib/cartStore';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, ShoppingBag, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

type NavLink = { label: string; href: string };
type NavCategory = { id: string; title: string; href?: string; items?: NavLink[] };

const NAV_CATEGORIES: NavCategory[] = [
  { id: 'quote', title: 'Sell Phone', href: '/quote' },
  { id: 'buy', title: 'Buy Phones', href: '/buy' },
  {
    id: 'services',
    title: 'Services',
    items: [
      { label: 'Repair', href: '/repair' },
      { label: 'Find a Store', href: '/stores' },
    ],
  },
  { id: 'blog', title: 'Blog', href: '/blog' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.items.length);
  const [mounted, setMounted] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mobile menu only exists below 1024px; close it if the viewport grows
  // past that so the scroll lock and focus trap can't outlive it.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (desktop.matches) setIsMobileMenuOpen(false); };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  // Close menus whenever the route changes.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  // Escape closes any open menu; the mobile sheet returns focus to its trigger.
  useEffect(() => {
    if (!isMobileMenuOpen && !openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen, openMenu]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    // Keep Tab inside the open menu (its toggle button plus the sheet).
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !sheetRef.current || !menuButtonRef.current) return;
      const items = [menuButtonRef.current, ...sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !items.includes(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);

    // Lock the page behind the menu; the scroll position is kept and restored.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onTab);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  // Hide the D2C Navbar on Partner and ITAD pages
  if (pathname?.startsWith('/partner') || pathname?.startsWith('/itad')) {
    return null;
  }

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href));
  const showAuth = mounted && isAuthenticated && user;

  return (
    <header
      className={`bar-solid sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-200 ${
        scrolled || isMobileMenuOpen
          ? 'border-border bg-[color-mix(in_srgb,var(--background)_86%,transparent)] shadow-token-sm backdrop-blur-md'
          : 'border-transparent bg-background'
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="text-[1.15rem] font-bold uppercase tracking-[0.22em] text-gold no-underline hover:text-gold-hover"
          aria-label="Fhoneify home"
        >
          Fhoneify
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_CATEGORIES.map((category) => (
            <li
              key={category.id}
              className="relative"
              onMouseEnter={() => category.items && setOpenMenu(category.id)}
              onMouseLeave={() => category.items && setOpenMenu(null)}
              onBlur={(e) => {
                if (category.items && !e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenu(null);
              }}
            >
              {category.href ? (
                <Link
                  href={category.href}
                  aria-current={isActive(category.href) ? 'page' : undefined}
                  className={`inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium no-underline transition-colors hover:bg-surface hover:text-foreground ${
                    isActive(category.href) ? 'text-foreground' : 'text-muted'
                  }`}
                >
                  {category.title}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    aria-expanded={openMenu === category.id}
                    aria-controls={`menu-${category.id}`}
                    onClick={() => setOpenMenu(openMenu === category.id ? null : category.id)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    {category.title}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${openMenu === category.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openMenu === category.id && category.items && (
                    <div id={`menu-${category.id}`} className="absolute left-1/2 top-full w-48 -translate-x-1/2 pt-2">
                      <ul className="rounded-xl border border-border bg-background p-1.5 shadow-token-lg">
                        {category.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted no-underline transition-colors hover:bg-surface hover:text-foreground"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <CartLink count={mounted ? cartCount : 0} />
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
          {showAuth ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end leading-tight">
                <span className="max-w-[10rem] truncate text-[0.8rem] font-semibold text-foreground">{user.name || user.phone}</span>
                <span className="text-[0.7rem] text-muted">{user.role === 'admin' ? 'Administrator' : 'Customer'}</span>
              </div>
              {user.role === 'admin' && (
                <a href="/admin" className="text-sm font-semibold text-gold no-underline hover:text-gold-hover">
                  Admin
                </a>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted no-underline transition-colors hover:bg-surface hover:text-foreground"
            >
              Login
            </Link>
          )}
          <Link href="/quote" className="btn-primary ml-1 whitespace-nowrap no-underline">
            Sell your phone
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <CartLink count={mounted ? cartCount : 0} />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-surface"
          >
            {isMobileMenuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          onClick={closeMobileMenu}
          className="absolute inset-x-0 top-full h-[100dvh] bg-black/50 lg:hidden"
        />
      )}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          ref={sheetRef}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-4 pb-6 pt-2 shadow-token-lg lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_CATEGORIES.map((cat) =>
              cat.href ? (
                <li key={cat.id} className="border-b border-border">
                  <Link
                    href={cat.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(cat.href) ? 'page' : undefined}
                    className="flex h-14 items-center justify-between text-base font-medium text-foreground no-underline"
                  >
                    {cat.title}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ) : (
                <li key={cat.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                    aria-expanded={openMenu === cat.id}
                    className="flex h-14 w-full items-center justify-between text-left text-base font-medium text-foreground"
                  >
                    {cat.title}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 text-muted transition-transform duration-200 ${openMenu === cat.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openMenu === cat.id && cat.items && (
                    <ul className="pb-2 pl-3">
                      {cat.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => { setIsMobileMenuOpen(false); setOpenMenu(null); }}
                            className="flex h-11 items-center text-[0.95rem] text-muted no-underline hover:text-foreground"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            )}
          </ul>

          <div className="mt-5 flex flex-col gap-3">
            {showAuth ? (
              <>
                <span className="font-medium text-foreground">{user.name || user.phone}</span>
                {user.role === 'admin' && (
                  <a href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="font-semibold text-gold no-underline">
                    Admin Panel
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="h-11 text-left font-semibold text-danger"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)} className="btn-outline h-12 !text-base no-underline">
                Login / Register
              </Link>
            )}
            <Link href="/quote" onClick={() => setIsMobileMenuOpen(false)} className="btn-cta no-underline">
              Sell your phone
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted no-underline transition-colors hover:bg-surface hover:text-foreground"
    >
      <ShoppingBag aria-hidden="true" className="h-5 w-5" />
      {count > 0 && (
        <span className="tabular absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-on-gold">
          {count}
        </span>
      )}
    </Link>
  );
}
