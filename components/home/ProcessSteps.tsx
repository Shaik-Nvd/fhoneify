import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, ClipboardCheck, Truck, Wallet } from 'lucide-react';

const STEPS = [
  {
    Icon: ClipboardCheck,
    title: 'Get an instant quote',
    desc: 'Pick your phone and answer a few quick questions about its condition. Your price appears straight away.',
    Visual: QuoteVisual,
  },
  {
    Icon: Truck,
    title: 'Book a free pickup',
    desc: 'Choose a time that suits you. We come to your doorstep anywhere in Bengaluru, at no cost.',
    Visual: PickupVisual,
  },
  {
    Icon: Wallet,
    title: 'Get paid on the spot',
    desc: 'We verify the phone at your door and pay you instantly via UPI before we leave.',
    Visual: PaidVisual,
  },
];

export default function ProcessSteps() {
  return (
    <section id="how-it-works" aria-labelledby="process-title" className="scroll-mt-20 border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div data-reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">How it works</p>
          <h2 id="process-title" className="font-display mt-3 text-[2rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.75rem]">
            Three steps. <span className="italic text-gold">Zero hassle.</span>
          </h2>
          <p className="mt-3 text-muted md:text-lg">No listings, no haggling with strangers, no trips to a shop.</p>
        </div>

        <ol data-reveal className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6" style={{ '--d': '80ms' } as React.CSSProperties}>
          {/* Gold thread that draws through the step markers as the list scrolls in. */}
          <span aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-[1.3rem] hidden h-px bg-border md:block">
            <span className="draw-x absolute inset-0 bg-gradient-to-r from-gold via-[#e9cf7a] to-gold" />
          </span>
          {STEPS.map(({ Icon, title, desc, Visual }, i) => (
            <li
              key={title}
              data-reveal="scale"
              style={{ '--d': `${200 + i * 160}ms` } as React.CSSProperties}
              className="relative grid grid-cols-[2.6rem_1fr] gap-4 md:flex md:flex-col md:items-center md:gap-5"
            >
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute -bottom-8 left-[1.3rem] top-[2.6rem] w-px bg-border md:hidden">
                  <span className="draw-y absolute inset-0 bg-gradient-to-b from-gold to-[#e9cf7a]" />
                </span>
              )}
              <span className="relative z-10 flex h-[2.6rem] w-[2.6rem] items-center justify-center rounded-full bg-gold text-sm font-bold text-on-gold shadow-gold ring-[6px] ring-surface">
                {i + 1}
              </span>
              <div className="group w-full rounded-3xl border border-border bg-background p-4 shadow-token-sm transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--gold)_50%,transparent)] hover:shadow-token-lg md:p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground md:text-xl">
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-gold" />
                  {title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{desc}</p>
                <div aria-hidden="true" className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface p-4">
                  <Visual />
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div data-reveal className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link href="/quote" className="btn-cta group no-underline">
            Get instant quote
            <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <p className="text-sm text-muted">Free and no obligation to sell.</p>
        </div>
      </div>
    </section>
  );
}

/* Small illustrations of each step, built from markup (no images). */

function QuoteVisual() {
  const rows = ['Screen has no cracks', 'Body has minor scratches', 'All functions work'];
  return (
    <div className="flex flex-col gap-2 text-left">
      {rows.map((row, i) => (
        <div key={row} className="flex items-center gap-2.5 rounded-xl bg-background px-3 py-2 text-[0.8rem] font-medium text-foreground shadow-token-sm transition-transform duration-500 group-hover:translate-x-1" style={{ transitionDelay: `${i * 60}ms` }}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-on-gold">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {row}
        </div>
      ))}
    </div>
  );
}

function PickupVisual() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu'];
  return (
    <div className="text-left">
      <div className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted">
        <CalendarDays className="h-4 w-4 text-gold" />
        Choose a slot
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {days.map((d, i) => (
          <span
            key={d}
            className={`flex h-12 flex-col items-center justify-center rounded-xl text-[0.78rem] font-semibold transition-colors duration-300 ${
              i === 1 ? 'bg-gold text-on-gold shadow-gold' : 'bg-background text-foreground shadow-token-sm'
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-background px-3 py-2 text-[0.8rem] font-medium text-foreground shadow-token-sm">
        <Truck className="h-4 w-4 text-gold transition-transform duration-700 group-hover:translate-x-24" />
        Doorstep pickup · Free
      </div>
    </div>
  );
}

function PaidVisual() {
  return (
    <div className="flex items-center gap-4 text-left">
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] transition-transform duration-700 group-hover:scale-125" />
        <span className="absolute inset-2 rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,transparent)]" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-on-gold shadow-gold">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
      </span>
      <span className="flex flex-col">
        <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted">UPI payment</span>
        <span className="mt-0.5 text-base font-semibold text-foreground">Sent to your account</span>
        <span className="text-[0.8rem] text-muted">Before we leave your door</span>
      </span>
    </div>
  );
}
