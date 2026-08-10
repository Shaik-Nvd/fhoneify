'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  { num: '01', title: 'Get a Quote', desc: 'Select your device and condition to receive an instant valuation.' },
  { num: '02', title: 'Schedule Pickup', desc: 'We come to your doorstep. Free pickup, zero hassle.' },
  { num: '03', title: 'Get Paid', desc: 'Instant payment via UPI once your device is verified.' },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      // Orchestrated Elastic Reveal
      gsap.fromTo('.step-card',
        { 
          opacity: 0, 
          y: 100, 
          scale: 0.8,
          rotationY: -30
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationY: 0,
          duration: 1.5,
          ease: 'elastic.out(1, 0.6)',
          stagger: 0.25,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 75%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <div className="w-full" ref={containerRef} style={{ perspective: '1000px' }}>
      <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>HOW IT WORKS</p>
      <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 300, color: 'var(--foreground)', marginBottom: '4rem' }}>
        Three simple steps
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
        {STEPS.map((s) => (
          <div key={s.num} className="step-card glass-card p-8 rounded-2xl border border-border" style={{ textAlign: 'center', transformStyle: 'preserve-3d' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: 'var(--gold)',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: '0 10px 30px rgba(212,175,55,0.1)'
            }}>
              {s.num}
            </div>
            <h3 style={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: '1rem', fontSize: '1.5rem' }}>{s.title}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
