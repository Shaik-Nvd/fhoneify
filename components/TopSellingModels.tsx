'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';

export interface TopModel {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  /** Catalog identity sent to POST /api/quote/get-upto. */
  catalogModel: string;
  catalogStorage: string;
  image: string;
}

const TOP_MODELS: TopModel[] = [
  { id: '1', brand: 'Apple', model: 'iPhone 14 Pro', ram: '6 GB', storage: '128 GB', catalogModel: 'Apple iPhone 14 Pro', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/61HHS0HrjpL._SX679_.jpg' },
  { id: '2', brand: 'Apple', model: 'iPhone 15', ram: '6 GB', storage: '128 GB', catalogModel: 'Apple iPhone 15', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/71d7rfSl0wL._SX679_.jpg' },
  { id: '3', brand: 'Apple', model: 'iPhone 13 Pro', ram: '6 GB', storage: '128 GB', catalogModel: 'Apple iPhone 13 Pro', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/61jLiCovxVL._SX679_.jpg' },
  { id: '4', brand: 'Apple', model: 'iPhone 14', ram: '6 GB', storage: '128 GB', catalogModel: 'Apple iPhone 14', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg' },
  { id: '5', brand: 'Apple', model: 'iPhone 13', ram: '4 GB', storage: '128 GB', catalogModel: 'Apple iPhone 13', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/71xb2xkN5qL._SX679_.jpg' },
  { id: '6', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '128 GB', catalogModel: 'Apple iPhone 12', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '7', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '64 GB', catalogModel: 'Apple iPhone 12', catalogStorage: '64GB', image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '8', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '128 GB', catalogModel: 'Apple iPhone 11', catalogStorage: '128GB', image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
  { id: '10', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '64 GB', catalogModel: 'Apple iPhone 11', catalogStorage: '64GB', image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
];

export default function TopSellingModels() {
  // Get Upto comes only from the server (ReferencePrice + uplift).
  const [getUpto, setGetUpto] = useState<Record<string, number>>({});
  const [pricesSettled, setPricesSettled] = useState(false);
  const scrollRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    const devices = TOP_MODELS.map((m) => ({ brand: m.brand, model: m.catalogModel, storage: m.catalogStorage }));
    api.post('/api/quote/get-upto', { devices })
      .then((res) => {
        if (cancelled || !res.data?.success || !Array.isArray(res.data.data)) return;
        const prices: Record<string, number> = {};
        res.data.data.forEach((row: any, i: number) => {
          if (typeof row?.startingPrice === 'number' && row.startingPrice > 0) prices[TOP_MODELS[i].id] = row.startingPrice;
        });
        setGetUpto(prices);
      })
      .catch(() => { /* cards stay without a price */ })
      .finally(() => { if (!cancelled) setPricesSettled(true); });
    return () => { cancelled = true; };
  }, []);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 16 : 280;
    el.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };

  const quoteHref = (brand: string, model: string) => {
    const fullModel = model.startsWith(brand) ? model : `${brand} ${model}`;
    return `/quote?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(fullModel)}`;
  };

  return (
    <section aria-labelledby="top-models-title" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 id="top-models-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Top selling mobile phones
          </h2>
          <p className="mt-2 max-w-xl text-muted">The most sought-after devices and the most we pay for them.</p>
        </div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button type="button" onClick={() => scrollByCards(-1)} aria-label="Scroll left" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-gold hover:text-gold">
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => scrollByCards(1)} aria-label="Scroll right" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-gold hover:text-gold">
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ul
        ref={scrollRef}
        className="hide-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 md:mx-0 md:px-0"
      >
        {TOP_MODELS.map((item, i) => {
          const price = getUpto[item.id];
          return (
            <li key={item.id} className="w-[min(72%,240px)] shrink-0 snap-start sm:w-[240px]">
              <Link
                href={quoteHref(item.brand, item.model)}
                className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-4 text-foreground no-underline shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-gold hover:text-foreground hover:shadow-md"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-white">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="240px"
                    priority={i < 2}
                  />
                </span>
                <span className="mt-4 block text-base font-semibold leading-snug">{item.brand} {item.model}</span>
                <span className="mt-0.5 block text-sm text-muted">{item.storage}</span>
                <span className="mt-4 flex items-end justify-between gap-2 border-t border-border pt-3">
                  <span className="flex flex-col">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">Get upto</span>
                    {price ? (
                      <span className="tabular text-xl font-bold text-gold">{`₹${price.toLocaleString('en-IN')}`}</span>
                    ) : pricesSettled ? (
                      <span className="text-sm font-semibold text-foreground">Check price</span>
                    ) : (
                      <span aria-label="Loading price" className="skeleton mt-1 block h-6 w-24" />
                    )}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-on-gold transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">Sell now</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
