'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, MapPin, MessageCircle } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Sell & buy',
    links: [
      { label: 'Sell your phone', href: '/quote' },
      { label: 'Buy refurbished phones', href: '/buy' },
      { label: 'Repair', href: '/repair' },
      { label: 'Find a store', href: '/stores' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Security', href: '/security' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  // Same exclusions as the Navbar, plus the admin console.
  if (pathname?.startsWith('/partner') || pathname?.startsWith('/itad') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr_1.2fr] md:px-6 md:py-16">
        <div>
          <Link href="/" className="text-[1.1rem] font-bold uppercase tracking-[0.22em] text-gold no-underline hover:text-gold-hover">
            Fhoneify
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Sell your old phone with free doorstep pickup and instant payment, or buy a verified refurbished one.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <MapPin aria-hidden="true" className="h-4 w-4 text-gold" />
            Currently serving Bengaluru
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{col.title}</h2>
            <ul className="mt-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-[40px] items-center text-sm text-foreground no-underline hover:text-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Talk to us</h2>
          <ul className="mt-3">
            <li>
              <a href="https://wa.me/919187448347" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-foreground no-underline hover:text-gold">
                <MessageCircle aria-hidden="true" className="h-4 w-4 text-gold" />
                +91 91874 48347
              </a>
            </li>
            <li>
              <a href="mailto:ffhoneify@gmail.com" className="inline-flex min-h-[40px] items-center gap-2 text-sm text-foreground no-underline hover:text-gold">
                <Mail aria-hidden="true" className="h-4 w-4 text-gold" />
                ffhoneify@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted md:px-6">© {new Date().getFullYear()} Fhoneify. All rights reserved.</p>
      </div>
    </footer>
  );
}
