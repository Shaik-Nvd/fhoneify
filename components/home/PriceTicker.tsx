'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { FEATURED_MODELS, formatInr, quoteHref, type FeaturedModel } from './featuredModels';
import { useFeaturedPrices } from './useFeaturedPrices';

function TickerCard({ model, price, settled, hidden }: { model: FeaturedModel; price?: number; settled: boolean; hidden?: boolean }) {
  return (
    <li className={`shrink-0 ${hidden ? 'ticker-copy' : ''}`} aria-hidden={hidden || undefined}>
      <Link
        href={quoteHref(model)}
        tabIndex={hidden ? -1 : undefined}
        className="group flex w-[236px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 pr-3.5 text-[#f5f2ea] no-underline transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[#d4af37]/60 hover:bg-white/[0.07] hover:text-[#f5f2ea]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image src={model.image} alt="" width={56} height={56} className="h-[86%] w-auto object-contain transition-transform duration-300 group-hover:scale-110" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[0.9rem] font-semibold">{model.name}</span>
          <span className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/45">Get upto</span>
          {price ? (
            <span className="tabular text-[1.02rem] font-bold text-[#d4af37]">{formatInr(price)}</span>
          ) : settled ? (
            <span className="text-[0.85rem] font-semibold text-white/80">Check price</span>
          ) : (
            <span className="lqs-shimmer mt-1 block h-4 w-20 rounded"><span className="sr-only">Loading price</span></span>
          )}
        </span>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-white/40 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#d4af37]" />
      </Link>
    </li>
  );
}

/**
 * An endless strip of popular models with their server "Get upto" prices.
 * The list is rendered twice for a seamless loop; the copy is hidden from
 * assistive tech and the keyboard. Reduced motion gets a plain scroller.
 */
export default function PriceTicker() {
  const { prices, settled } = useFeaturedPrices();

  return (
    <div className="ticker group/ticker relative">
      <div className="ticker-viewport hide-scrollbar overflow-hidden">
        {/* pr-3 equals the gap, so exactly half the track is one full set. */}
        <ul className="ticker-track flex w-max gap-3 py-1 pr-3">
          {FEATURED_MODELS.map((m) => (
            <TickerCard key={m.id} model={m} price={prices[m.id]} settled={settled} />
          ))}
          {FEATURED_MODELS.map((m) => (
            <TickerCard key={`${m.id}-copy`} model={m} price={prices[m.id]} settled={settled} hidden />
          ))}
        </ul>
      </div>
    </div>
  );
}
