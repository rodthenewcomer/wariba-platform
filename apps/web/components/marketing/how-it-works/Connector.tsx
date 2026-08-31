'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

/**
 * The thread between two phases. A small cobalt pulse travels along it once,
 * scheduled by the parent's shared timeline so it arrives exactly as the
 * next phase activates — then the line itself stays faintly lit, a visible
 * trace of "the journey already passed through here". Vertical on mobile,
 * horizontal on desktop; one component, two CSS orientations.
 */
export function Connector({
  reduced,
  inView,
  delayMs,
  travelMs,
  lit,
}: {
  reduced: boolean;
  inView: boolean;
  delayMs: number;
  travelMs: number;
  lit: boolean;
}) {
  const [fired, setFired] = useState(reduced);

  useEffect(() => {
    if (reduced || !inView) return;
    const timer = window.setTimeout(() => setFired(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [reduced, inView, delayMs]);

  return (
    <div
      aria-hidden="true"
      className="relative flex h-8 items-center justify-center py-1 lg:h-auto lg:w-9 lg:flex-none lg:px-1 lg:py-0"
    >
      <span
        className="h-full w-px transition-[background] duration-700 lg:hidden"
        style={{
          background: lit
            ? 'linear-gradient(180deg, transparent, var(--wariba-brand-400), transparent)'
            : 'linear-gradient(180deg, transparent, var(--wariba-seam-strong), transparent)',
        }}
      />
      <span
        className="hidden h-px w-full transition-[background] duration-700 lg:block"
        style={{
          background: lit
            ? 'linear-gradient(90deg, transparent, var(--wariba-brand-400), transparent)'
            : 'linear-gradient(90deg, transparent, var(--wariba-seam-strong), transparent)',
        }}
      />
      {fired && !reduced ? (
        <>
          <motion.span
            className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[color:var(--wariba-color-cobalt-300)] lg:hidden"
            style={{
              boxShadow:
                '0 0 12px 3px color-mix(in srgb, var(--wariba-brand-400) 65%, transparent)',
            }}
            initial={{ opacity: 0, scale: 0.6, top: '0%' }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.8], top: ['0%', '100%'] }}
            transition={{ duration: travelMs / 1000, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.span
            className="absolute top-1/2 hidden size-1.5 -translate-y-1/2 rounded-full bg-[color:var(--wariba-color-cobalt-300)] lg:block"
            style={{
              boxShadow:
                '0 0 12px 3px color-mix(in srgb, var(--wariba-brand-400) 65%, transparent)',
            }}
            initial={{ opacity: 0, scale: 0.6, left: '0%' }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.8], left: ['0%', '100%'] }}
            transition={{ duration: travelMs / 1000, ease: [0.4, 0, 0.2, 1] }}
          />
        </>
      ) : null}
    </div>
  );
}
