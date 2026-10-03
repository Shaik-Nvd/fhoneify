import Link from 'next/link';
import { ArrowRight, ShieldCheck, Star, Truck, Wallet } from 'lucide-react';
import HeroPhone from './HeroPhone';

const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?q=fhoneify#lrd=0x3bae17bb4da7d305:0x238a115b32aa0950,1,,,,';

const TRUST = [
  { Icon: Truck, label: 'Free doorstep pickup' },
  { Icon: Wallet, label: 'Paid by UPI at pickup' },
  { Icon: ShieldCheck, label: 'Factory-grade data wipe' },
];

export default function Hero() {
  return (
    <section data-hero className="relative overflow-hidden">
      {/* Soft brass light from the top right; static, no blur filter. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[20%] -top-[30%] h-[80%] w-[80%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--gold)_12%,transparent),transparent)]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pb-14 pt-8 sm:pt-12 md:px-6 md:pb-20 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:min-h-[min(760px,calc(100svh-4rem))] lg:pb-24">
        <div className="max-w-xl md:max-w-2xl lg:max-w-xl">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-muted no-underline transition-colors hover:border-gold hover:text-foreground"
          >
            <span className="flex items-center gap-0.5 text-[#e8a317]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </span>
            <span>
              <span className="font-semibold text-foreground">4.9</span> from 37 Google reviews
            </span>
          </a>

          <h1 className="font-display text-balance text-[2.6rem] font-medium leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[3.4rem] lg:text-[4.4rem]">
            Sell your old phone.{' '}
            <span className="italic text-gold">Get paid at your door.</span>
          </h1>

          <p className="mt-5 max-w-[34rem] text-[1.05rem] leading-relaxed text-muted sm:text-lg">
            Answer a few quick questions for an instant quote. We pick your phone up for free across Bengaluru and pay you before we leave.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link href="/quote" className="btn-cta no-underline sm:w-auto">
              Sell your phone
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            <Link
              href="/buy"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-[0.95rem] font-semibold text-foreground no-underline underline-offset-4 hover:text-gold hover:underline"
            >
              Or buy a verified refurbished phone
            </Link>
          </div>

          <ul className="mt-9 grid gap-x-6 gap-y-3 text-sm text-muted sm:flex sm:flex-wrap">
            {TRUST.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-gold" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative -mx-4 py-6 sm:mx-0 lg:py-0">
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}
