'use client';

import { AnimatePresence, motion } from 'motion/react';
import { LivePill } from '../../motion/primitives';
import { AccountBadge, SurfaceSwitcher, type Section07Surface } from './primitives';
import { TraderHubMockup } from './TraderHubMockup';
import { AnalyticsMockup } from './AnalyticsMockup';
import { JournalMockup } from './JournalMockup';
import { ACCOUNT } from './section07-data';

export interface ProductOSMockupProps {
  surface: Section07Surface;
  selectSurface: (surface: Section07Surface) => void;
  markInteracted: () => void;
  reduced: boolean;
}

/**
 * The product shell — one stable frame, three internal surfaces.
 *
 * The top bar never moves: same account, same switcher, same status,
 * regardless of which surface is active. That stability is what tells the
 * visitor "same product, different view" instead of "three different pages".
 */
export function ProductOSMockup({
  surface,
  selectSurface,
  markInteracted,
  reduced,
}: ProductOSMockupProps) {
  return (
    <div className="wariba-visual-card relative overflow-hidden" data-variant="panel">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--wariba-brand-400)_55%,transparent),transparent)]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--wariba-seam)] bg-[color:var(--wariba-surface-2)] px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-[-0.02em] text-[color:var(--wariba-on-dark)]">
            WARIBA
          </span>
          <AccountBadge productLabel={`${ACCOUNT.productLabel} ${ACCOUNT.sizeLabel}`} stateLabel={ACCOUNT.stateLabel} />
        </div>
        <div className="flex items-center gap-3">
          <SurfaceSwitcher active={surface} onSelect={selectSurface} />
          <div className="hidden sm:block">
            <LivePill label="MODE DÉMO" />
          </div>
        </div>
      </div>

      <div
        id="section07-viewport"
        role="tabpanel"
        aria-labelledby={`section07-tab-${surface}`}
        className="relative p-4 sm:p-6 lg:p-7"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={surface}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {surface === 'hub' ? <TraderHubMockup /> : null}
            {surface === 'analytics' ? <AnalyticsMockup onInteract={markInteracted} /> : null}
            {surface === 'journal' ? <JournalMockup onInteract={markInteracted} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
