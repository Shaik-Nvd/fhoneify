import { MessageCircle, ShieldCheck } from 'lucide-react';

export default function WarrantyClaim() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-token-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-gold">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-semibold text-foreground">How to claim warranty?</h2>
      </div>

      <ol className="mt-6 flex flex-col gap-5">
        <li className="flex gap-4">
          <StepNumber n={1} />
          <p className="leading-relaxed text-muted">
            Drop a &quot;Hi&quot; on WhatsApp on{' '}
            <a href="https://wa.me/919187448347" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold underline-offset-4 hover:underline">
              +91 91874 48347
            </a>{' '}
            or email at{' '}
            <a href="mailto:ffhoneify@gmail.com" className="font-semibold text-gold underline-offset-4 hover:underline">
              ffhoneify@gmail.com
            </a>{' '}
            to register your complaint.
          </p>
        </li>
        <li className="flex gap-4">
          <StepNumber n={2} />
          <div>
            <p className="leading-relaxed text-muted">
              At your convenience, our customer support team will arrange a <span className="font-medium text-foreground">doorstep visit</span> or a{' '}
              <span className="font-medium text-foreground">store visit</span> for you.
            </p>
            <p className="mt-1.5 text-sm text-muted">(Keep your IMEI No. &amp; registered Mobile No. handy. It&apos;s needed for replacement claims.)</p>
          </div>
        </li>
        <li className="flex gap-4">
          <StepNumber n={3} />
          <p className="leading-relaxed text-muted">That&apos;s it! Our experts will help resolve your issue and you can continue enjoying your latest phone.</p>
        </li>
      </ol>

      <a
        href="https://wa.me/919187448347"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline mt-7 w-full no-underline sm:w-auto"
      >
        <MessageCircle aria-hidden="true" className="h-4 w-4" />
        Message us on WhatsApp
      </a>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground">
      {n}
    </span>
  );
}
