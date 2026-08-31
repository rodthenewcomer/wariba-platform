'use client';

import { motion } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

export { cx } from '@wariba/ui';

/**
 * The `LIVE` pill, re-exported for the showcase.
 *
 * It exists as its own module so `WariXShowcase` can stay a leaf component: the
 * shell's pill lives in the motion primitives, and importing that whole module
 * into a marketing asset drags the animated-number machinery along with it.
 */
export function LivePillHost({ label = 'EN DIRECT' }: { label?: string }) {
  const reduced = useHydratedReducedMotion();
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--wariba-brand-300)]">
      {reduced ? (
        <span className="size-1.5 rounded-full bg-[color:var(--wariba-brand-400)]" />
      ) : (
        <motion.span
          className="size-1.5 rounded-full bg-[color:var(--wariba-brand-400)]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {label}
    </span>
  );
}
