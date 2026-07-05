import React from 'react';

export default function WarrantyClaim() {
  return (
    <div className="w-full bg-[#0a0a0a] rounded-2xl border border-[#2a2a2a] overflow-hidden p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 justify-between mt-8">
      <div className="flex-1">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">How to claim warranty?</h2>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="mt-1 bg-white rounded-full p-1 h-6 w-6 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#38b2ac]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-white text-base md:text-lg">
                Drop a &quot;Hi&quot; on WhatsApp on{' '}
                <a href="https://wa.me/919187448347" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-[#38b2ac] transition-colors underline decoration-[#38b2ac]/50">
                  +91 91874 48347
                </a>
                {' '}or email at{' '}
                <a href="mailto:return@fhoneify.com" className="font-bold hover:text-[#38b2ac] transition-colors">
                  return@fhoneify.com
                </a>{' '}
                to register your complaint.
              </p>
            </div>
          </div>
          
          <div className="w-full h-px bg-[#2a2a2a]"></div>

          <div className="flex gap-4">
            <div className="mt-1 bg-white rounded-full p-1 h-6 w-6 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#38b2ac]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-white text-base md:text-lg mb-1">
                At your convenience, our customer support team will arrange a doorstep visit or a store visit for you.
              </p>
              <p className="text-[#a0a0a0] text-sm">
                (Keep your IMEI No. & registered Mobile No. handy. It&apos;s needed for replacement claims.)
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-[#2a2a2a]"></div>

          <div className="flex gap-4">
            <div className="mt-1 bg-white rounded-full p-1 h-6 w-6 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#38b2ac]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="text-white text-base md:text-lg">
                That&apos;s it! Our experts will help resolve your issue and you can continue enjoying your latest phone.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-[#38b2ac]/20 blur-3xl rounded-full"></div>
        <svg className="w-full h-full text-[#38b2ac] drop-shadow-2xl relative z-10" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fillOpacity="0.8"/>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#grad1)"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:'#38b2ac', stopOpacity:1}} />
              <stop offset="100%" style={{stopColor:'#2c7a7b', stopOpacity:1}} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
