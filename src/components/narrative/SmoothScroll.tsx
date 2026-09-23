'use client';

import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import { cancelFrame, frame } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => true;

export function SmoothScroll({ children }: { children: ReactNode }) {
  const ref = useRef<LenisRef>(null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);

  useEffect(() => {
    // Share Motion's clock so the scroll and chapter animations advance together.
    const update = ({ timestamp }: { timestamp: number }) => ref.current?.lenis?.raf(timestamp);
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return <ReactLenis ref={ref} root options={{
    autoRaf: false,
    smoothWheel: !reduced,
    // Dampen discrete wheel steps without adding a long tail to trackpad gestures.
    lerp: 0.12,
    wheelMultiplier: 1,
    syncTouch: false,
    anchors: true,
    respectReducedMotion: true,
  }}>{children}</ReactLenis>;
}

export function useScrollLock(locked: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    if (!locked || !lenis) return;
    // Radix locks native scrolling; also stop any remaining Lenis momentum.
    lenis.stop();
    return () => lenis.start();
  }, [lenis, locked]);
}
