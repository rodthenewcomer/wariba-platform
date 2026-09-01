'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { MARKET_WORDS } from './markets';

interface KineticMarketHeadlineProps {
  marketIndex: number;
}

/**
 * The hero H1 — "Tradez [LE FOREX / LES INDICES / …] à votre façon."
 *
 * ## The grammar fix
 *
 * A first version kept "le" fixed and swapped only the noun after it —
 * "Tradez le INDICES" is not French. The article has to travel with the
 * noun, so the whole phrase (`MARKET_WORDS[i].label`, e.g. "LES INDICES")
 * is the one animated unit; "Tradez" and "à votre façon." never change.
 *
 * ## Why the market word isn't width-locked to the longest entry
 *
 * "LE FOREX" and "LES INDICES" differ by 7 characters — a fixed box at the
 * display-heading size would still force wasted width on the shorter
 * phrase. Each phrase sits on its own line
 * already (the two `<br/>`s around it), so a width change here never
 * reflows "Tradez" or "à votre façon." above and below it — only the jank
 * of two phrases being visible at once matters, and `AnimatePresence
 * mode="wait"` already prevents that by fully exiting one before the next
 * enters. The phrase's own font-size is deliberately smaller than the
 * static lines and allowed to wrap, so the longest entry degrades to two
 * lines on narrow screens instead of ever overflowing.
 *
 * ## Accessibility
 *
 * The entire kinetic display is `aria-hidden` — a screen reader would
 * otherwise re-announce the heading on every 3.2s cycle. A `sr-only`
 * sibling carries the one, stable, complete sentence instead.
 */
export function KineticMarketHeadline({ marketIndex }: KineticMarketHeadlineProps) {
  const reduced = useHydratedReducedMotion();
  const current = MARKET_WORDS[marketIndex]!;

  return (
    <h1 className="text-[length:var(--wariba-font-size-display-xl)] font-semibold leading-[0.98] tracking-[-0.03em] text-[color:var(--wariba-on-dark)]">
      <span className="sr-only">Tradez le Forex, les Indices et les Métaux à votre façon.</span>
      <span aria-hidden="true">
        Tradez
        <br />
        <span className="block min-h-[1em] py-1 text-[length:clamp(2rem,7.2vw,4rem)] leading-[1.02]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.label}
              initial={reduced ? false : { opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -14, filter: 'blur(6px)' }}
              transition={{ duration: reduced ? 0 : 0.42, ease: [0.2, 0, 0, 1] }}
              className="inline-block"
              style={{
                color: current.color,
                textShadow: `0 0 28px color-mix(in srgb, ${current.color} 55%, transparent)`,
              }}
            >
              {current.label}
            </motion.span>
          </AnimatePresence>
        </span>
        à votre façon.
      </span>
    </h1>
  );
}
