'use client';

import React, { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: 'How do I know the price of my old phone?',
    a: 'Our smart AI-based pricing engine evaluates your phone based on its make, model, age, and condition. Simply answer a few quick questions about your device to get an instant, competitive quote.'
  },
  {
    q: 'What should I do if my old phone is not turning on?',
    a: 'We accept dead phones as well! When generating your quote, simply select the option indicating the device does not turn on. Our team will still evaluate it and offer a fair value for its salvageable components.'
  },
  {
    q: 'Can I cancel my sale if I change my mind?',
    a: 'Yes, absolutely. You are under no obligation to sell until the pickup executive physically inspects and collects your device. If you change your mind before the handover, you can cancel the request from your dashboard for free.'
  },
  {
    q: 'How and when will I get paid?',
    a: 'You receive your payment instantly at the time of pickup! Our executive will transfer the agreed amount via UPI, IMPS, or your preferred payment method directly to your account before leaving with the device.'
  }
];

export default function FAQs() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    if (openIdx === idx) {
      setOpenIdx(null);
    } else {
      setOpenIdx(idx);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">FAQs</h2>
      
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="bg-surface border border-border rounded-xl overflow-hidden transition-all duration-300">
              <button 
                onClick={() => toggle(idx)} 
                className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-[#151515] transition-colors"
              >
                <span className="text-foreground font-medium pr-4">{item.q}</span>
                <svg 
                  className={`w-5 h-5 text-[#38b2ac] transform transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-5 pb-5 pt-1 text-muted text-sm leading-relaxed border-t border-[#1a1a1a]">
                  {item.a}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 flex justify-center md:justify-start">
        <button className="text-[#38b2ac] font-medium hover:text-foreground transition-colors">
          Load More FAQs
        </button>
      </div>
    </div>
  );
}
