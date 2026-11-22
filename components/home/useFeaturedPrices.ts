'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { FEATURED_MODELS } from './featuredModels';

type Prices = Record<string, number>;
type Device = { brand: string; model: string; storage: string };

// "Get upto" prices come only from POST /api/quote/get-upto, the same
// startingPrice the quote page shows on its Get Upto screen. Nothing is
// estimated in the browser; a device without a price resolves to null.
const cache = new Map<string, Promise<number | null>>();
const keyOf = (d: Device) => `${d.brand}|${d.model}|${d.storage}`;

function request(devices: Device[]): Promise<(number | null)[]> {
  return api
    .post('/api/quote/get-upto', { devices })
    .then((res) => {
      const rows = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
      return devices.map((_, i) => {
        const value = rows[i]?.startingPrice;
        return typeof value === 'number' && value > 0 ? value : null;
      });
    });
}

/** Prices several devices in one request, sharing results with getUpto(). */
function prime(devices: Device[]) {
  const missing = devices.filter((d) => !cache.has(keyOf(d)));
  if (missing.length) {
    const batch = request(missing);
    missing.forEach((d, i) => {
      const p = batch.then((values) => values[i]);
      cache.set(keyOf(d), p);
      // A failed request is not remembered, so a later attempt can succeed.
      p.catch(() => cache.delete(keyOf(d)));
    });
  }
  return Promise.all(devices.map((d) => cache.get(keyOf(d))!.catch(() => null)));
}

/** The server's Get upto for one device, or null when it has none. Rejects on network failure. */
export function getUpto(device: Device): Promise<number | null> {
  if (!cache.has(keyOf(device))) prime([device]);
  return cache.get(keyOf(device))!;
}

const FEATURED_DEVICES = FEATURED_MODELS.map((m) => ({ brand: m.brand, model: m.catalogModel, storage: m.catalogStorage }));

/** Server Get upto prices for FEATURED_MODELS, keyed by model id. */
export function useFeaturedPrices() {
  const [prices, setPrices] = useState<Prices>({});
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    prime(FEATURED_DEVICES).then((values) => {
      if (cancelled) return;
      const next: Prices = {};
      values.forEach((v, i) => {
        if (v) next[FEATURED_MODELS[i].id] = v;
      });
      setPrices(next);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, settled };
}
