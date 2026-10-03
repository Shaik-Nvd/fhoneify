'use client';

import { Component, useEffect, useRef, type ReactNode } from 'react';
import PhoneModel from './PhoneModel';

// Resting pose (matches .phone-rig defaults) and maximum pointer tilt.
const REST_X = 6;
const REST_Y = -16;
const TILT_Y = 16;
const TILT_X = 10;

function InteractivePhone() {
  const rigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    // Pointer response only for a precise hovering mouse. Touch devices and
    // reduced-motion users keep the static resting pose; nothing intercepts
    // touch or scroll.
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return;

    const host = (rig.closest('[data-hero]') as HTMLElement | null) ?? rig;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      rig.style.setProperty('--ry', `${REST_Y + currentX}deg`);
      rig.style.setProperty('--rx', `${REST_X + currentY}deg`);
      rig.style.setProperty('--gx', `${30 + currentX * 2.2}%`);
      rig.style.setProperty('--gy', `${18 - currentY * 2.5}%`);
      // The loop stops once the phone settles, so an idle page costs nothing.
      frame = Math.abs(targetX - currentX) > 0.02 || Math.abs(targetY - currentY) > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * TILT_Y;
      targetY = -((e.clientY - rect.top) / rect.height - 0.5) * TILT_X;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <PhoneModel ref={rigRef} />;
}

class PhoneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <PhoneModel /> : this.props.children;
  }
}

export default function HeroPhone() {
  return (
    <PhoneBoundary>
      <InteractivePhone />
    </PhoneBoundary>
  );
}
