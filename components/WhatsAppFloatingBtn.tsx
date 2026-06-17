'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function WhatsAppFloatingBtn() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();
  
  const phoneNumber = "919739063840";
  
  let message = "I'm interested in your services.";
  if (pathname === '/') message = "Hi Fhoneify, I'd like to know more about your services.";
  else if (pathname.startsWith('/buy/')) {
    const slug = pathname.split('/')[2];
    if (slug) {
      const formattedName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      message = `I'm interested in buying the ${formattedName}.`;
    } else {
      message = "I'm interested in buying a refurbished phone.";
    }
  }
  else if (pathname.startsWith('/buy')) message = "I'm interested in buying a refurbished phone.";
  else if (pathname.startsWith('/quote') || pathname.startsWith('/sell')) message = "I’m interested to sell my phone";
  else if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) message = "I need help with my cart/checkout.";
  else if (pathname.startsWith('/orders') || pathname.startsWith('/wallet') || pathname.startsWith('/security')) message = "I have a question about my account/order.";
  
  const prefilledMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${prefilledMessage}`;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Auto-open on desktop after 3 seconds
    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      }
    }, 3000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (isMobile) {
      // On mobile, let the anchor tag act normally (open whatsapp)
      return;
    }
    // On desktop, toggle the widget
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed z-50 whatsapp-container" style={{ right: '1.5rem' }}>
      
      {/* Expanded Widget (Desktop primarily) */}
      {!isMobile && isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col mb-3 transform transition-all duration-300 origin-bottom-right" style={{ border: '1px solid #e5e7eb' }}>
          {/* Header */}
          <div className="bg-[#25D366] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              WhatsApp
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1 transition">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="bg-[#f0f2f5] p-4 relative">
            <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm inline-block max-w-[90%] text-gray-800 text-sm relative">
              <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[10px] border-r-white border-b-[10px] border-b-transparent"></div>
              <p className="mb-1">Hello 👋</p>
              <p>Can we help you?</p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 bg-white flex justify-end">
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-1.5 px-4 text-sm rounded-full flex items-center gap-2 transition"
            >
              Open chat
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`flex items-center justify-center w-12 h-12 bg-[#25D366] rounded-full shadow-lg hover:bg-[#128C7E] transition-colors duration-300 absolute bottom-0 right-0 ${!isOpen ? 'whatsapp-pulse' : ''}`}
        style={{
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)'
        }}
        aria-label="Chat with us on WhatsApp"
      >
        {isOpen && !isMobile ? (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="white" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="white"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
        )}
      </a>

      {/* Spacing rules */}
      <style jsx>{`
        .whatsapp-container {
          bottom: 2rem;
        }
        @media (max-width: 768px) {
          .whatsapp-container {
            bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </div>
  );
}

