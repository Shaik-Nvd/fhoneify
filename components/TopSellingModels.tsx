'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/all';
import Image from 'next/image';

export interface TopModel {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  price: number;
  image: string;
}

const TOP_MODELS: TopModel[] = [
  { id: '1', brand: 'Apple', model: 'iPhone 14 Pro', ram: '6 GB', storage: '128 GB', price: 41150, image: 'https://m.media-amazon.com/images/I/61HHS0HrjpL._SX679_.jpg' },
  { id: '2', brand: 'Apple', model: 'iPhone 15', ram: '6 GB', storage: '128 GB', price: 38040, image: 'https://m.media-amazon.com/images/I/71d7rfSl0wL._SX679_.jpg' },
  { id: '3', brand: 'Apple', model: 'iPhone 13 Pro', ram: '6 GB', storage: '128 GB', price: 33100, image: 'https://m.media-amazon.com/images/I/61jLiCovxVL._SX679_.jpg' },
  { id: '4', brand: 'Apple', model: 'iPhone 14', ram: '6 GB', storage: '128 GB', price: 26730, image: 'https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg' },
  { id: '5', brand: 'Apple', model: 'iPhone 13', ram: '4 GB', storage: '128 GB', price: 23950, image: 'https://m.media-amazon.com/images/I/71xb2xkN5qL._SX679_.jpg' },
  { id: '6', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '128 GB', price: 17580, image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '7', brand: 'Apple', model: 'iPhone 12', ram: '4 GB', storage: '64 GB', price: 16850, image: 'https://m.media-amazon.com/images/I/711wsjBtWeL._SX679_.jpg' },
  { id: '8', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '128 GB', price: 14020, image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
  { id: '10', brand: 'Apple', model: 'iPhone 11', ram: '4 GB', storage: '64 GB', price: 13220, image: 'https://m.media-amazon.com/images/I/71tpxtLD0aL._SX679_.jpg' },
];

const calculateFhoneifyPrice = (basePrice: number) => {
  if (basePrice <= 20000) return Math.round(basePrice * 1.08);
  if (basePrice <= 50000) return Math.round(basePrice * 1.06);
  return Math.round(basePrice * 1.04);
};

// We include buildSeamlessLoop outside component or inside context.
function buildSeamlessLoop(items: any[], spacing: number, animateFunc: (el: HTMLElement) => gsap.core.Timeline) {
  let overlap = Math.ceil(1 / spacing),
      startTime = items.length * spacing + 0.5,
      loopTime = (items.length + overlap) * spacing + 1,
      rawSequence = gsap.timeline({paused: true}),
      seamlessLoop = gsap.timeline({
          paused: true,
          repeat: -1,
          onRepeat() {
              this._time === this._dur && (this._tTime += this._dur - 0.01);
          }
      }),
      l = items.length + overlap * 2,
      time = 0, i, index;

  for (i = 0; i < l; i++) {
      index = i % items.length;
      time = i * spacing;
      rawSequence.add(animateFunc(items[index]), time);
      i <= items.length && seamlessLoop.add("label" + i, time);
  }

  rawSequence.time(startTime);
  seamlessLoop.to(rawSequence, {
      time: loopTime,
      duration: loopTime - startTime,
      ease: "none"
  }).fromTo(rawSequence, {time: overlap * spacing + 1}, {
      time: startTime,
      duration: startTime - (overlap * spacing + 1),
      immediateRender: false,
      ease: "none"
  });
  return seamlessLoop;
}

export default function TopSellingModels() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLLIElement | null)[]>([]);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);

  const handleSellClick = (brand: string, model: string) => {
    const fullModel = model.startsWith(brand) ? model : `${brand} ${model}`;
    router.push(`/quote?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(fullModel)}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    gsap.registerPlugin(ScrollTrigger, Draggable);
    
    if (!containerRef.current) return;
    const cardsElements = cardsRef.current.filter(Boolean) as HTMLElement[];
    if (cardsElements.length === 0) return;

    let iteration = 0;

    const ctx = gsap.context(() => {
      gsap.set(cardsElements, { xPercent: 400, opacity: 0, scale: 0 });

      const spacing = 0.1;
      const snapTime = gsap.utils.snap(spacing);
      
      const animateFunc = (element: HTMLElement) => {
        const tl = gsap.timeline();
        tl.fromTo(element, {scale: 0, opacity: 0}, {scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: "power1.in", immediateRender: false})
          .fromTo(element, {xPercent: 400}, {xPercent: -400, duration: 1, ease: "none", immediateRender: false}, 0);
        return tl;
      };

      const seamlessLoop = buildSeamlessLoop(cardsElements, spacing, animateFunc);
      const playhead = {offset: 0};
      const wrapTime = gsap.utils.wrap(0, seamlessLoop.duration());

      const scrub = gsap.to(playhead, {
        offset: 0,
        onUpdate() {
          seamlessLoop.time(wrapTime(playhead.offset));
        },
        duration: 0.5,
        ease: "power3",
        paused: true
      });

      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "+=2000",
        pin: true,
        onUpdate(self) {
          scrub.vars.offset = self.progress * seamlessLoop.duration() * 3; // Loop 3 times over 2000px
          scrub.invalidate().restart();
        }
      });

      function scrollToOffset(offset: number) {
        let snappedTime = snapTime(offset),
          progress = (snappedTime) / (seamlessLoop.duration() * 3);
        
        // Only scroll if within bounds
        if (progress >= 0 && progress <= 1) {
          trigger.scroll(trigger.start + progress * (trigger.end - trigger.start));
        }
      }

      if (nextBtnRef.current && prevBtnRef.current) {
        nextBtnRef.current.addEventListener("click", () => scrollToOffset(scrub.vars.offset + spacing));
        prevBtnRef.current.addEventListener("click", () => scrollToOffset(scrub.vars.offset - spacing));
      }

      Draggable.create(".drag-proxy", {
        type: "x",
        trigger: ".cards-list",
        onPress() {
          (this as any).startOffset = scrub.vars.offset;
        },
        onDrag() {
          scrub.vars.offset = (this as any).startOffset + ((this as any).startX - (this as any).x) * 0.001;
          scrub.invalidate().restart();
        },
        onDragEnd() {
          scrollToOffset(scrub.vars.offset);
        }
      });

    }, containerRef);

    return () => {
      ScrollTrigger.removeEventListener("scrollEnd", () => {});
      ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full relative gallery-container h-[650px] md:h-[750px] bg-transparent flex flex-col items-center justify-start py-12 px-4 md:px-8">
      {/* Immersive Background Glows - optimized for mobile (less blur, no blend mode on small screens) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] bg-[var(--gold)]/10 md:bg-[var(--gold)]/5 blur-3xl md:blur-[100px] rounded-full md:mix-blend-screen will-change-transform" />
        <div className="absolute bottom-[-10%] right-[20%] w-[30vw] h-[30vw] bg-[#8a2be2]/15 md:bg-[#8a2be2]/10 blur-3xl md:blur-[100px] rounded-full md:mix-blend-screen will-change-transform" />
      </div>

      <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 text-center relative z-10 tracking-tight drop-shadow-md md:drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]">
        Top Selling Mobile Phones
      </h2>
      <p className="text-muted text-center max-w-2xl mx-auto mb-12 relative z-10">Discover the most sought-after devices at unbeatable resale values.</p>

      <div className="relative w-full flex-1 flex items-center justify-center">
        <ul className="cards-list relative w-[280px] h-[400px] md:w-[320px] md:h-[460px] m-0 p-0 perspective-1000 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
          {TOP_MODELS.map((item, i) => (
            <li 
              key={item.id} 
              ref={(el) => { cardsRef.current[i] = el; }}
              className="absolute top-0 left-0 w-full h-full list-none bg-surface border border-[var(--gold)]/20 rounded-3xl p-6 flex flex-col justify-between items-center shadow-xl md:shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-transform duration-300 md:hover:border-[var(--gold)]/50 will-change-transform"
              style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
            >
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-b from-white to-[#f0f0f0] rounded-2xl flex items-center justify-center p-3 overflow-hidden mb-4 shrink-0 shadow-inner ring-1 ring-black/5">
                <Image 
                  src={item.image} 
                  alt={item.model} 
                  fill 
                  className="object-contain p-2 md:drop-shadow-xl" 
                  sizes="(max-width: 768px) 96px, 128px"
                  priority={i < 4} // pre-load the first few cards for fast LCP
                />
              </div>
              <div className="text-center mb-2">
                <div className="text-foreground font-bold text-xl md:text-2xl mb-1 tracking-tight">{item.brand} {item.model}</div>
                <div className="text-muted text-sm">({item.storage})</div>
              </div>
              <div className="text-center mb-6">
                <div className="text-muted text-xs uppercase tracking-wider mb-1">Get Upto</div>
                <div className="text-[var(--gold)] font-black text-2xl md:text-3xl">₹{calculateFhoneifyPrice(item.price).toLocaleString('en-IN')}</div>
              </div>
              <button 
                onClick={() => handleSellClick(item.brand, item.model)}
                className="w-full bg-[var(--gold)] hover:bg-[#f0c040] text-white font-bold py-3 px-6 rounded-xl transition-colors text-base"
              >
                Sell Now
              </button>
            </li>
          ))}
        </ul>

        {/* Navigation Buttons */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
          <button ref={prevBtnRef} className="w-14 h-14 rounded-full bg-surface hover:from-[var(--gold)] hover:to-[#f0c040] hover:text-black border border-border hover:border-transparent text-foreground flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:-translate-y-1">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button ref={nextBtnRef} className="w-14 h-14 rounded-full bg-surface hover:from-[var(--gold)] hover:to-[#f0c040] hover:text-black border border-border hover:border-transparent text-foreground flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:-translate-y-1">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Drag Proxy for Mobile/Mouse dragging */}
        <div className="drag-proxy invisible absolute"></div>
      </div>
    </div>
  );
}
