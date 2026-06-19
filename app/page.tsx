'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { useEffect, useState, useRef } from 'react';
import { LazyMotion, domAnimation, m, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

import { BRANDS, BRAND_LOGOS, getBrandLogoStyle } from '@/lib/brands';

const STEPS = [
  { num: '01', title: 'Get a Quote', desc: 'Select your device and condition to receive an instant valuation.' },
  { num: '02', title: 'Schedule Pickup', desc: 'We come to your doorstep. Free pickup, zero hassle.' },
  { num: '03', title: 'Get Paid', desc: 'Instant payment via UPI once your device is verified.' },
];

const STATS = [
  { value: '50K+', label: 'Phones Sold' },
  { value: '₹12Cr+', label: 'Paid to Sellers' },
  { value: '4.8★', label: 'User Rating' },
  { value: 'Bengaluru', label: 'Currently Serving' },
];

const TRUST = [
  'Free doorstep pickup',
  'Instant UPI payment',
  'Quality verified devices',
  'Data wiped securely',
];

// Reusable 3D Tilt Card
function TiltCard({ children, href }: { children: React.ReactNode, href: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <m.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="glass-card"
        whileHover={{ scale: 1.05, zIndex: 10 }}
        whileTap={{ scale: 0.95 }}
      >
        <div style={{ transform: "translateZ(30px)" }}>
          {children}
        </div>
      </m.div>
    </Link>
  );
}

const BANNER_ITEMS = [
  { id: 1, title: 'Every phone inspected. Every price earned.', desc: 'Get the fairest value based on thorough 60-point checks.', cta: 'Get Quote', link: '/quote', icon: '🔍' },
  { id: 2, title: 'Upgrade smart. Sell smarter.', desc: 'Don\'t settle for less. Maximize your device\'s resale value.', cta: 'Sell Now', link: '/quote', icon: '💡' },
  { id: 3, title: 'Turn your old phone into instant cash.', desc: 'Fast, secure payments directly to your bank account.', cta: 'Get Cash', link: '/quote', icon: '💸' },
  { id: 4, title: 'Your phone\'s still worth something. Let\'s prove it.', desc: 'Find out its true market value in less than 60 seconds.', cta: 'Check Value', link: '/quote', icon: '📱' },
  { id: 5, title: 'Don\'t let it collect dust. Let it collect cash.', desc: 'Convert your unused tech into money today.', cta: 'Sell Now', link: '/quote', icon: '💰' },
  { id: 6, title: 'We inspect so you don\'t have to worry.', desc: 'Professional diagnostics ensuring the fairest price.', cta: 'Learn More', link: '/quote', icon: '✅' },
  { id: 7, title: 'Phones change. Value shouldn\'t.', desc: 'Lock in your guaranteed price right now.', cta: 'Lock Price', link: '/quote', icon: '🔒' },
];

function SlidingBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNER_ITEMS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '16px', marginBottom: '4rem', marginTop: '4rem' }} className="glass-panel">
      <div style={{ display: 'flex', transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)', transform: `translateX(-${currentIndex * 100}%)` }}>
        {BANNER_ITEMS.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row items-center justify-between" style={{ minWidth: '100%', padding: '2rem md:3rem', gap: '2rem' }}>
            <div style={{ maxWidth: '100%' }} className="md:max-w-[60%] text-center md:text-left">
              <h2 className="text-gradient-animated" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em', display: 'inline-block' }}>{item.title}</h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem', fontWeight: 500, color: '#a0a0a0' }}>{item.desc}</p>
              <Link href={item.link} className="btn-primary" style={{ padding: '12px 32px', fontSize: '1rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
                {item.cta}
              </Link>
            </div>
            <div className="hidden md:block" style={{ fontSize: '6rem', opacity: 0.9, filter: 'drop-shadow(0 10px 15px rgba(212,175,55,0.2))' }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem' }}>
        {BANNER_ITEMS.map((_, idx) => (
          <button key={idx} onClick={() => setCurrentIndex(idx)} style={{ width: idx === currentIndex ? '32px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: idx === currentIndex ? '#d4af37' : 'rgba(255,255,255,0.2)', border: 'none', transition: 'all 0.3s ease', cursor: 'pointer' }} aria-label={`Go to slide ${idx + 1}`} />
        ))}
      </div>
    </div>
  );
}

// 3D Floating CSS Phone Component with Dramatic Scroll Parallax
function FloatingPhone() {
  const { scrollY } = useScroll();
  
  // Supercharged 3D transforms
  const phoneRotateY = useTransform(scrollY, [0, 1000], ["-20deg", "60deg"]);
  const phoneRotateX = useTransform(scrollY, [0, 1000], ["10deg", "45deg"]);
  const phoneRotateZ = useTransform(scrollY, [0, 1000], ["-5deg", "15deg"]);
  const phoneScale = useTransform(scrollY, [0, 1000], [1, 1.25]);
  
  // Deep travel into the next section
  const phoneY = useTransform(scrollY, [0, 1000], ["0px", "600px"]);
  const phoneZ = useTransform(scrollY, [0, 1000], ["0px", "300px"]);

  // Counter-moving parallax badges
  const badge1Y = useTransform(scrollY, [0, 1000], ["0px", "-200px"]);
  const badge2Y = useTransform(scrollY, [0, 1000], ["0px", "-350px"]);
  const badge3Y = useTransform(scrollY, [0, 1000], ["0px", "-150px"]);

  return (
    <div className="perspective-container" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px', position: 'relative' }}>
      
      {/* Floating Badge 1 */}
      <m.div style={{ position: 'absolute', top: '15%', left: '-5%', y: badge1Y, zIndex: 20 }} className="glass-card p-3 md:p-4 rounded-xl flex items-center gap-3 shadow-2xl">
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✨</div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Instant</p>
          <p style={{ color: '#a0a0a0', fontSize: '0.75rem', margin: 0 }}>Valuation</p>
        </div>
      </m.div>

      {/* Floating Badge 2 */}
      <m.div style={{ position: 'absolute', bottom: '15%', right: '-15%', y: badge2Y, zIndex: 20 }} className="glass-card p-3 md:p-4 rounded-xl flex items-center gap-3 shadow-2xl">
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💸</div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Highest</p>
          <p style={{ color: '#a0a0a0', fontSize: '0.75rem', margin: 0 }}>Market Price</p>
        </div>
      </m.div>

      {/* Floating Badge 3 */}
      <m.div style={{ position: 'absolute', top: '60%', left: '-20%', y: badge3Y, zIndex: -1, opacity: 0.8 }} className="glass-card p-2 md:p-3 rounded-xl flex items-center gap-2 shadow-2xl">
        <span style={{ fontSize: '1.2rem' }}>🔒</span>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>Secure Wipe</span>
      </m.div>

      <m.div 
        className="floating-phone"
        style={{ 
          rotateY: phoneRotateY, 
          rotateX: phoneRotateX, 
          rotateZ: phoneRotateZ,
          scale: phoneScale,
          y: phoneY,
          z: phoneZ,
          transformStyle: "preserve-3d",
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="css-phone" style={{ boxShadow: '0 50px 100px -20px rgba(212,175,55,0.25), 0 30px 60px -30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1)' }}>
          <div className="css-phone-screen">
            <h1 className="text-gradient-animated" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '1px' }}>FHONEIFY</h1>
            <p style={{ color: '#a0a0a0', fontSize: '0.85rem', textAlign: 'center', maxWidth: '85%', lineHeight: 1.4 }}>AI-Powered Valuation Engine</p>
            <div style={{ marginTop: '3rem', display: 'flex', gap: '0.8rem' }}>
              <m.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }} style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', boxShadow: 'inset 0 0 10px rgba(212,175,55,0.2)' }} />
              <m.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', boxShadow: 'inset 0 0 10px rgba(212,175,55,0.2)' }} />
              <m.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', boxShadow: 'inset 0 0 10px rgba(212,175,55,0.2)' }} />
            </div>
            
            {/* Screen Glare effect */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)', pointerEvents: 'none', borderRadius: 'inherit' }} />
          </div>
        </div>
      </m.div>
    </div>
  );
}

// Magnetic Button Component
function MagneticButton({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    x.set(distanceX * 0.3); // Pull distance multiplier
    y.set(distanceY * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: mouseXSpring, y: mouseYSpring, zIndex: 10, position: 'relative' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <button className={className} style={{ ...style, cursor: 'none' }}>
        {children}
      </button>
    </m.div>
  );
}

import MobileHome from '@/components/MobileHome';
import TopSellingModels from '@/components/TopSellingModels';
import WhyUs from '@/components/WhyUs';
import CustomerStories from '@/components/CustomerStories';
import FAQs from '@/components/FAQs';
import WarrantyClaim from '@/components/WarrantyClaim';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const orbY = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);

  // Global Mouse Tracking for Background Parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgXSpring = useSpring(useTransform(mouseX, [0, 1], ["10%", "-10%"]), { stiffness: 50, damping: 20 });
  const bgYSpring = useSpring(useTransform(mouseY, [0, 1], ["10%", "-10%"]), { stiffness: 50, damping: 20 });
  const bgXSpringInverse = useSpring(useTransform(mouseX, [0, 1], ["-10%", "10%"]), { stiffness: 50, damping: 20 });

  useEffect(() => {
    setMounted(true);
    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  // Word-by-Word Scroll Reveal variant
  const wordRevealVariants = {
    hidden: { opacity: 0.2 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        
        {/* Mobile View */}
        <div className="block md:hidden">
          <MobileHome />
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          {/* 3D Hero Parallax Section */}
          <section style={{
        position: 'relative',
        backgroundColor: '#0a0a0a',
        padding: '6rem 0 4rem',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* Deep Mesh Background Orbs tracked by Mouse & Scroll */}
        <m.div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(10,10,10,0) 70%)', filter: 'blur(80px)', y: heroY, x: bgXSpring }} />
        <m.div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(10,10,10,0) 70%)', filter: 'blur(100px)', y: orbY, x: bgXSpringInverse }} />

        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem', width: '100%', position: 'relative', zIndex: 10 }}>
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            
            {/* Left Content */}
            <m.div 
              className="w-full md:flex-1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <m.p variants={itemVariants} className="eyebrow" style={{ marginBottom: '1.5rem', letterSpacing: '4px' }}>INDIA&apos;S PREMIUM PHONE RESALE</m.p>
              <m.h1 variants={itemVariants} style={{
                fontSize: 'clamp(2.2rem, 8vw, 4.5rem)',
                fontWeight: 300,
                color: '#ffffff',
                lineHeight: 1.1,
                marginBottom: '1rem',
                letterSpacing: '-0.04em',
              }}>
                Sell Smart.<br/>
                <span className="text-gradient-animated" style={{ fontStyle: 'italic', paddingRight: '0.2em' }}>Buy Smarter.</span>
              </m.h1>
              <m.p variants={itemVariants} style={{
                color: '#a0a0a0',
                fontSize: '1.25rem',
                maxWidth: '36rem',
                marginBottom: '3rem',
                lineHeight: 1.6,
              }}>
                Experience the future of hardware valuation. Get instant AI quotes for your used devices and buy verified refurbished tech.
              </m.p>
              
              <m.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center md:justify-start">
                <Link href="/quote" style={{ textDecoration: 'none' }} className="w-full sm:w-auto">
                  <MagneticButton className="btn-primary w-full sm:w-auto" style={{ padding: '16px 40px', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(212,175,55,0.3)', width: '100%', justifyContent: 'center' }}>
                    Sell Phone
                  </MagneticButton>
                </Link>
                <Link href="/buy" style={{ textDecoration: 'none' }} className="w-full sm:w-auto">
                  <MagneticButton className="glass-panel w-full sm:w-auto" style={{ padding: '16px 40px', fontSize: '1.1rem', color: '#fff', borderRadius: '8px', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                    Buy Phone
                  </MagneticButton>
                </Link>
              </m.div>
            </m.div>

            {/* Right Content - 3D CSS Phone */}
            <m.div 
              className="w-full md:flex-1 hidden md:block"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <FloatingPhone />
            </m.div>
          </div>

          <m.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8 }}>
            <SlidingBanner />
          </m.div>
        </div>
      </section>

      {/* Stats - Glass Bar */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '2rem 0', position: 'relative', zIndex: 20 }}>
        <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <div className="glass-panel grid grid-cols-2 md:grid-cols-4 gap-6 text-center rounded-2xl p-6 md:p-10">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-gradient-animated" style={{ fontSize: s.value.length > 6 ? '1.8rem' : '2.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'inline-block' }}>{s.value}</p>
                <p style={{ fontSize: '0.85rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </m.div>
      </section>

      {/* How it works */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '8rem 0' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div variants={wordRevealVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>HOW IT WORKS</p>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 300, color: '#fff', marginBottom: '4rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {"Three simple steps".split(" ").map((word, i) => (
                <m.span key={i} variants={{ hidden: { opacity: 0.2, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
                  {word}
                </m.span>
              ))}
            </h2>
          </m.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            {STEPS.map((s, i) => (
              <m.div key={s.num} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} style={{ textAlign: 'center' }} className="glass-card">
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: '#d4af37',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                }}>{s.num}</div>
                <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem', fontSize: '1.25rem' }}>{s.title}</h3>
                <p style={{ color: '#a0a0a0', fontSize: '0.95rem', lineHeight: 1.6 }}>{s.desc}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Selling Models */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '0 0 8rem 0' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <TopSellingModels />
          </m.div>
        </div>
      </section>

      {/* Why Us */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '0 0 8rem 0' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <WhyUs />
          </m.div>
        </div>
      </section>

      {/* Customer Stories */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '0 0 8rem 0', overflow: 'hidden' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <CustomerStories />
          </m.div>
        </div>
      </section>

      {/* FAQs */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '0 0 8rem 0' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <FAQs />
          </m.div>
          
          {/* Warranty Claim */}
          <div className="mb-16">
            <WarrantyClaim />
          </div>
        </div>
      </section>

      {/* Brands */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '0 0 8rem 0', position: 'relative' }}>
        <div className="perspective-container" style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>SELECT YOUR DEVICE</p>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 300, color: '#fff', marginBottom: '4rem' }}>
              We buy all major brands
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
              {BRANDS.map((brand) => (
                <TiltCard key={brand} href={`/quote?brand=${brand}`}>
                  <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '100%' }}>
                    <img 
                      src={BRAND_LOGOS[brand]} 
                      alt={brand} 
                      style={{ 
                        ...getBrandLogoStyle(brand),
                        height: '40px', 
                        width: 'auto', 
                        maxWidth: '80px',
                      }} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <p style={{ fontWeight: 600, color: '#fff', fontSize: '1rem', letterSpacing: '0.5px' }}>{brand}</p>
                  </div>
                </TiltCard>
              ))}
            </div>
          </m.div>
        </div>
      </section>
      </div>
    </div>
    </LazyMotion>
  );
}
