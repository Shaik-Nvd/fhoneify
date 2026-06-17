'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';

const MOBILE_SLIDES = [
  {
    id: 1,
    title: "Sell old phone",
    desc: "From your doorstep or at any of our 200 stores pan-India",
    btnText: "Sell Now",
    btnLink: "/sell",
    bg: "linear-gradient(135deg, #2EC4B6 0%, #1A9386 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="64" height="64" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <path d="M12 18h.01"></path>
      </svg>
    )
  },
  {
    id: 2,
    title: "Price Crash Zone",
    desc: "Get the devices you want at lowest-ever prices",
    btnText: "Order Now",
    btnLink: "/buy",
    bg: "linear-gradient(135deg, #4A90E2 0%, #1C54A8 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="64" height="64" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    )
  },
  {
    id: 3,
    title: "Join Fhoneify Partner",
    desc: "Get leads, grow your inventory & accelerate profit",
    btnText: "Get Details",
    btnLink: "/partner",
    bg: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="64" height="64" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    )
  },
  {
    id: 4,
    title: "Refurbished Mega Sale",
    desc: "Save up to 20% OFF on certified renewed mobile phones",
    btnText: "Buy Now",
    btnLink: "/buy",
    bg: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="64" height="64" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    )
  }
];

export default function MobileHome() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % MOBILE_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[#0a0a0a] min-h-screen pb-6">
      
      {/* Mobile Search Bar */}
      <div className="px-4 py-3 bg-[#0a0a0a]">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="#666" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search for mobiles..." 
            className="w-full bg-[#111] border border-[#2a2a2a] text-white rounded-lg pl-10 pr-4 py-3 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-sm"
          />
        </div>
      </div>

      {/* Hero Banner Slider */}
      <div className="px-4 mt-2">
        <div className="relative w-full overflow-hidden rounded-xl h-[200px]">
          <div className="flex w-full h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {MOBILE_SLIDES.map((slide) => (
              <div key={slide.id} className="w-full h-full flex-shrink-0 relative" style={{ background: slide.bg }}>
                <div className="absolute inset-0 p-5 flex flex-col justify-center w-[65%]">
                  <h2 className="text-white font-bold text-xl mb-1 leading-tight">{slide.title}</h2>
                  <p className="text-white/80 text-xs mb-3 leading-snug">{slide.desc}</p>
                  <Link href={slide.btnLink}>
                    <button className="bg-white text-black font-semibold text-xs py-2 px-4 rounded-md shadow-sm w-max">
                      {slide.btnText}
                    </button>
                  </Link>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {slide.icon}
                </div>
              </div>
            ))}
          </div>
          {/* Pagination Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {MOBILE_SLIDES.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Our Services Section */}
      <div className="px-4 mt-6">
        <h3 className="text-white font-bold text-lg mb-4">Our Services</h3>
        <div className="grid grid-cols-2 gap-3">
          
          <Link href="/sell" className="bg-[#151c1a] rounded-xl p-4 flex flex-col items-center justify-center border border-[#1e2a26]">
            <div className="w-16 h-16 relative mb-2 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <div className="absolute -right-2 top-0 bg-[#4ade80]/20 rounded-full p-1">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <span className="text-sm text-white font-medium">Sell Phone</span>
          </Link>

          <Link href="/buy" className="bg-[#15191c] rounded-xl p-4 flex flex-col items-center justify-center border border-[#1e262a]">
            <div className="w-16 h-16 relative mb-2 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <div className="absolute -right-2 top-0 bg-[#60a5fa]/20 rounded-full p-1">
                <span className="text-lg">🛍️</span>
              </div>
            </div>
            <span className="text-sm text-white font-medium">Buy Phone</span>
          </Link>

        </div>
      </div>

      {/* Sell Your Old Device Now Section */}
      <div className="px-4 mt-8">
        <h3 className="text-white font-bold text-lg mb-4">Sell Your Old Device Now</h3>
        <div className="grid grid-cols-2 gap-3">
          
          <Link href="/sell" className="bg-[#151c1a] rounded-xl p-4 flex flex-col items-center justify-center border border-[#1e2a26]">
            <div className="w-16 h-16 relative mb-2 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <div className="absolute -right-2 top-0 bg-[#4ade80]/20 rounded-full p-1">
                <span className="text-lg">📱</span>
              </div>
            </div>
            <span className="text-sm text-white font-medium">Sell Phone</span>
          </Link>
          
          {/* We omit Sell Laptop/Sell TV etc. to stick strictly to "only mobile phones selling and buying" */}

        </div>
      </div>

      {/* Buy Refurbished Devices Section */}
      <div className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">Buy Refurbished Devices</h3>
          <Link href="/buy" className="text-[#d4af37] text-sm font-medium">View All</Link>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x hide-scrollbar">
          
          <div className="min-w-[180px] bg-[#111] border border-[#2a2a2a] rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              FHONEIFY ASSURED
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/71xb2xkN5qL._SX679_.jpg" alt="iPhone 13" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹12,000 OFF
            </div>
            <p className="text-white text-sm font-medium line-clamp-1">Apple iPhone 13</p>
          </div>

          <div className="min-w-[180px] bg-[#111] border border-[#2a2a2a] rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              FHONEIFY ASSURED
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/81x15N13N0L._SX679_.jpg" alt="Samsung S23" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹18,500 OFF
            </div>
            <p className="text-white text-sm font-medium line-clamp-1">Samsung Galaxy S23</p>
          </div>

          <div className="min-w-[180px] bg-[#111] border border-[#2a2a2a] rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              FHONEIFY ASSURED
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg" alt="iPhone 14" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹15,000 OFF
            </div>
            <p className="text-white text-sm font-medium line-clamp-1">Apple iPhone 14</p>
          </div>

        </div>
      </div>

    </div>
  );
}
