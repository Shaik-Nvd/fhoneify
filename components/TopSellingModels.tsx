'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  // Get Upto comes only from the server (ReferencePrice + uplift).
  const [getUpto, setGetUpto] = useState<Record<string, number>>({});

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
      .catch(() => { /* cards stay without a price */ });
    return () => { cancelled = true; };
  }, []);

  const handleSellClick = (brand: string, model: string) => {
    const fullModel = model.startsWith(brand) ? model : `${brand} ${model}`;
    router.push(`/quote?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(fullModel)}`);
  };

  return (
    <div className="w-full relative py-16 px-4 md:px-8 bg-transparent">
      {/* Immersive Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] bg-[var(--gold)]/10 md:bg-[var(--gold)]/5 blur-3xl md:blur-[100px] rounded-full md:mix-blend-screen will-change-transform" />
        <div className="absolute bottom-[-10%] right-[20%] w-[30vw] h-[30vw] bg-[#8a2be2]/15 md:bg-[#8a2be2]/10 blur-3xl md:blur-[100px] rounded-full md:mix-blend-screen will-change-transform" />
      </div>

      <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 text-center relative z-10 tracking-tight drop-shadow-md">
        Top Selling Mobile Phones
      </h2>
      <p className="text-muted text-center max-w-2xl mx-auto mb-12 relative z-10">Discover the most sought-after devices at unbeatable resale values.</p>

      {/* Simple, smooth horizontal scroll container */}
      <div 
        className="w-full max-w-7xl mx-auto flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory px-4 relative z-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TOP_MODELS.map((item, i) => (
          <div 
            key={item.id} 
            className="snap-center shrink-0 w-[280px] bg-surface border border-[var(--gold)]/20 rounded-3xl p-6 flex flex-col justify-between items-center shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-[var(--gold)]/50 hover:shadow-[0_20px_50px_rgba(212,175,55,0.15)]"
          >
            <div className="relative w-32 h-32 bg-gradient-to-b from-white to-[#f0f0f0] rounded-2xl flex items-center justify-center p-3 mb-6 shrink-0 shadow-inner ring-1 ring-black/5">
              <Image 
                src={item.image} 
                alt={item.model} 
                fill 
                className="object-contain p-2 drop-shadow-xl" 
                sizes="128px"
                priority={i < 4}
              />
            </div>
            
            <div className="text-center mb-2">
              <div className="text-foreground font-bold text-2xl mb-1 tracking-tight">{item.brand} {item.model}</div>
              <div className="text-muted text-sm">({item.storage})</div>
            </div>
            
            <div className="text-center mb-8">
              <div className="text-muted text-xs uppercase tracking-wider mb-1">Get Upto</div>
              <div className="text-[var(--gold)] font-black text-3xl">
                {getUpto[item.id] ? `₹${getUpto[item.id].toLocaleString('en-IN')}` : '…'}
              </div>
            </div>
            
            <button 
              onClick={() => handleSellClick(item.brand, item.model)}
              className="w-full bg-[var(--gold)] hover:bg-[#f0c040] text-black font-bold py-3 px-6 rounded-xl transition-colors text-base"
            >
              Sell Now
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
