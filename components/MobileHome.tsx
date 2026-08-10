'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopSellingModels from '@/components/TopSellingModels';
import WhyUs from '@/components/WhyUs';
import CustomerStories from '@/components/CustomerStories';
import FAQs from '@/components/FAQs';
import WarrantyClaim from '@/components/WarrantyClaim';
import { useState, useEffect } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';
import { BRANDS, BRAND_LOGOS, getBrandLogoStyle } from '@/lib/brands';
import GoogleReviewBanner from '@/components/GoogleReviewBanner';

const MOBILE_SLIDES = [
  {
    id: 1,
    title: "Every phone inspected. Every price earned.",
    desc: "Get the fairest value based on thorough 60-point checks.",
    btnText: "Get Quote",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)",
    icon: <div className="text-5xl opacity-80">🔍</div>
  },
  {
    id: 2,
    title: "Upgrade smart. Sell smarter.",
    desc: "Don't settle for less. Maximize your device's resale value.",
    btnText: "Sell Now",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
    icon: <div className="text-5xl opacity-80">💡</div>
  },
  {
    id: 3,
    title: "Turn your old phone into instant cash.",
    desc: "Fast, secure payments directly to your bank account.",
    btnText: "Get Cash",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    icon: <div className="text-5xl opacity-80">💸</div>
  },
  {
    id: 4,
    title: "Your phone's still worth something. Let's prove it.",
    desc: "Find out its true market value in less than 60 seconds.",
    btnText: "Check Value",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    icon: <div className="text-5xl opacity-80">📱</div>
  },
  {
    id: 5,
    title: "Don't let it collect dust. Let it collect cash.",
    desc: "Convert your unused tech into money today.",
    btnText: "Sell Now",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    icon: <div className="text-5xl opacity-80">💰</div>
  },
  {
    id: 6,
    title: "We inspect so you don't have to worry.",
    desc: "Professional diagnostics ensuring the fairest price.",
    btnText: "Learn More",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",
    icon: <div className="text-5xl opacity-80">✅</div>
  },
  {
    id: 7,
    title: "Phones change. Value shouldn't.",
    desc: "Lock in your guaranteed price right now.",
    btnText: "Lock Price",
    btnLink: "/quote",
    bg: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    icon: <div className="text-5xl opacity-80">🔒</div>
  }
];

export default function MobileHome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % MOBILE_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      router.push(`/quote?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="w-full bg-background min-h-screen pb-6">
      
      {/* Mobile Search Bar */}
      <div className="px-4 py-3 bg-background">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="#666" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search for phones, brands, or models..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-surface border border-border text-foreground rounded-lg pl-10 pr-4 py-3 focus:border-[var(--gold)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] text-sm"
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
                  <h2 className="text-foreground font-bold text-xl mb-1 leading-tight">{slide.title}</h2>
                  <p className="text-foreground/80 text-xs mb-3 leading-snug">{slide.desc}</p>
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
        <h3 className="text-foreground font-bold text-lg mb-4">Our Services</h3>
        <div className="grid grid-cols-2 gap-3">
          
          <Link href="/quote" className="bg-surface rounded-xl py-5 px-2 flex flex-col items-center justify-center border border-border">
            <div className="w-24 h-24 relative mb-2 flex items-center justify-center rounded-full overflow-hidden">
              <img src="/images/sell_phone.png" alt="Sell Phone" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm text-foreground font-medium mt-1">Sell Phones</span>
          </Link>

          <Link href="/buy" className="bg-surface rounded-xl py-5 px-2 flex flex-col items-center justify-center border border-border">
            <div className="w-24 h-24 relative mb-2 flex items-center justify-center rounded-full overflow-hidden">
              <img src="/images/buy_phone.png" alt="Buy Phone" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm text-foreground font-medium mt-1">Buy Phones</span>
          </Link>

        </div>
      </div>

      {/* Top Brands Section */}
      <div className="px-4 mt-8">
        <h3 className="text-foreground font-bold text-lg mb-4">Top Brands</h3>
        <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
          {BRANDS.slice(0, 10).map((brand) => (
            <Link 
              key={brand} 
              href={`/quote?brand=${encodeURIComponent(brand)}`}
              className="bg-surface rounded-xl p-3 border border-border flex flex-col items-center shrink-0 w-24 hover:border-[#38b2ac] transition-colors"
            >
              <div className="h-10 w-full flex items-center justify-center mb-2">
                <img 
                  src={BRAND_LOGOS[brand]} 
                  alt={brand} 
                  style={{
                    ...getBrandLogoStyle(brand),
                    height: '100%',
                    width: 'auto',
                    maxWidth: '100%'
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span className="text-xs text-muted font-medium text-center w-full truncate">{brand}</span>
            </Link>
          ))}
          <Link 
            href="/quote"
            className="bg-surface rounded-xl p-3 border border-border flex flex-col items-center justify-center shrink-0 w-24 hover:border-[#38b2ac] transition-colors"
          >
            <span className="text-xs text-gold font-medium">View All</span>
          </Link>
        </div>
      </div>

      {/* Buy Refurbished Devices Section */}
      <div className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-foreground font-bold text-lg">Buy Refurbished Devices</h3>
          <Link href="/buy" className="text-gold text-sm font-medium">View All</Link>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x hide-scrollbar">
          
          <div className="min-w-[180px] bg-surface border border-border rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Fhoneify Assured
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/71xb2xkN5qL._SX679_.jpg" alt="iPhone 13" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹12,000 OFF
            </div>
            <p className="text-foreground text-sm font-medium line-clamp-1">Apple iPhone 13</p>
          </div>

          <div className="min-w-[180px] bg-surface border border-border rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Fhoneify Assured
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/51L8W6d-DNL._SX300_SY300_QL70_FMwebp_.jpg" alt="Samsung S23" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹18,500 OFF
            </div>
            <p className="text-foreground text-sm font-medium line-clamp-1">Samsung Galaxy S23</p>
          </div>

          <div className="min-w-[180px] bg-surface border border-border rounded-xl p-3 snap-start relative">
            <div className="absolute top-3 left-3 bg-[#1A9386]/20 text-[#1A9386] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Fhoneify Assured
            </div>
            <div className="h-[120px] w-full flex items-center justify-center mt-6 mb-2">
              <img src="https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg" alt="iPhone 14" className="max-h-full max-w-full object-contain mix-blend-screen" />
            </div>
            <div className="bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold px-2 py-1 rounded inline-block mb-2">
              ₹15,000 OFF
            </div>
            <p className="text-foreground text-sm font-medium line-clamp-1">Apple iPhone 14</p>
          </div>

        </div>
      </div>

      {/* Top Selling Models */}
      <div className="px-4 mt-8 mb-8">
        <TopSellingModels />
      </div>

      {/* Google Reviews Trust Badge - Moved down */}
      <div className="px-4 mb-8 flex justify-center">
        <m.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <GoogleReviewBanner />
        </m.div>
      </div>

      {/* Why Us */}
      <div className="px-4 mt-8 mb-8">
        <WhyUs />
      </div>

      {/* Customer Stories */}
      <div className="px-4 mt-8 mb-8 overflow-hidden">
        <CustomerStories />
      </div>

      {/* FAQs */}
      <div className="px-4 mt-8 mb-12">
        <FAQs />
      </div>

      {/* Warranty Claim */}
      <div className="px-4 mt-8 mb-4">
        <WarrantyClaim />
      </div>

    </div>
  );
}
