'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { FEATURED_MODELS } from './featuredModels';

type Prices = Record<string, number>;

// One request per page load, shared by the hero phone and the price ticker.
let pending: Promise<Prices> | null = null;

function loadPrices(): Promise<Prices> {
  if (!pending) {
    const devices = FEATURED_MODELS.map((m) => ({ brand: m.brand, model: m.catalogModel, storage: m.catalogStorage }));
    pending = api
      .post('/api/quote/get-upto', { devices })
      .then((res) => {
        const prices: Prices = {};
        if (res.data?.success && Array.isArray(res.data.data)) {
          res.data.data.forEach((row: { startingPrice?: unknown }, i: number) => {
            const value = row?.startingPrice;
            if (typeof value === 'number' && value > 0 && FEATURED_MODELS[i]) prices[FEATURED_MODELS[i].id] = value;
          });
        }
        return prices;
      })
      .catch(() => {
        // Let a later mount try again; cards fall back to "Check price".
        pending = null;
        return {};
      });
  }
  return pending;
}

/**
 * Server "Get upto" prices for FEATURED_MODELS, keyed by model id. A model
 * the server cannot price is simply absent; nothing is estimated client-side.
 */
export function useFeaturedPrices() {
  const [prices, setPrices] = useState<Prices>({});
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPrices().then((result) => {
      if (cancelled) return;
      setPrices(result);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, settled };
}
