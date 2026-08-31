'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Defers a media-preference branch until after the server tree has hydrated.
 * The server and first client render therefore share one deterministic frame.
 */
export function useHydratedReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && prefersReducedMotion === true;
}
