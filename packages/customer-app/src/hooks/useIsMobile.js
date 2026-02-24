'use client';

import { useState, useEffect } from 'react';

/**
 * Viewport-width based mobile detection (< breakpoint px).
 * SSR-safe: returns false during server render, updates on client mount.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    setMounted(true);

    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  // During SSR and initial hydration, return false (center variant)
  // to match server-rendered HTML and avoid hydration mismatch
  if (!mounted) return false;
  return isMobile;
}
