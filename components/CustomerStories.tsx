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
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      const cards = cardsRef.current.filter(Boolean);
      
      // Initialize cards
      cards.forEach((card, i) => {
        gsap.set(card, {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: cards.length - i,
          y: i === 0 ? 0 : '150vh', // Send all but first below viewport
          opacity: i === 0 ? 1 : 0,
          scale: i === 0 ? 1 : 0.8,
        });
      });

      // Pin the entire container and scrub the stack
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 15%",
          end: `+=${cards.length * 100}%`,
          pin: true,
          scrub: 1, // Smooth scrub
        }
      });

      // Animate cards into the stack
      cards.forEach((card, i) => {
        if (i === 0) return;
        
        // 1. Bring the new card up
        tl.to(card, {
          y: 0,
          opacity: 1,
          scale: 1,
          ease: 'power1.inOut',
        }, i); // Use 'i' as the timeline position
        
        // 2. Push all previous cards back (scale down, move up slightly, fade slightly)
        for (let j = 0; j < i; j++) {
          tl.to(cards[j], {
            y: -30 * (i - j), // Move up slightly
            scale: 1 - 0.05 * (i - j), // Scale down
            opacity: 1 - 0.2 * (i - j), // Fade out
            ease: 'power1.inOut'
          }, i);
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-16 text-center">
        Customer Stories
      </h2>
      
      <div 
        className="relative w-full max-w-2xl mx-auto" 
        style={{ height: '350px', perspective: '1000px' }}
      >
        {TESTIMONIALS.map((item, i) => (
          <div 
            key={item.id} 
            ref={(el) => { cardsRef.current[i] = el; }}
            className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#2a2a2a] rounded-3xl p-8 md:p-12 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col justify-between h-full"
            style={{ transformStyle: 'preserve-3d' }}
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
