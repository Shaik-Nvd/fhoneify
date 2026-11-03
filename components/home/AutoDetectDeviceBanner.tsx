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
        let clientHintsModel = '';
        let clientHintsPlatform = '';

        // Query Chromium High-Entropy Client Hints if available
        if (typeof navigator !== 'undefined' && (navigator as any).userAgentData?.getHighEntropyValues) {
          try {
            const hints = await (navigator as any).userAgentData.getHighEntropyValues(['model', 'platform']);
            clientHintsModel = hints?.model || '';
            clientHintsPlatform = hints?.platform || '';
          } catch {
            // ignore
          }
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
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          clientHintsModel,
          clientHintsPlatform,
          screen: screenInfo,
          webglRenderer,
        };

        // Call detection endpoint
        const res = await api.post('/api/quote/detect-device', payload).catch(async () => {
          // Fallback to Next.js route if Express proxy differs
          return api.post('/api/detect-device', payload);
        });

        if (cancelled || !res.data?.success || !res.data.data) {
          if (!cancelled) setLoading(false);
          return;
        }

        const detected: DetectedDeviceData = res.data.data;
        setDevice(detected);

        // If startingPrice was returned directly from the endpoint
        if (typeof detected.startingPrice === 'number' && detected.startingPrice > 0) {
          setPrice(detected.startingPrice);
        } else {
          // Otherwise query get-upto batch for the exact price
          const priceRes = await api.post('/api/quote/get-upto', {
            devices: [
              {
                brand: detected.brand,
                model: detected.model,
                storage: detected.storage,
              },
            ],
          });

          if (!cancelled && priceRes.data?.success && Array.isArray(priceRes.data.data) && priceRes.data.data[0]) {
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
  const quoteUrl = device.brand === 'Apple'
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
              <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
                {device.model}
                {device.brand !== 'Apple' && device.storage ? (
                  <span className="text-sm font-normal text-muted"> ({device.storage})</span>
                ) : null}
              </h3>
              <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {price ? (
                  <>
                    Get <span className="text-base sm:text-lg">{formatCurrency(price)}</span>
                  </>
                ) : (
                  <span className="text-xs font-normal text-muted">Calculating best value...</span>
                )}
              </p>
              <Link
                href={`/quote?brand=${encodeURIComponent(device.brand)}&model=${encodeURIComponent(device.model)}&stage=storage`}
                className="mt-1 inline-block text-[0.75rem] text-muted underline hover:text-gold"
              >
                Not your exact model or variant? Change
              </Link>
            </div>
          </div>

          {/* Sell Now Action */}
          <div className="shrink-0">
            <Link
              href={quoteUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-on-gold no-underline shadow-token-sm transition-transform hover:-translate-y-0.5 hover:bg-gold/90 active:scale-95 sm:px-5 sm:py-3"
            >
              <span>Sell Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
