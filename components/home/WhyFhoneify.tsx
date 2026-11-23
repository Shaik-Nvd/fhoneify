import { MousePointerClick, Timer, Truck, Wallet } from 'lucide-react';

// Only claims documented for Fhoneify (see Fhoneify_User_Manual.md, "Sell").
const FEATURES = [
  { Icon: Timer, title: 'Instant quote', desc: 'Answer a few questions about your phone and see its value straight away.' },
  { Icon: Truck, title: 'Free doorstep pickup', desc: 'No fees for pickup. Currently operating exclusively in Bengaluru.' },
  { Icon: Wallet, title: 'Instant payment', desc: 'Paid instantly via UPI once your phone is verified at your doorstep.' },
  { Icon: MousePointerClick, title: 'Simple & convenient', desc: 'Check price, schedule pickup & get paid.' },
];

export default function WhyFhoneify() {
  return (
    <section aria-labelledby="why-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="why-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Why sell with Fhoneify
          </h2>
          <p className="mt-3 max-w-md text-muted md:text-lg">
            An instant quote, a free pickup at your door and payment before your phone leaves your hands.
          </p>
        </div>

        <ul className="grid gap-x-10 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <li key={title} data-reveal style={{ '--d': `${i * 90}ms` } as React.CSSProperties} className="group flex gap-4 border-t border-border py-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
