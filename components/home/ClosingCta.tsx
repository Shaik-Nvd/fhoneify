import Link from 'next/link';
import { ArrowRight, Smartphone, Truck, Wallet } from 'lucide-react';

const ORBIT = [
  { Icon: Smartphone, angle: 20 },
  { Icon: Truck, angle: 140 },
  { Icon: Wallet, angle: 260 },
];

export default function ClosingCta({ showBuyLink = true }: { showBuyLink?: boolean }) {
  return (
    <section aria-labelledby="closing-title" className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
      <div data-reveal="scale" className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-14 text-center text-foreground shadow-token-lg sm:px-10 md:py-20">
        {/* Slow orbits with the three steps riding on them. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[150%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--gold)_18%,transparent),transparent)]" />
          <div className="absolute left-1/2 top-1/2 aspect-square w-[min(720px,140%)] -translate-x-1/2 -translate-y-1/2">
            <div className="orbit-spin absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--gold)_20%,transparent)]">
              {ORBIT.map(({ Icon, angle }) => (
                <span key={angle} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                  <span className="absolute left-1/2 top-0 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-background text-gold shadow-token-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                </span>
              ))}
            </div>
            <div className="orbit-spin-rev absolute inset-[18%] rounded-full border border-dashed border-[color-mix(in_srgb,var(--gold)_20%,transparent)]" />
          </div>
        </div>

        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-gold">Free · No obligation</p>
        <h2 id="closing-title" className="font-display relative mx-auto mt-4 max-w-2xl text-[2.2rem] font-medium leading-[1.05] tracking-[-0.025em] md:text-[3.5rem]">
          What&apos;s your phone <span className="hero-gold-text italic">worth today?</span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-muted">Find out in a few taps. If you like the price, we&apos;ll pick it up from your door and pay you on the spot.</p>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/quote" className="btn-cta cta-shine group w-full no-underline sm:w-auto">
            <span className="relative z-[1]">Get instant quote</span>
            <ArrowRight aria-hidden="true" className="relative z-[1] h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          {showBuyLink && (
            <Link
              href="/buy"
              className="inline-flex min-h-[56px] w-full items-center justify-center rounded-[14px] border border-border bg-background px-6 text-[0.95rem] font-semibold text-foreground no-underline transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              Browse refurbished phones
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
