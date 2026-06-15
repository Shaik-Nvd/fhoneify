'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/authStore';

/** Wait for Zustand persist rehydration before reading auth state */
export function useHydratedAuth() {
  const [hydrated, setHydrated] = useState(false);
  const auth = useAuthStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  return { hydrated, ...auth };
}
