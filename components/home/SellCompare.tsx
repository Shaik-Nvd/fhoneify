import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import CountUp from './CountUp';

// Every Fhoneify line is a documented service claim (see WhyFhoneify).
const DIY = [
  'Post an ad and wait for buyers to reply',
  'Haggle over the price with strangers',
  'Arrange meet-ups and travel to them',
  'Hope the payment actually comes through',
];
const FHONEIFY = [
  'See your price online in a few taps',
  'No listings, no haggling',
  'Free pickup from your doorstep',
  'Paid instantly via UPI once verified',
];

// Catalog facts: models and brands in the device catalog the quote flow uses.
const STATS = [
  { value: 1300, suffix: '+', label: 'phone models we buy' },
  { value: 20, suffix: '', label: 'brands, Apple to Xiaomi' },
  { value: 0, prefix: '₹', suffix: '', label: 'pickup fee, always' },
];

export default function SellCompare() {
  return (
    <section aria-labelledby="compare-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div data-reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Why sell with us</p>
        <h2 id="compare-title" className="font-display mt-3 text-[2rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.75rem]">
          Skip the listings. <span className="italic text-gold">Keep the cash.</span>
        </h2>
        <p className="mt-3 text-muted md:text-lg">Selling a phone yourself takes days. With Fhoneify it takes one visit.</p>
      </div>

      <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2 md:gap-6">
        <div data-reveal style={{ '--d': '100ms' } as React.CSSProperties} className="rounded-3xl border border-border bg-surface p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Selling it yourself</p>
          <ul className="mt-6 flex flex-col gap-4">
            {DIY.map((item) => (
              <li key={item} className="flex items-start gap-3 text-muted">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="line-through decoration-[color-mix(in_srgb,var(--muted)_50%,transparent)] decoration-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          data-reveal="scale"
          style={{ '--d': '220ms' } as React.CSSProperties}
          className="glow-edge relative overflow-hidden rounded-3xl bg-[#0f0e0c] p-6 text-[#f5f2ea] shadow-token-lg md:p-8"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.28),transparent)]" />
          <p className="relative text-sm font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Selling with Fhoneify</p>
          <ul className="relative mt-6 flex flex-col gap-4">
            {FHONEIFY.map((item) => (
              <li key={item} className="flex items-start gap-3 font-medium">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-[#15110a]">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/quote" className="cta-gold group relative mt-8 w-full no-underline sm:w-auto">
            <span className="relative z-[1]">Get instant quote</span>
            <ArrowRight aria-hidden="true" className="relative z-[1] h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <dl data-reveal className="mt-10 grid grid-cols-3 divide-x divide-border rounded-3xl border border-border bg-background">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col-reverse items-center gap-1 px-2 py-6 text-center md:py-8">
            <dt className="text-[0.78rem] leading-snug text-muted md:text-sm">{s.label}</dt>
            <dd className="font-display text-[1.9rem] font-medium leading-none tracking-[-0.02em] text-foreground md:text-[3rem]">
              <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
