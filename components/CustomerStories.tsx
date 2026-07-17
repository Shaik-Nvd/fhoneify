'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const TESTIMONIALS = [
  {
    id: 1,
    quote: "I loved that Fhoneify picked up my phone from my home and paid me instantly. It was super convenient since I'm always busy.",
    author: "Ratikant Gokhale",
    location: "Gurgaon",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
  },
  {
    id: 2,
    quote: "I tried selling my phone locally, but didn't have any luck as everyone was trying to exploit the price. Fhoneify helped me sell it in just minutes without any stress.",
    author: "Harpreet Singh",
    location: "Haldwani",
    avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d"
  },
  {
    id: 3,
    quote: "My phone was in good condition, and I was surprised that Fhoneify offered me more than I expected. Really happy with the deal.",
    author: "Bagesh Kumar",
    location: "Agra",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
  },
  {
    id: 4,
    quote: "I was nervous about selling my phone online as the condition was really good but Fhoneify made it simple with no hassles and great customer support.",
    author: "Shubham Ghunawat",
    location: "Delhi",
    avatar: "https://i.pravatar.cc/150?u=a048581f4e29026701d"
  }
];

export default function CustomerStories() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !scrollWrapperRef.current || typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Infinite horizontal marquee
      gsap.to(scrollWrapperRef.current, {
        xPercent: -50,
        ease: "none",
        duration: 30, // Adjust speed here
        repeat: -1
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="w-full relative overflow-hidden" ref={containerRef}>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-16 text-center">
        Customer Stories
      </h2>
      
      {/* 
        This wrapper holds all the cards in a horizontal row.
        We duplicate the testimonials array to create a seamless infinite loop.
      */}
      <div 
        ref={scrollWrapperRef}
        className="flex gap-6 md:gap-8 px-4 md:px-8 w-max"
        style={{ paddingLeft: '1rem' }}
      >
        {[...TESTIMONIALS, ...TESTIMONIALS].map((item, idx) => (
          <div 
            key={`${item.id}-${idx}`} 
            className="w-[320px] md:w-[450px] bg-[#111] border border-[#2a2a2a] rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col justify-between"
          >
            <div className="mb-6 text-[#38b2ac]">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-12 h-12 opacity-40">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"></path>
              </svg>
            </div>
            <p className="text-white text-lg md:text-xl flex-1 mb-8 leading-relaxed font-light">
              &quot;{item.quote}&quot;
            </p>
            <div className="flex items-center gap-4">
              <img src={item.avatar} alt={item.author} className="w-12 h-12 rounded-full object-cover border-2 border-[#38b2ac]" />
              <div>
                <div className="text-white font-bold text-base">{item.author}</div>
                <div className="text-[#888] text-sm tracking-widest uppercase">{item.location}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
