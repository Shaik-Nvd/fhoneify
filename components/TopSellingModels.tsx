'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/all';

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
        start: 0,
        onUpdate(self) {
          let scroll = self.scroll();
          if (scroll > self.end - 1) {
            wrap(1, 2);
          } else if (scroll < 1 && self.direction < 0) {
            wrap(-1, self.end - 2);
          } else {
            scrub.vars.offset = (iteration + self.progress) * seamlessLoop.duration();
            scrub.invalidate().restart();
          }
        },
        end: "+=3000",
        pin: ".gallery-container",
      });

      const progressToScroll = (progress: number) => gsap.utils.clamp(1, trigger.end - 1, gsap.utils.wrap(0, 1, progress) * trigger.end);
      
      const wrap = (iterationDelta: number, scrollTo: number) => {
        iteration += iterationDelta;
        trigger.scroll(scrollTo);
        trigger.update();
      };

      ScrollTrigger.addEventListener("scrollEnd", () => scrollToOffset(scrub.vars.offset));

      function scrollToOffset(offset: number) {
        let snappedTime = snapTime(offset),
          progress = (snappedTime - seamlessLoop.duration() * iteration) / seamlessLoop.duration(),
          scroll = progressToScroll(progress);
        if (progress >= 1 || progress < 0) {
          return wrap(Math.floor(progress), scroll);
        }
        trigger.scroll(scroll);
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
    <div ref={containerRef} className="w-full relative gallery-container h-screen bg-[#111] overflow-hidden flex flex-col items-center justify-center -mx-4 md:-mx-8 px-4 md:px-8">
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 text-center relative z-10 top-8">
        Top Selling Mobile Phones
      </h2>

      <div className="relative w-full h-full flex items-center justify-center mt-12">
        <ul className="cards-list relative w-[280px] h-[400px] md:w-[320px] md:h-[460px] m-0 p-0">
          {TOP_MODELS.map((item, i) => (
            <li 
              key={item.id} 
              ref={(el) => { cardsRef.current[i] = el; }}
              className="absolute top-0 left-0 w-full h-full list-none bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-[#2a2a2a] rounded-3xl p-6 flex flex-col justify-between items-center shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden mb-4 shrink-0">
                <img src={item.image} alt={item.model} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-center mb-2">
                <div className="text-white font-bold text-xl md:text-2xl mb-1">{item.brand} {item.model}</div>
                <div className="text-[#a0a0a0] text-sm">({item.storage})</div>
              </div>
              <div className="text-center mb-6">
                <div className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-1">Get Upto</div>
                <div className="text-[#FFD700] font-black text-2xl md:text-3xl">₹{calculateFhoneifyPrice(item.price).toLocaleString('en-IN')}</div>
              </div>
              <button 
                onClick={() => handleSellClick(item.brand, item.model)}
                className="w-full bg-[#d4af37] hover:bg-[#f0c040] text-[#0a0a0a] font-bold py-3 px-6 rounded-xl transition-colors text-base"
              >
                Sell Now
              </button>
            </li>
          ))}
        </ul>

        {/* Navigation Buttons */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
          <button ref={prevBtnRef} className="w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white flex items-center justify-center transition-colors">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button ref={nextBtnRef} className="w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#333] text-white flex items-center justify-center transition-colors">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Drag Proxy for Mobile/Mouse dragging */}
        <div className="drag-proxy invisible absolute"></div>
      </div>
    </div>
  );
}
