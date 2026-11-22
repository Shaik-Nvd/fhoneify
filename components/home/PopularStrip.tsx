'use client';

import Image from 'next/image';
import { FEATURED_MODELS, formatInr, modelImage, type FeaturedModel } from './featuredModels';

function Card({ model, price, settled, onPick, copy }: { model: FeaturedModel; price?: number; settled: boolean; onPick: (m: FeaturedModel) => void; copy?: boolean }) {
  return (
    <li className={`shrink-0 ${copy ? 'ticker-copy' : ''}`} aria-hidden={copy || undefined}>
      <button
        type="button"
        tabIndex={copy ? -1 : undefined}
        onClick={() => onPick(model)}
        className="group flex w-[220px] items-center gap-3 rounded-2xl border border-border bg-background p-2.5 pr-3 text-left shadow-token-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-gold hover:shadow-token-md"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          <Image src={modelImage(model.catalogModel)} alt="" width={52} height={52} className="h-[88%] w-auto object-contain transition-transform duration-300 group-hover:scale-110" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.92rem] font-semibold text-foreground">{model.name}</span>
          <span className="mt-0.5 text-[0.72rem] text-muted">{model.storageLabel}</span>
          {price ? (
            <span className="tabular mt-0.5 text-[0.98rem] font-bold text-gold">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">Upto </span>
              {formatInr(price)}
            </span>
          ) : settled ? (
            <span className="mt-0.5 text-[0.85rem] font-semibold text-foreground">Check price</span>
          ) : (
            <span className="pc-shimmer mt-1 block h-4 w-20 rounded">
              <span className="sr-only">Loading price</span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

/**
 * Slow endless strip of popular models with their live Get upto prices.
 * Tapping one loads it into the hero price card. Rendered twice for a
 * seamless loop (the copy is hidden from assistive tech and the keyboard);
 * reduced motion gets a plain swipeable row.
 */
export default function PopularStrip({ onPick, prices, settled }: { onPick: (m: FeaturedModel) => void; prices: Record<string, number>; settled: boolean }) {
  return (
    <div className="ticker relative">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Popular right now · tap to check</p>
      <div className="ticker-viewport hide-scrollbar -mx-4 overflow-hidden md:mx-0">
        {/* pr-3 equals the gap, so exactly half the track is one full set. */}
        <ul className="ticker-track flex w-max gap-3 py-2 pr-3">
          {FEATURED_MODELS.map((m) => (
            <Card key={m.id} model={m} price={prices[m.id]} settled={settled} onPick={onPick} />
          ))}
          {FEATURED_MODELS.map((m) => (
            <Card key={`${m.id}-copy`} model={m} price={prices[m.id]} settled={settled} onPick={onPick} copy />
          ))}
        </ul>
      </div>
    </div>
  );
}
