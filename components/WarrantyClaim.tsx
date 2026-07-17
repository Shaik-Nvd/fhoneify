'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function WarrantyClaim() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const shieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Continuous floating animation for the shield
      gsap.to(shieldRef.current, {
        y: -15,
        duration: 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-gradient-to-br from-[#0f0f0f] to-[#050505] rounded-3xl border border-[#2a2a2a] overflow-hidden p-8 md:p-10 flex flex-col md:flex-row items-center gap-12 justify-between mt-12 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(56,178,172,0.15)] hover:border-[#38b2ac]/30 transition-all duration-500"
    >
      <div className="flex-1">
        <h2 ref={titleRef} className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">
          How to claim warranty?
        </h2>
        
        <div className="space-y-6">
          <div ref={el => { itemsRef.current[0] = el; }} className="flex gap-5 group">
            <div className="mt-1 bg-[#38b2ac]/10 group-hover:bg-[#38b2ac] rounded-full p-1.5 h-8 w-8 flex items-center justify-center shrink-0 transition-colors duration-300">
              <svg className="w-5 h-5 text-[#38b2ac] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-[#e0e0e0] text-lg md:text-xl font-light leading-relaxed">
                Drop a &quot;Hi&quot; on WhatsApp on{' '}
                <a href="https://wa.me/919187448347" target="_blank" rel="noopener noreferrer" className="font-bold text-[#FFD700] hover:text-[#f0c040] transition-colors">
                  +91 91874 48347
                </a>
                {' '}or email at{' '}
                <a href="mailto:ffhoneify@gmail.com" className="font-bold text-[#FFD700] hover:text-[#f0c040] transition-colors relative inline-block after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-[#f0c040] after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">
                  ffhoneify@gmail.com
                </a>{' '}
                to register your complaint.
              </p>
            </div>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-[#38b2ac]/20 via-[#2a2a2a] to-transparent"></div>

          <div ref={el => { itemsRef.current[1] = el; }} className="flex gap-5 group">
            <div className="mt-1 bg-[#38b2ac]/10 group-hover:bg-[#38b2ac] rounded-full p-1.5 h-8 w-8 flex items-center justify-center shrink-0 transition-colors duration-300">
              <svg className="w-5 h-5 text-[#38b2ac] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-[#e0e0e0] text-lg md:text-xl font-light leading-relaxed mb-1">
                At your convenience, our customer support team will arrange a <span className="text-white font-medium">doorstep visit</span> or a <span className="text-white font-medium">store visit</span> for you.
              </p>
              <p className="text-[#888] text-sm mt-2">
                (Keep your IMEI No. & registered Mobile No. handy. It&apos;s needed for replacement claims.)
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-[#38b2ac]/20 via-[#2a2a2a] to-transparent"></div>

          <div ref={el => { itemsRef.current[2] = el; }} className="flex gap-5 group">
            <div className="mt-1 bg-[#38b2ac]/10 group-hover:bg-[#38b2ac] rounded-full p-1.5 h-8 w-8 flex items-center justify-center shrink-0 transition-colors duration-300">
              <svg className="w-5 h-5 text-[#38b2ac] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-[#e0e0e0] text-lg md:text-xl font-light leading-relaxed">
                That&apos;s it! Our experts will help resolve your issue and you can continue enjoying your latest phone.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div ref={shieldRef} className="w-56 h-56 md:w-72 md:h-72 shrink-0 flex items-center justify-center relative group">
        {/* Glow effect that pulses on hover */}
        <div className="absolute inset-0 bg-[#38b2ac]/20 blur-3xl rounded-full group-hover:bg-[#38b2ac]/40 transition-colors duration-500"></div>
        <div className="absolute inset-4 bg-[#FFD700]/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <svg className="w-full h-full text-[#38b2ac] drop-shadow-[0_10px_20px_rgba(56,178,172,0.4)] relative z-10 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fillOpacity="0.8"/>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#grad1)"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:'#38b2ac', stopOpacity:1}} />
              <stop offset="100%" style={{stopColor:'#234e4f', stopOpacity:1}} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
