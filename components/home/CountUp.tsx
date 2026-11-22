'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A whole number that counts up once when it scrolls into view. The final
 * value is server-rendered, so it is correct without JS and for reduced motion.
 */
export default function CountUp({ value, prefix = '', suffix = '', durationMs = 1400 }: { value: number; prefix?: string; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    // Already on screen at load: leave the final number alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tabular">
      {prefix}
      {shown.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
