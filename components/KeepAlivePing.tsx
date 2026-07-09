'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

export default function KeepAlivePing() {
  useEffect(() => {
    const pingBackend = async () => {
      try {
        // Silent ping to wake up the Render backend API if it's sleeping
        await api.get('/health');
      } catch (err) {
        console.error('KeepAlive Ping Error:', err);
      }
    };
    
    // Ping immediately on load
    pingBackend();
    
    // And ping every 5 minutes while the user has the tab open
    const interval = setInterval(pingBackend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
