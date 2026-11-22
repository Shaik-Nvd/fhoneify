'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __fhReveal?: boolean;
  }
}

// Runs while the HTML is parsed, before the sections below it paint: arms the
// hidden state, and disarms it again if the observer has not started within
// 4 s (script error, very slow device), so content can never stay invisible.
const BOOT = `(function(){var d=document.documentElement;if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('reveal-on');setTimeout(function(){if(!window.__fhReveal)d.classList.remove('reveal-on')},4000)})();`;

export function RevealBoot() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT }} />;
}

/**
 * Adds .is-in to every [data-reveal] element as it scrolls into view. Pure
 * class toggling, so the sections themselves stay server components.
 */
export function RevealObserver() {
  useEffect(() => {
    window.__fhReveal = true;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
