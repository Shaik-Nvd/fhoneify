import { MapPin, Truck, Wallet } from 'lucide-react';
import HeroPriceCheck from './HeroPriceCheck';

// Product-first hero: the headline asks the question, the search answers it
// with the server's live price. The headline and copy are server-rendered;
// the search, price card and popular strip hydrate on top.
export default function Hero() {
  const intro = (
    <>
      <p className="hero-in text-sm font-semibold text-gold" style={{ '--d': '0ms' } as React.CSSProperties}>
        Sell your old phone in Bengaluru
      </p>
      <h1 id="hero-title" className="font-display mt-3 text-balance text-[2.6rem] font-medium leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[3.4rem] lg:text-[4.1rem]">
        What&apos;s your phone <span className="italic text-gold">worth today?</span>
      </h1>
      <p className="hero-in mt-4 max-w-[34rem] text-[1.02rem] leading-relaxed text-muted sm:text-lg" style={{ '--d': '80ms' } as React.CSSProperties}>
        Search your model and see today&apos;s price instantly. No sign-up needed.
      </p>
    </>
  );

  // The service facts, said once.
  const footnote = (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
      <li className="flex items-center gap-1.5">
        <Truck aria-hidden="true" className="h-4 w-4 text-gold" />
        Free doorstep pickup
      </li>
      <li className="flex items-center gap-1.5">
        <Wallet aria-hidden="true" className="h-4 w-4 text-gold" />
        Paid via UPI at pickup
      </li>
      <li className="flex items-center gap-1.5">
        <MapPin aria-hidden="true" className="h-4 w-4 text-gold" />
        Across Bengaluru
      </li>
    </ul>
  );

  return (
    <section data-hero aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-border">
      {/* Quiet brass light and a hairline grid that fades out; no dark panel. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-glow absolute -right-[15%] -top-[25%] aspect-square w-[min(1100px,130vw)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--gold)_16%,transparent),transparent)]" />
        <div className="hero-hairlines absolute inset-0" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:pt-12 md:px-6 lg:pb-14 lg:pt-16">
        <HeroPriceCheck intro={intro} footnote={footnote} />
      </div>
    </section>
  );
}
