import { MousePointerClick, ReceiptText, ShieldCheck, Tag, Truck, Wallet } from 'lucide-react';

const FEATURES = [
  { Icon: Tag, title: 'Best prices', desc: 'Objective AI-based pricing' },
  { Icon: Wallet, title: 'Instant payment', desc: 'Instant money transfer in your preferred mode at time of pick up or store drop off' },
  { Icon: MousePointerClick, title: 'Simple & convenient', desc: 'Check price, schedule pickup & get paid' },
  { Icon: Truck, title: 'Free doorstep pickup', desc: 'No fees for pickup. Currently operating exclusively in Bengaluru' },
  { Icon: ShieldCheck, title: 'Factory-grade data wipe', desc: '100% safe and data security guaranteed' },
  { Icon: ReceiptText, title: 'Valid purchase invoice', desc: 'Genuine bill of sale' },
];

export default function WhyFhoneify() {
  return (
    <section aria-labelledby="why-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="why-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Why sell with Fhoneify
          </h2>
          <p className="mt-3 max-w-md text-muted md:text-lg">
            A fair price, a pickup at your door and your data wiped before the phone goes anywhere.
          </p>
        </div>

        <ul className="grid gap-x-10 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, desc }) => (
            <li key={title} className="flex gap-4 border-t border-border py-6">
              <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-gold" strokeWidth={1.75} />
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
