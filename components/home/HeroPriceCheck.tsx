'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { FEATURED_MODELS, formatInr, modelImage, quoteHref, shortModelName, storageLabel } from './featuredModels';
import { getUpto, useFeaturedPrices } from './useFeaturedPrices';
import { loadCatalog, searchCatalog, type CatalogModel } from './catalogSearch';
import PopularStrip from './PopularStrip';

const SHOWCASE = FEATURED_MODELS.slice(0, 5);
const SHOWCASE_MS = 4200;
const COUNT_MS = 900;
const PLACEHOLDER = '/images/placeholder-phone.svg';

type Picked = { brand: string; model: string; storages: string[] };
type PriceState = { status: 'loading' | 'ok' | 'none' | 'error'; value?: number };

function usePrefersMotion() {
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

/** Counts from 0 to target whenever runKey changes; jumps straight there without motion. */
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
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, runKey, animate]);
  return value;
}

/**
 * The hero's working price check: search the real catalog, pick a storage,
 * see the server's Get upto for that exact variant, continue into /quote at
 * the same model and storage. Until the visitor picks a phone, the card
 * shows popular models with their live prices.
 */
export default function HeroPriceCheck({ intro, footnote }: { intro: ReactNode; footnote: ReactNode }) {
  const motion = usePrefersMotion();
  const { prices: featuredPrices, settled: featuredSettled } = useFeaturedPrices();

  const [catalog, setCatalog] = useState<CatalogModel[] | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [storage, setStorage] = useState('');
  const [price, setPrice] = useState<PriceState>({ status: 'loading' });
  const [showcase, setShowcase] = useState(0);
  const [touched, setTouched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const ensureCatalog = useCallback(() => {
    if (catalog) return;
    loadCatalog()
      .then((c) => {
        setCatalog(c);
        setCatalogFailed(false);
      })
      .catch(() => setCatalogFailed(true));
  }, [catalog]);

  // Fetch the (small) model list once the page is idle, so typing is instant.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const t = w.requestIdleCallback ? w.requestIdleCallback(ensureCatalog) : window.setTimeout(ensureCatalog, 2500);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(t);
    };
  }, [ensureCatalog]);

  // Popular models rotate through the card until the visitor engages.
  useEffect(() => {
    if (!motion || touched || picked) return;
    let visible = true;
    const observer = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (cardRef.current) observer.observe(cardRef.current);
    const timer = window.setInterval(() => {
      if (visible && !document.hidden) setShowcase((i) => (i + 1) % SHOWCASE.length);
    }, SHOWCASE_MS);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [motion, touched, picked]);

  // Price for the picked variant, from the same server figure the quote page shows.
  useEffect(() => {
    if (!picked || !storage) return;
    let cancelled = false;
    setPrice({ status: 'loading' });
    getUpto({ brand: picked.brand, model: picked.model, storage })
      .then((v) => !cancelled && setPrice(v ? { status: 'ok', value: v } : { status: 'none' }))
      .catch(() => !cancelled && setPrice({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [picked, storage]);

  const results = useMemo(() => (catalog ? searchCatalog(catalog, query) : []), [catalog, query]);

  const choose = (m: { brand: string; model: string; storages: string[] }, preferredStorage?: string, scroll = false) => {
    setPicked({ brand: m.brand, model: m.model, storages: m.storages });
    setStorage(preferredStorage && m.storages.includes(preferredStorage) ? preferredStorage : m.storages[0]);
    setQuery(shortModelName(m.brand, m.model));
    setOpen(false);
    setTouched(true);
    if (scroll && cardRef.current && window.matchMedia('(max-width: 1023px)').matches) {
      cardRef.current.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'center' });
    }
  };

  const clear = () => {
    setQuery('');
    setPicked(null);
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // What the card shows: the visitor's pick, or the current popular model.
  const featured = SHOWCASE[showcase];
  const shown = picked
    ? {
        key: `${picked.model}|${storage}`,
        brand: picked.brand,
        model: picked.model,
        storage,
        status: price.status,
        value: price.value,
      }
    : {
        key: featured.id,
        brand: featured.brand,
        model: featured.catalogModel,
        storage: featured.catalogStorage,
        status: (featuredPrices[featured.id] ? 'ok' : featuredSettled ? 'none' : 'loading') as PriceState['status'],
        value: featuredPrices[featured.id],
      };
  const counted = useCountUp(shown.status === 'ok' ? shown.value : undefined, shown.key, motion);
  const listOpen = open && query.trim().length > 0;

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-14">
      <div className="min-w-0 lg:pt-10">
        {intro}

        <div className="relative mt-7" role="search">
          <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-semibold text-foreground">
            Which phone do you have?
          </label>
          <div className="pc-search group relative flex items-center rounded-2xl border border-border bg-background shadow-token-md transition-[border-color,box-shadow] focus-within:border-gold">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 h-5 w-5 text-muted" />
            <input
              ref={inputRef}
              id={`${listId}-input`}
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. iPhone 13, Galaxy S23"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls={`${listId}-list`}
              aria-autocomplete="list"
              aria-activedescendant={listOpen && results[active] ? optionId(active) : undefined}
              value={query}
              onFocus={() => {
                ensureCatalog();
                setTouched(true);
                setOpen(true);
              }}
              onPointerDown={ensureCatalog}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={onKeyDown}
              className="h-16 w-full rounded-2xl !border-0 !bg-transparent !py-0 pl-12 pr-12 !text-[1.05rem] text-foreground !shadow-none outline-none placeholder:text-muted md:h-[4.25rem] md:!text-[1.1rem]"
            />
            {query && (
              <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>

          {listOpen && (
            <ul
              id={`${listId}-list`}
              role="listbox"
              aria-label="Matching phones"
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-2xl border border-border bg-background p-1.5 shadow-token-lg"
            >
              {!catalog && !catalogFailed && (
                <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading phones…
                </li>
              )}
              {catalogFailed && (
                <li className="px-3 py-3 text-sm text-muted">
                  Couldn&apos;t load the phone list.{' '}
                  <Link href="/quote" className="font-semibold">
                    Pick your brand instead
                  </Link>
                </li>
              )}
              {catalog && results.length === 0 && (
                <li className="px-3 py-3 text-sm text-muted">
                  No phone matches &ldquo;{query}&rdquo;.{' '}
                  <Link href="/quote" className="font-semibold">
                    Browse by brand
                  </Link>
                </li>
              )}
              {results.map((m, i) => (
                <li
                  key={`${m.brand}|${m.model}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(m, undefined, true)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? 'bg-surface' : ''}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                    <ModelThumb src={modelImage(m.model)} size={40} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] font-semibold text-foreground">{shortModelName(m.brand, m.model)}</span>
                    <span className="block text-xs text-muted">
                      {m.brand} · {m.storages.length} {m.storages.length === 1 ? 'variant' : 'variants'}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 hidden lg:block">{footnote}</div>
      </div>

      {/* The price card */}
      <div ref={cardRef} className="relative mx-auto w-full max-w-[440px] lg:mx-0 lg:justify-self-end">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--gold)_20%,transparent),transparent)]" />
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-5 shadow-token-lg sm:p-6" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-gold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="hero-ping absolute inline-flex h-full w-full rounded-full bg-gold" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
              </span>
              {picked ? 'Your phone' : 'Live price · popular'}
            </span>
            {!picked && (
              <span className="flex gap-1" aria-hidden="true">
                {SHOWCASE.map((m, i) => (
                  <span key={m.id} className={`h-1.5 rounded-full transition-all duration-500 ${i === showcase ? 'w-5 bg-gold' : 'w-1.5 bg-border'}`} />
                ))}
              </span>
            )}
          </div>

          <div key={shown.key} className="pc-swap mt-5 flex items-center gap-5">
            <span className="flex h-[132px] w-[104px] shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-black/5 sm:h-[150px] sm:w-[118px]">
              <span className="pc-float block">
                <ModelThumb src={modelImage(shown.model)} size={112} priority />
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">{shown.brand}</p>
              <p className="font-display text-[1.6rem] font-medium leading-[1.1] tracking-[-0.01em] text-foreground sm:text-[1.8rem]">
                {shortModelName(shown.brand, shown.model)}
              </p>
              {!picked && <p className="mt-1 text-sm text-muted">{storageLabel(shown.storage)}</p>}
            </div>
          </div>

          {picked && picked.storages.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Storage</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Storage">
                {picked.storages.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={s === storage}
                    onClick={() => setStorage(s)}
                    className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                      s === storage ? 'border-gold bg-gold text-on-gold' : 'border-border bg-background text-foreground hover:border-gold'
                    }`}
                  >
                    {storageLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {picked && picked.storages.length === 1 && <p className="mt-3 text-sm text-muted">{storageLabel(storage)}</p>}

          <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Get upto</p>
            <div className="mt-1 flex min-h-[3.1rem] items-center">
              {shown.status === 'ok' ? (
                <p className="tabular text-[2.6rem] font-bold leading-none tracking-[-0.02em] text-gold sm:text-[2.9rem]">{formatInr(counted)}</p>
              ) : shown.status === 'loading' ? (
                <span className="pc-shimmer block h-10 w-44 rounded-lg">
                  <span className="sr-only">Fetching today&apos;s price</span>
                </span>
              ) : shown.status === 'none' ? (
                <p className="text-base font-semibold text-foreground">We&apos;ll price this one after a few questions.</p>
              ) : (
                <p className="text-base font-semibold text-foreground">Couldn&apos;t fetch the price just now.</p>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">For a phone in perfect condition with box and bill. A few quick questions give your exact price.</p>
          </div>

          <Link href={quoteHref(shown.brand, shown.model, shown.storage)} className="btn-cta group mt-5 w-full no-underline">
            {picked ? 'Get my exact price' : `Sell this ${shortModelName(shown.brand, shown.model)}`}
            <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          {!picked && (
            <button type="button" onClick={() => inputRef.current?.focus()} className="mt-3 w-full text-center text-sm font-semibold text-gold hover:text-gold-hover">
              Not your phone? Search yours above
            </button>
          )}
        </div>
      </div>

      <div className="lg:hidden">{footnote}</div>

      <div className="min-w-0 lg:col-span-2">
        <PopularStrip onPick={(m) => choose({ brand: m.brand, model: m.catalogModel, storages: catalog?.find((c) => c.brand === m.brand && c.model === m.catalogModel)?.storages ?? [m.catalogStorage] }, m.catalogStorage, true)} prices={featuredPrices} settled={featuredSettled} />
      </div>
    </div>
  );
}

function ModelThumb({ src, size, priority }: { src: string; size: number; priority?: boolean }) {
  const [current, setCurrent] = useState(src);
  useEffect(() => setCurrent(src), [src]);
  return (
    <Image
      src={current}
      alt=""
      width={size}
      height={size}
      priority={priority}
      unoptimized={current.endsWith('.svg')}
      onError={() => setCurrent(PLACEHOLDER)}
      className="h-auto max-h-full w-auto object-contain"
      style={{ maxWidth: size, maxHeight: size }}
    />
  );
}
