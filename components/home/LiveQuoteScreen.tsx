'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { HERO_SCREEN_MODELS, formatInr } from './featuredModels';
import { useFeaturedPrices } from './useFeaturedPrices';

const CYCLE_MS = 3800;
const COUNT_MS = 950;
const CHECKS = ['Screen', 'Body', 'Functions'];

/** Animates from 0 to target whenever runKey changes; static when reduced motion. */
function useCountUp(target: number | undefined, runKey: string, animate: boolean) {
  const [value, setValue] = useState(target ?? 0);
  useEffect(() => {
    if (!target) return;
    if (!animate) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, runKey, animate]);
  return value;
}

/**
 * The hero phone's screen: cycles through popular models and shows each
 * one's server "Get upto" price. Until the server answers it shows a
 * shimmer; a model without a price says "Check your price".
 */
export default function LiveQuoteScreen() {
  const { prices, settled } = useFeaturedPrices();
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAnimate(!reduced.matches);
    if (reduced.matches) return;

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (rootRef.current) observer.observe(rootRef.current);

    const timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      setIndex((i) => (i + 1) % HERO_SCREEN_MODELS.length);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  const model = HERO_SCREEN_MODELS[index];
  const price = prices[model.id];
  const shown = useCountUp(price, model.id, animate);

  return (
    <div ref={rootRef} className="flex h-full flex-col px-[7%] pb-[7%] pt-[5%] text-[#f5f2ea]">
      <div className="flex items-center justify-between text-[0.62em] font-semibold text-white/80">
        <span className="tabular">9:41</span>
        <span className="h-[1.6em] w-[30%] rounded-full bg-black" />
        <span className="flex gap-[0.25em]">
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[1.2em] rounded-[0.2em] bg-white/70" />
        </span>
      </div>

      <p className="mt-[7%] text-[0.62em] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Fhoneify</p>
      <p className="font-display mt-[3%] text-[1.45em] leading-[1.1] text-white">Your instant quote</p>

      <div key={model.id} className="lqs-swap mt-[7%] flex items-center gap-[0.75em] rounded-[0.9em] border border-white/10 bg-white/[0.05] p-[0.7em]">
        <span className="relative flex h-[3.4em] w-[3.4em] shrink-0 items-center justify-center overflow-hidden rounded-[0.7em] bg-white">
          <Image src={model.image} alt="" width={96} height={96} className="h-[88%] w-auto object-contain" priority={index === 0} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.8em] font-semibold">{model.name}</span>
          <span className="text-[0.64em] text-white/55">{model.storageLabel}</span>
        </span>
      </div>

      <ul key={`${model.id}-checks`} className="mt-[6%] flex flex-col gap-[0.65em]">
        {CHECKS.map((label, i) => (
          <li key={label} className="flex items-center gap-[0.65em] text-[0.7em]">
            <span className="lqs-tick flex h-[1.7em] w-[1.7em] items-center justify-center rounded-full bg-[#d4af37] text-[#15110a]" style={{ animationDelay: `${180 + i * 160}ms` }}>
              <Check className="h-[1em] w-[1em]" strokeWidth={3} />
            </span>
            <span className="text-white/85">{label} checked</span>
          </li>
        ))}
      </ul>

      <div className="mt-[7%] rounded-[0.9em] border border-[#d4af37]/30 bg-[linear-gradient(140deg,rgba(212,175,55,0.16),rgba(212,175,55,0.03))] p-[0.85em]">
        <p className="text-[0.58em] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/90">Get upto</p>
        <p className="tabular mt-[0.25em] h-[1.35em] text-[1.55em] font-bold leading-none text-white" aria-live="off">
          {price ? (
            formatInr(shown)
          ) : settled ? (
            <span className="text-[0.62em] font-semibold text-white/80">Check your price</span>
          ) : (
            <span className="lqs-shimmer block h-full w-[70%] rounded-[0.3em]" />
          )}
        </p>
      </div>

      <div className="mt-auto">
        <div className="mb-[0.9em] flex justify-center gap-[0.4em]">
          {HERO_SCREEN_MODELS.map((m, i) => (
            <span key={m.id} className={`h-[0.4em] rounded-full transition-all duration-500 ${i === index ? 'w-[1.6em] bg-[#d4af37]' : 'w-[0.4em] bg-white/25'}`} />
          ))}
        </div>
        <div className="flex h-[2.7em] items-center justify-center rounded-[0.8em] bg-[#d4af37] text-[0.72em] font-bold text-[#15110a]">
          Schedule free pickup
        </div>
      </div>
    </div>
  );
}
