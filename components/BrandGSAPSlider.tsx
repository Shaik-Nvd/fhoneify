'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BRANDS, BRAND_LOGOS } from '@/lib/brands';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const TOP_BRANDS = [
  { name: 'Apple', color: '#000000', outlineColor: 'rgba(255,255,255,0.05)' },
  { name: 'Samsung', color: '#08102b', outlineColor: 'rgba(20,40,160,0.1)' },
  { name: 'OnePlus', color: '#2a0004', outlineColor: 'rgba(229,0,18,0.1)' },
  { name: 'Vivo', color: '#0d1333', outlineColor: 'rgba(65,95,255,0.1)' },
  { name: 'Oppo', color: '#001a14', outlineColor: 'rgba(0,117,94,0.1)' },
  { name: 'Xiaomi', color: '#2b1200', outlineColor: 'rgba(255,105,0,0.1)' }
];

export default function BrandGSAPSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current || !trackRef.current || typeof window === 'undefined') return;

    // Use gsap.context for easy cleanup in React
    const ctx = gsap.context(() => {
      const slidesCount = TOP_BRANDS.length;
      
      // Floating animation for logos (constant, not tied to scroll)
      slidesRef.current.forEach((slide) => {
        if (!slide) return;
        const logo = slide.querySelector('.brand-logo');
        if (logo) {
          gsap.to(logo, {
            y: -15,
            rotationX: 10,
            rotationY: -10,
            duration: 2 + Math.random(),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        }
      });

      // Main Horizontal ScrollTrigger Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          start: "top top",
          end: `+=${slidesCount * 100}%`,
          scrub: 1, // Smooth scrubbing
        }
      });

      // 1. Animate the horizontal track
      tl.to(trackRef.current, {
        xPercent: -100 * (slidesCount - 1) / slidesCount, // Since the track is n*100% wide, we move it by -(n-1)/n * 100%
        ease: "none"
      }, 0);

      // 2. Animate background color of the container to match each brand
      // We divide the timeline into equal segments
      TOP_BRANDS.forEach((brand, index) => {
        if (index === 0) return; // First color is default
        tl.to(containerRef.current, {
          backgroundColor: brand.color,
          ease: "none",
          duration: 1
        }, index - 0.5); // Start fading halfway through previous slide
      });

      // 3. Parallax for the giant background text (moves slightly faster/slower than the slide)
      slidesRef.current.forEach((slide, index) => {
        if (!slide) return;
        const giantText = slide.querySelector('.giant-text');
        if (giantText) {
          // As the track moves left, the giant text moves right relative to the slide to create parallax
          gsap.fromTo(giantText, 
            { x: '10vw' },
            { 
              x: '-10vw',
              ease: "none",
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: `+=${slidesCount * 100}%`,
                scrub: 1
              }
            }
          );
        }
      });

      // 4. Animate the progress bar
      const progressBar = containerRef.current.querySelector('.progress-bar');
      if (progressBar) {
        tl.to(progressBar, {
          width: '100%',
          ease: "none"
        }, 0);
      }

    }, containerRef); // Scope to container

    return () => ctx.revert(); // Cleanup on unmount
  }, []);

  return (
    <section 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100vh', 
        overflow: 'hidden',
        backgroundColor: TOP_BRANDS[0].color, // Initial background
      }}
    >
      {/* Dynamic Horizontal Track */}
      <div 
        ref={trackRef}
        style={{
          display: 'flex',
          width: `${TOP_BRANDS.length * 100}vw`,
          height: '100%',
        }}
      >
        {TOP_BRANDS.map((brand, i) => (
          <div 
            key={brand.name}
            ref={(el) => { slidesRef.current[i] = el; }}
            style={{
              width: '100vw',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Giant Parallax Background Text */}
            <h1 
              className="giant-text"
              style={{
                position: 'absolute',
                fontSize: 'clamp(8rem, 25vw, 20rem)',
                fontWeight: 900,
                color: 'transparent',
                WebkitTextStroke: `2px ${brand.outlineColor}`,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.8
              }}
            >
              {brand.name}
            </h1>

            {/* Foreground Content */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2.5rem',
              zIndex: 10,
              perspective: '1000px'
            }}>
              {/* Glassmorphic Logo Container */}
              <div 
                className="brand-logo glass-card"
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(20px)',
                  transformStyle: 'preserve-3d'
                }}
              >
                <img 
                  src={BRAND_LOGOS[brand.name]} 
                  alt={brand.name}
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1) drop-shadow(0px 10px 15px rgba(255,255,255,0.2))',
                    transform: 'translateZ(30px)' // Pops out of the glass
                  }}
                />
              </div>

              {/* Title & Button */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ 
                  color: '#fff', 
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
                  fontWeight: 700, 
                  letterSpacing: '-1px',
                  marginBottom: '1.5rem',
                  textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  {brand.name}
                </h2>
                <Link href={`/quote?brand=${brand.name}`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    padding: '16px 40px',
                    borderRadius: '50px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.color = '#000';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  >
                    Sell your {brand.name}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress Bar overlay */}
      <div style={{ 
        position: 'absolute', 
        bottom: '3rem', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 20, 
        width: '200px',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div 
          className="progress-bar"
          style={{
            height: '100%',
            width: '0%', // Will be animated by GSAP
            background: '#fff',
            borderRadius: '2px'
          }}
        />
      </div>

      {/* View All Brands Button */}
      <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 20 }}>
        <Link href="/quote" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          >
            View All Brands <span>→</span>
          </button>
        </Link>
      </div>
    </section>
  );
}
