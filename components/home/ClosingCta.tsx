import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0f0e0c] px-6 py-12 text-center text-[#f5f2ea] shadow-token-lg sm:px-10 md:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[140%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.22),transparent)]"
        />
        <p className="relative font-display text-[2rem] font-medium leading-tight tracking-[-0.02em] md:text-[3rem]" id="closing-title">
          Sell smart. <span className="italic text-[#d4af37]">Buy smarter.</span>
        </p>
        <p className="relative mx-auto mt-3 max-w-md text-[#bdb7a8]">Find out what your phone is worth in a few taps. It&apos;s free and there&apos;s no obligation to sell.</p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/quote"
            className="btn-cta w-full !bg-[#d4af37] !text-[#15110a] no-underline hover:!bg-[#e6c35a] sm:w-auto"
          >
            Sell your phone
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
          <Link
            href="/buy"
            className="btn w-full border border-white/20 text-[0.95rem] text-[#f5f2ea] no-underline hover:border-white/40 hover:text-white sm:w-auto"
            style={{ minHeight: 56, padding: '0 1.5rem', borderRadius: 14 }}
          >
            Browse refurbished phones
          </Link>
        </div>
      </div>
    </section>
  );
}
