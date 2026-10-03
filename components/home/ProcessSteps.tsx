import Link from 'next/link';
import { ArrowRight, ClipboardCheck, Truck, Wallet } from 'lucide-react';

const STEPS = [
  { Icon: ClipboardCheck, title: 'Get a quote', desc: 'Select your device and condition to receive an instant valuation.' },
  { Icon: Truck, title: 'Schedule pickup', desc: 'We come to your doorstep. Free pickup, zero hassle.' },
  { Icon: Wallet, title: 'Get paid', desc: 'Instant payment via UPI once your device is verified.' },
];

export default function ProcessSteps() {
  return (
    <section aria-labelledby="process-title" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="max-w-2xl">
          <h2 id="process-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Selling takes three steps
          </h2>
          <p className="mt-3 text-muted md:text-lg">No listings, no haggling with strangers, no trips to a shop.</p>
        </div>

        <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Connector line behind the step markers (desktop) */}
          <span aria-hidden="true" className="absolute left-6 right-[calc(33%-1.5rem)] top-6 hidden h-px bg-border md:block" />
          {STEPS.map(({ Icon, title, desc }, i) => (
            <li key={title} className="relative flex gap-5 md:flex-col md:gap-6">
              {/* Connector line between markers (mobile) */}
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute bottom-[-2.5rem] left-6 top-12 w-px bg-border md:hidden" />
              )}
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background text-gold shadow-token-sm">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Step {i + 1}</p>
                <h3 className="mt-1.5 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link href="/quote" className="btn-primary mt-12 h-12 !px-6 !text-[0.95rem] no-underline">
          Start with a free quote
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
