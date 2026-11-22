import Link from 'next/link';
import { ArrowRight, MapPin, Star, Truck, Wallet } from 'lucide-react';
import HeroPhone from './HeroPhone';
import PriceTicker from './PriceTicker';

const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?q=fhoneify#lrd=0x3bae17bb4da7d305:0x238a115b32aa0950,1,,,,';

// The rotating word in the headline; the accessible name stays "phone".
const ROTATING_WORDS = ['iPhone', 'Galaxy', 'OnePlus', 'Pixel', 'phone'];

const TRUST = [
  { Icon: Truck, label: 'Free doorstep pickup' },
  { Icon: Wallet, label: 'Paid instantly via UPI' },
  { Icon: MapPin, label: 'Across Bengaluru' },
];

// Fixed dark "stage" in both themes so the gold reads the same everywhere.
// Server-rendered: headline, copy and the quote action are in the first HTML;
// only the phone tilt, its price screen and the ticker hydrate.
export default function Hero() {
  return (
    <section data-hero aria-labelledby="hero-title" className="px-2 pt-2 sm:px-4 sm:pt-4">
      <div className="hero-stage relative mx-auto max-w-[1440px] overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0b0a08] text-[#f5f2ea] md:rounded-[36px]">
        {/* Backdrop: drifting brass light, a fading grid, a slow light sweep and rising sparks. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="hero-aurora hero-aurora-a" />
          <div className="hero-aurora hero-aurora-b" />
          <div className="hero-grid absolute inset-0" />
          <div className="hero-sweep" />
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="hero-spark" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-5 pb-6 pt-10 sm:px-8 sm:pt-14 md:pb-10 lg:min-h-[min(720px,calc(100svh-7rem))] lg:grid-cols-[1.08fr_1fr] lg:gap-6 lg:px-10 lg:pt-12">
          <div className="max-w-xl md:max-w-2xl lg:max-w-xl">
            <div className="hero-in flex flex-wrap items-center gap-2" style={{ '--d': '0ms' } as React.CSSProperties}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-[0.78rem] font-semibold text-[#e9cf7a]">
                <span className="relative flex h-2 w-2">
                  <span className="hero-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#d4af37]" />
                </span>
                Now buying phones in Bengaluru
              </span>
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[0.78rem] font-medium text-white/70 no-underline transition-colors hover:border-white/30 hover:text-white"
              >
                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current text-[#e8a317]" />
                Reviews on Google
              </a>
            </div>

            <h1 id="hero-title" className="font-display mt-6 text-[2.75rem] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[3.6rem] lg:text-[4.5rem]">
              <span className="sr-only">Sell your old phone. Get paid at your door.</span>
              <span aria-hidden="true" className="block">Sell your old</span>
              <span aria-hidden="true" className="hero-rotator block">
                {ROTATING_WORDS.map((word, i) => (
                  <span key={word} className="hero-rotator-word" style={{ '--n': i } as React.CSSProperties}>
                    {word}
                  </span>
                ))}
              </span>
              <span aria-hidden="true" className="hero-gold-text block italic">Get paid at your door.</span>
            </h1>

            <p className="hero-in mt-5 max-w-[32rem] text-[1.04rem] leading-relaxed text-[#bdb7a8] sm:text-lg" style={{ '--d': '120ms' } as React.CSSProperties}>
              See your phone&apos;s price in a few taps. We pick it up free from your doorstep and pay you via UPI the moment it&apos;s verified.
            </p>

            <div className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ '--d': '220ms' } as React.CSSProperties}>
              <Link href="/quote" className="cta-gold group no-underline">
                <span className="relative z-[1]">Get instant quote</span>
                <ArrowRight aria-hidden="true" className="relative z-[1] h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] border border-white/15 px-6 text-[0.95rem] font-semibold text-[#f5f2ea] no-underline transition-colors hover:border-white/40 hover:text-white"
              >
                How it works
              </a>
            </div>

            <ul className="hero-in mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70" style={{ '--d': '320ms' } as React.CSSProperties}>
              {TRUST.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#d4af37]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-in relative -mx-5 py-8 sm:mx-0 lg:py-0" style={{ '--d': '160ms' } as React.CSSProperties}>
            <HeroPhone />
          </div>
        </div>

        <div className="relative border-t border-white/[0.07] pb-5 pt-4 md:pb-6">
          <div className="mx-auto mb-3 flex max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-white/50">Popular right now<span className="hidden sm:inline"> · tap to price yours</span></p>
            <Link href="/quote" className="hidden text-[0.85rem] font-semibold text-[#d4af37] no-underline hover:text-[#e9cf7a] sm:inline">
              All 1,300+ models →
            </Link>
          </div>
          <PriceTicker />
        </div>
      </div>
    </section>
  );
}
