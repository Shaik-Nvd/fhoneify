'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ShoppingBag, Tag, User } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Home', path: '/', Icon: House },
  { name: 'Sell', path: '/quote', Icon: Tag, primary: true },
  { name: 'Buy', path: '/buy', Icon: ShoppingBag },
  { name: 'Profile', path: '/profile', Icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed bottom-0 left-0 z-50 flex w-full items-stretch justify-around border-t border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-2 pt-1.5 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      {NAV_ITEMS.map(({ name, path, Icon, primary }) => {
        const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
        return (
          <Link
            key={name}
            href={path}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl no-underline transition-colors ${
              isActive ? 'text-gold' : 'text-muted hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-7 items-center justify-center rounded-full transition-colors ${
                primary ? 'w-12 bg-gold text-on-gold' : 'w-7'
              }`}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={isActive || primary ? 2.25 : 1.9} />
            </span>
            <span className={`text-[0.72rem] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
