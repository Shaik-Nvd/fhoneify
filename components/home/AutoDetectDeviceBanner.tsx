'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/format';

interface DetectedDeviceData {
  brand: string;
  model: string;
  storage: string;
  startingPrice?: number | null;
  confidence?: string;
}

export default function AutoDetectDeviceBanner() {
  const [device, setDevice] = useState<DetectedDeviceData | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

        // Auto-detect is strictly for Apple iPhone users.
        // Android browsers freeze User-Agent strings and share ambiguous GPU IDs across hundreds of models,
        // so Android devices are excluded to ensure 100% accuracy and avoid false matches.
        const isIPhone = /iPhone/i.test(ua);
        if (!isIPhone) {
          if (!cancelled) setLoading(false);
          return;
        }

        const screenInfo =
          typeof window !== 'undefined'
            ? {
                width: window.screen.width,
                height: window.screen.height,
                devicePixelRatio: window.devicePixelRatio || 1,
              }
            : undefined;

        // Extract WebGL Renderer info (unmasks Apple GPU / Adreno / Mali details)
        let webglRenderer = '';
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as any);
            if (gl) {
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
              if (debugInfo) {
                webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
              }
            }
          } catch {
            // ignore WebGL query error
          }
        }

        const payload = {
          userAgent: ua,
          screen: screenInfo,
          webglRenderer,
        };

        // Query detection: try local Next.js App Router route first (guaranteed 0 latency without Render cold start),
        // fallback to Express API route.
        let detected: DetectedDeviceData | null = null;
        try {
          const localRes = await fetch('/api/detect-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await localRes.json();
          if (json?.success && json.data) {
            detected = json.data;
          }
        } catch {
          // fallback to Express
          const expressRes = await api.post('/api/quote/detect-device', payload).catch(() => null);
          if (expressRes?.data?.success && expressRes.data.data) {
            detected = expressRes.data.data;
          }
        }

        if (cancelled || !detected) {
          if (!cancelled) setLoading(false);
          return;
        }

        setDevice(detected);

        // Fetch starting price if not returned directly
        if (typeof detected.startingPrice === 'number' && detected.startingPrice > 0) {
          setPrice(detected.startingPrice);
        } else {
          const priceRes = await api
            .post('/api/quote/get-upto', {
              devices: [
                {
                  brand: detected.brand,
                  model: detected.model,
                  storage: detected.storage,
                },
              ],
            })
            .catch(() => null);

          if (
            !cancelled &&
            priceRes?.data?.success &&
            Array.isArray(priceRes.data.data) &&
            priceRes.data.data[0]
          ) {
            const p = priceRes.data.data[0].startingPrice;
            if (typeof p === 'number' && p > 0) {
              setPrice(p);
            }
          }
        }
      } catch {
        // Silently do nothing if detection fails or client is desktop
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    detect();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !device) {
    return null;
  }

  const modelSlug = device.model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const quoteUrl =
    device.brand === 'Apple'
      ? `/quote?brand=${encodeURIComponent(device.brand)}&model=${encodeURIComponent(device.model)}&stage=model&step=1`
      : `/quote?brand=${encodeURIComponent(device.brand)}&model=${encodeURIComponent(device.model)}&storage=${encodeURIComponent(device.storage)}&stage=storage&step=2`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-sm transition-all hover:border-gold/50 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Phone thumbnail */}
            <div className="relative flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/10 p-1 ring-1 ring-border/50 sm:h-18 sm:w-16">
              {!imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/images/models/${modelSlug}.png`}
                  alt={device.model}
                  className="h-full w-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Smartphone className="h-8 w-8 text-gold" />
              )}
            </div>

            {/* Device Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.8rem] font-medium text-muted">Sell This Device</span>
                <span className="inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-[0.68rem] font-semibold text-gold">
                  Auto-detected
                </span>
              </div>
              <h3 className="mt-0.5 text-base font-bold text-foreground sm:text-lg">
                {device.brand === 'Apple'
                  ? device.model
                  : `${device.model} (${device.storage})`}
              </h3>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-muted">Get Upto</span>
                <span className="text-lg font-extrabold text-gold sm:text-xl">
                  {price ? formatCurrency(price) : 'Best Price'}
                </span>
              </div>
            </div>
          </div>

          {/* Sell Now Action Button */}
          <Link
            href={quoteUrl}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-background shadow transition-all hover:brightness-110 active:scale-95 sm:px-6 sm:py-3"
          >
            <span>Sell Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
