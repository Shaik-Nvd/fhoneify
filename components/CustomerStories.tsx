'use client';

import React, { useRef } from 'react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Customer Stories</h2>
        <div className="hidden md:flex gap-2">
          <button onClick={scrollLeft} className="w-10 h-10 rounded-full border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#1a1a1a] transition-colors">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button onClick={scrollRight} className="w-10 h-10 rounded-full border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#1a1a1a] transition-colors">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 md:gap-6 pb-6 snap-x hide-scrollbar"
      >
        {TESTIMONIALS.map((item) => (
          <div key={item.id} className="min-w-[280px] md:min-w-[350px] bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col snap-start shrink-0">
            <div className="mb-4 text-[#38b2ac]">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-10 h-10 opacity-50">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"></path>
              </svg>
            </div>
            <p className="text-[#a0a0a0] flex-1 mb-8 leading-relaxed">
              &quot;{item.quote}&quot;
            </p>
            <div className="flex items-center gap-3">
              <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="text-white font-medium text-sm">{item.author}</div>
                <div className="text-[#666] text-xs">{item.location}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
