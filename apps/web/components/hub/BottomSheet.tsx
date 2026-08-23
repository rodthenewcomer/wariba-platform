'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { EASE_ENTER, MOTION } from '../motion/primitives';

/**
 * The phone's dialog.
 *
 * A centred modal on a 375px screen is a rectangle with its controls at the
 * top, out of thumb reach, above a keyboard that will cover them. A sheet
 * rises from the edge the thumb is already near, which is why every mobile
 * platform converged on it.
 *
 * ## Accessibility, not decoration
 *
 * It is a real `dialog`: focus moves in on open, Escape closes, Tab is trapped
 * inside, and focus returns to whatever opened it. A sheet that leaves focus
 * on the page behind it is a sheet a keyboard user cannot use and a screen
 * reader will read straight through.
 *
 * Body scroll is locked while it is open — otherwise the page behind scrolls
 * under the sheet on iOS and the trader loses their place.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center md:hidden"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0 : MOTION.standard }}
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-[color:var(--wariba-component-workstation-surface-overlay-backdrop)] backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid="bottom-sheet"
            className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-[18px] border-t border-[color:var(--warix-border-strong)] bg-[color:var(--warix-panel)] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_60px_-24px_rgba(0,0,0,0.85)]"
            initial={reduced ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduced ? { y: 0 } : { y: '100%' }}
            // The sheet's own easing, slower than an interaction and faster
            // than a page — it should feel like a surface with mass.
            transition={{ duration: reduced ? 0 : MOTION.major, ease: EASE_ENTER }}
          >
            {/* The grab handle every phone user recognises as "this can be
                dismissed", drawn rather than described. */}
            <div className="flex justify-center pb-1 pt-3">
              <span
                aria-hidden="true"
                className="h-1 w-10 rounded-full bg-[color:var(--warix-border-strong)]"
              />
            </div>
            <div className="px-5 pb-5 pt-2">
              <p className="mb-4 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                {title}
              </p>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
