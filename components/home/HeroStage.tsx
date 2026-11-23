'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Pause, Play, Truck, Wallet } from 'lucide-react';
import HeroPhone from './HeroPhone';
import { FEATURED_MODELS, formatInr, modelImage, type FeaturedModel } from './featuredModels';
import { useFeaturedPrices } from './useFeaturedPrices';

const N = FEATURED_MODELS.length;
const AUTOPLAY_MS = 3600;
const IDLE_AFTER_INPUT_MS = 6000;
const COUNT_MS = 850;

// Arc slots for the model rail, by distance from the centre. x and y are in
// rail units (--ru), r in degrees. Beyond slot 3 a puck is hidden.
const SLOTS = [
  { x: 0, y: 0, s: 1, r: 0, o: 1 },
  { x: 1.02, y: 0.16, s: 0.76, r: 7, o: 1 },
  { x: 1.9, y: 0.5, s: 0.62, r: 14, o: 0.85 },
  { x: 2.64, y: 0.98, s: 0.5, r: 21, o: 0.4 },
  { x: 3.2, y: 1.55, s: 0.42, r: 26, o: 0 },
];

/** Signed shortest distance from the selected index, in -N/2..N/2. */
const offset = (j: number, sel: number) => {
  let k = (j - sel) % N;
  if (k > N / 2) k -= N;
  if (k < -N / 2) k += N;
  return k;
};

/** The big word behind the phone: the family name people know. */
const familyWord = (m: FeaturedModel) => (m.brand === 'Apple' ? 'iPhone' : m.name.split(' ')[0]);

function useMotionAllowed() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOk(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return ok;
}

/** Counts up to the server price of the phone on screen. The figure is tied to the phone it belongs
 * to: when the phone changes, the old phone's price is never rendered, not even for one frame. */
function useCountTo(target: number | undefined, animate: boolean, key: string) {
  const [state, setState] = useState<{ key: string; value: number }>({ key, value: target ?? 0 });
  useEffect(() => {
    if (!target) return;
    if (!animate) { setState({ key, value: target }); return; }
    const from = target * 0.85;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setState({ key, value: from + (target - from) * (1 - Math.pow(1 - t, 3)) });
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, key]);
  if (!target) return 0;
  // A render for a new phone before its first animation frame shows that phone's own starting figure.
  if (state.key !== key) return animate ? target * 0.85 : target;
  return state.value;
}

/** A word split into letters that rise in (or out) one after another. */
function Letters({ text, mode, dir }: { text: string; mode: 'static' | 'in' | 'out'; dir: 1 | -1 }) {
  let i = 0;
  return (
    <span className={`hero-name-layer ${mode === 'out' ? 'is-out' : ''}`} style={{ '--dir': dir } as React.CSSProperties}>
      {text.split(' ').map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap">
          {Array.from(word).map((ch) => {
            const n = i++;
            return (
              <span key={n} className={`inline-block ${mode === 'static' ? '' : mode === 'in' ? 'ltr-in' : 'ltr-out'}`} style={{ '--i': n } as React.CSSProperties}>
                {ch}
              </span>
            );
          })}
          {w < text.split(' ').length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

/**
 * Hero: the headline names the phone in the centre of the stage, the phone's
 * screen shows that model's live Get upto from the server, and the rail of
 * real model photos lets visitors flip through popular phones. One action:
 * Get instant quote.
 */
export default function HeroStage() {
  const motion = useMotionAllowed();
  const { prices, settled } = useFeaturedPrices();
  const [sel, setSel] = useState(0);
  const [prev, setPrev] = useState<{ index: number; dir: 1 | -1; key: number } | null>(null);
  const [changes, setChanges] = useState(0);
  const [playing, setPlaying] = useState(true);
  const lastInput = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const nameBoxRef = useRef<HTMLSpanElement>(null);
  const [nameScale, setNameScale] = useState(1);
  const prevK = useRef<number[]>(FEATURED_MODELS.map((_, j) => offset(j, 0)));
  const drag = useRef<{ x: number; y: number } | null>(null);

  const model = FEATURED_MODELS[sel];
  const price = prices[model.id];
  const counted = useCountTo(price, motion, model.id);

  const selRef = useRef(0);
  const go = useCallback((to: number, dir: 1 | -1, fromUser: boolean) => {
    if (fromUser) lastInput.current = Date.now();
    const cur = selRef.current;
    const next = ((to % N) + N) % N;
    if (next === cur) return;
    selRef.current = next;
    setPrev({ index: cur, dir, key: Date.now() });
    setChanges((c) => c + 1);
    setSel(next);
  }, []);
  const step = useCallback((d: 1 | -1, fromUser = true) => go(selRef.current + d, d, fromUser), [go]);

  // The outgoing name letters leave, then are removed.
  useEffect(() => {
    if (!prev) return;
    const t = window.setTimeout(() => setPrev((p) => (p && p.key === prev.key ? null : p)), 700);
    return () => window.clearTimeout(t);
  }, [prev]);

  // Autoplay: only with motion allowed, while the stage is mostly in view,
  // the tab is visible, and nobody has touched it for a few seconds.
  useEffect(() => {
    if (!motion || !playing) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    if (stageRef.current) io.observe(stageRef.current);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || Date.now() - lastInput.current < IDLE_AFTER_INPUT_MS) return;
      step(1, false);
    }, AUTOPLAY_MS);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
    };
  }, [motion, playing, step]);

  // Long names shrink to stay on one line, so the headline never reflows.
  useLayoutEffect(() => {
    const box = nameBoxRef.current;
    if (!box) return;
    const measure = () => {
      const avail = box.parentElement?.clientWidth ?? box.clientWidth;
      const canvas = document.createElement('canvas').getContext('2d');
      if (!canvas) return;
      const cs = getComputedStyle(box);
      canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const w = canvas.measureText(model.name).width * 1.04;
      setNameScale(w > avail ? avail / w : 1);
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [model.name]);

  const ks = FEATURED_MODELS.map((_, j) => offset(j, sel));
  const jumps = ks.map((k, j) => Math.abs(k - prevK.current[j]) > 2);
  useEffect(() => {
    prevK.current = ks;
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) step(dx < 0 ? 1 : -1);
  };

  const prevModel = prev ? FEATURED_MODELS[prev.index] : null;
  const dir = prev?.dir ?? 1;
  const animateIn = motion && changes > 0;

  const screen = (
    <div className="flex h-full flex-col px-[7%] pb-[7%] pt-[5%] text-[#f5f2ea]">
      <div className="flex items-center justify-between text-[0.62em] font-semibold text-white/80">
        <span className="tabular">9:41</span>
        <span className="h-[1.6em] w-[30%] rounded-full bg-black" />
        <span className="flex gap-[0.25em]">
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[1.2em] rounded-[0.2em] bg-white/70" />
        </span>
      </div>
      <p className="mt-[8%] text-[0.62em] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Fhoneify</p>
      <p className="font-display mt-[3%] text-[1.25em] leading-[1.1] text-white/80">Today&apos;s price</p>

      <div key={model.id} className={animateIn ? 'lqs-swap' : ''}>
        <p className="font-display mt-[6%] text-[1.6em] leading-[1.05] text-white">{model.name}</p>
        <p className="mt-[2%] text-[0.68em] text-white/55">{model.storageLabel}</p>
      </div>

      <ul className="mt-[8%] flex flex-col gap-[0.7em]">
        {[
          ['Screen', 'Flawless'],
          ['Body', 'Like new'],
          ['Box & bill', 'Included'],
        ].map(([k, v], i) => (
          <li key={`${model.id}-${k}`} className="flex items-center gap-[0.6em] text-[0.68em]">
            <span
              className={`flex h-[1.65em] w-[1.65em] items-center justify-center rounded-full bg-[#d4af37] text-[#15110a] ${animateIn ? 'lqs-tick' : ''}`}
              style={{ animationDelay: `${160 + i * 140}ms` }}
            >
              <Check className="h-[1em] w-[1em]" strokeWidth={3} />
            </span>
            <span className="text-white/60">{k}</span>
            <span className="ml-auto font-medium text-white/90">{v}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[9%] rounded-[0.9em] border border-[#d4af37]/35 bg-[linear-gradient(140deg,rgba(212,175,55,0.18),rgba(212,175,55,0.04))] p-[0.9em]">
        <p className="text-[0.56em] font-semibold uppercase tracking-[0.2em] text-[#d4af37]">Get upto</p>
        <p className="tabular mt-[0.25em] flex h-[1.3em] items-center text-[2.05em] font-bold leading-none text-white">
          {price ? formatInr(counted) : settled ? <span className="text-[0.5em] font-semibold text-white/80">Price in the quote</span> : <span className="lqs-shimmer block h-[0.9em] w-[70%] rounded-[0.3em]" />}
        </p>
        <p className="mt-[0.5em] text-[0.52em] leading-snug text-white/50">Perfect condition, with box and bill</p>
      </div>

      <div className="flex flex-1 items-center justify-center py-[6%]">
        <span key={`ph-${model.id}`} className={`relative flex h-[7em] w-[7em] items-center justify-center ${animateIn ? 'lqs-swap' : ''}`}>
          <span className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.35),transparent)]" />
          <Image src={modelImage(model.catalogModel)} alt="" width={128} height={128} priority={sel === 0} className="relative h-[92%] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
        </span>
      </div>

      <div>
        <p className="mb-[0.7em] text-center text-[0.56em] text-white/45">A few questions give your exact price</p>
        <div className="flex h-[2.7em] items-center justify-center gap-[0.4em] rounded-[0.8em] bg-[#d4af37] text-[0.72em] font-bold text-[#15110a]">
          Get exact price <ArrowRight className="h-[1.1em] w-[1.1em]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-3 sm:gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-4">
      {/* Copy */}
      <div className="relative z-10 min-w-0">
        <p className="hero-drop flex items-center gap-2 text-sm font-semibold text-gold" style={{ '--d': '0ms' } as React.CSSProperties}>
          <span className="relative flex h-2 w-2">
            <span className="hero-ping absolute inline-flex h-full w-full rounded-full bg-gold" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          Now buying phones in Bengaluru
        </p>

        <h1 id="hero-title" className="font-display mt-3 text-[2.3rem] font-medium leading-[1.04] tracking-[-0.035em] text-foreground sm:mt-5 sm:text-[3.5rem] lg:text-[clamp(3rem,7.2svh,4.3rem)]">
          <span className="sr-only">Sell your old phone. Get paid at your door.</span>
          <span aria-hidden="true" className="hero-line block">
            <span className="hero-line-in block" style={{ '--d': '60ms' } as React.CSSProperties}>
              Sell your old
            </span>
          </span>
          <span aria-hidden="true" className="hero-line block">
            <span className="hero-line-in block" style={{ '--d': '140ms' } as React.CSSProperties}>
              <span ref={nameBoxRef} className="hero-name block whitespace-nowrap" style={{ fontSize: `${nameScale}em` }}>
                {prevModel && motion && <Letters key={`out-${prev?.key}`} text={prevModel.name} mode="out" dir={dir} />}
                <Letters key={`in-${model.id}`} text={model.name} mode={animateIn ? 'in' : 'static'} dir={dir} />
              </span>
            </span>
          </span>
          <span aria-hidden="true" className="hero-line block">
            <span className="hero-line-in hero-gold-text block italic" style={{ '--d': '220ms' } as React.CSSProperties}>
              Get paid at your door.
            </span>
          </span>
        </h1>

        <p className="hero-rise hero-short-hide mt-3 max-w-[30rem] text-[0.98rem] leading-snug text-muted sm:mt-5 sm:text-lg sm:leading-relaxed" style={{ '--d': '320ms' } as React.CSSProperties}>
          See what your phone is worth in a few taps. No sign-up, and no obligation to sell.
        </p>

        <div className="hero-rise mt-4 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:gap-6" style={{ '--d': '400ms' } as React.CSSProperties}>
          <Link href="/quote" className="btn-cta cta-shine group no-underline">
            <span className="relative z-[1]">Get instant quote</span>
            <ArrowRight aria-hidden="true" className="relative z-[1] h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <ul className="hero-short-hide flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <li className="flex items-center gap-1.5">
              <Truck aria-hidden="true" className="h-4 w-4 text-gold" />
              Free doorstep pickup
            </li>
            <li className="flex items-center gap-1.5">
              <Wallet aria-hidden="true" className="h-4 w-4 text-gold" />
              Paid via UPI at pickup
            </li>
          </ul>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="hero-rise relative -mx-4 touch-pan-y select-none [container-type:inline-size] sm:mx-0"
        style={{ '--d': '200ms' } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        aria-roledescription="carousel"
        aria-label="Popular phones and their prices"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-rings absolute left-1/2 top-[40%] aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2" />
          {/* Family word behind the phone */}
          <div className="absolute inset-x-0 top-[30%] grid place-items-center">
            {prevModel && motion && familyWord(prevModel) !== familyWord(model) && (
              <span key={`w-out-${prev?.key}`} className="hero-family is-out" style={{ '--dir': dir } as React.CSSProperties}>
                {familyWord(prevModel)}
              </span>
            )}
            <span key={`w-${familyWord(model)}`} className={`hero-family ${animateIn ? 'is-in' : ''}`} style={{ '--dir': dir } as React.CSSProperties}>
              {familyWord(model)}
            </span>
          </div>
          {changes > 0 && motion && <div key={changes} className="hero-pulse absolute left-1/2 top-[40%] aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
        </div>

        {/* Outlined index */}
        <div aria-hidden="true" className="pointer-events-none absolute left-4 top-0 grid sm:left-2">
          <span key={`c-${sel}`} className={`hero-count ${animateIn ? 'is-in' : ''}`}>
            {String(sel + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="relative pt-1 sm:pt-4">
          <HeroPhone screen={screen} />
        </div>

        {/* Rail of real model photos on an arc */}
        {/* Hidden on small phones so the hero fits one screen; arrows, swipe and autoplay still change phone. */}
        <div className="relative mx-auto -mt-6 hidden h-[var(--rail-h)] w-full max-w-[560px] sm:block [--rail-h:132px] [--ru:62px] sm:[--rail-h:110px] sm:[--ru:70px] [@media(min-height:860px)]:sm:[--rail-h:150px] [@media(min-height:860px)]:sm:[--ru:84px]">
          {FEATURED_MODELS.map((m, j) => {
            const k = ks[j];
            const slot = SLOTS[Math.min(Math.abs(k), SLOTS.length - 1)];
            const sign = k < 0 ? -1 : 1;
            const hidden = Math.abs(k) > 3;
            return (
              <button
                key={m.id}
                type="button"
                tabIndex={hidden ? -1 : 0}
                aria-hidden={hidden || undefined}
                aria-label={`Show ${m.name}`}
                aria-current={k === 0 || undefined}
                onClick={() => k !== 0 && go(sel + k, k > 0 ? 1 : -1, true)}
                className={`rail-puck absolute left-1/2 top-0 ${jumps[j] ? 'no-anim' : ''} ${k === 0 ? 'is-active' : ''}`}
                style={{
                  transform: `translate(calc(-50% + ${sign * slot.x} * var(--ru)), calc(${slot.y} * var(--ru))) rotate(${sign * slot.r}deg) scale(${slot.s})`,
                  opacity: slot.o,
                  zIndex: 10 - Math.abs(k),
                  pointerEvents: hidden ? 'none' : undefined,
                }}
              >
                <span className="rail-puck-face">
                  <Image src={modelImage(m.catalogModel)} alt="" width={96} height={96} className="h-[86%] w-auto object-contain" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="relative mt-2 flex items-center justify-center gap-2.5 sm:mt-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous phone" className="hero-ctl">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <p className="tabular min-w-[6.5rem] text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted" aria-live="polite">
            <span className="sr-only">{model.name}, </span>
            {String(sel + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
          </p>
          <button type="button" onClick={() => step(1)} aria-label="Next phone" className="hero-ctl">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          {motion && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={!playing}
              aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
              className="hero-ctl ml-1"
            >
              {playing ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
