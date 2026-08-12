'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * `tall` opens to a fixed working height instead of hugging its content —
   * for a sheet that *is* a surface (the Execution Center) rather than a short
   * confirmation. The content must then own its own scrolling.
   */
  size?: 'auto' | 'tall';
  /**
   * Drops the body padding so a panel can run edge to edge, keeping its own
   * seams and sticky regions intact. The handle and title keep their inset.
   */
  flush?: boolean;
  children: ReactNode;
}

/**
 * Design System §24.13 — mobile order ticket / detail / Close-All-confirmation
 * pattern. Native `<dialog>`, flush to the bottom edge, with a drag handle.
 *
 * **Why this is theme-coloured rather than plain** (W4 visual closure §2/§16).
 * A `<dialog>` gets `background-color: Canvas` from the UA stylesheet — white.
 * Nothing here overrode it, so on WariX the dark Execution Center rendered
 * inside a white iOS-looking modal shell, and the title, painted with
 * `--wariba-text-primary` (#F4F5F7 under a dark scheme), was white on white.
 *
 * The fix is deliberately at the primitive, not at the one call site that
 * exposed it: every trade-side sheet — markets, dock, partial close, chart
 * menu, risk detail — had the same shell. Using the **theme** tokens
 * (`--wariba-theme-surface` / `-text` / `-border`) rather than a hard-coded
 * dark palette is what makes one fix correct in all three themes: the sheet
 * takes the surface of whatever workspace it opens in, so `(trade)` gets the
 * dark workstation surface and `(control)` stays light.
 *
 * Custom properties inherit through the DOM tree, not the visual layer, so a
 * dialog promoted to the top layer still resolves the `data-wariba-theme`
 * variables of the subtree it is written in.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  size = 'auto',
  flush = false,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      // See Dialog.tsx's onClose comment: the native 'close' event is the
      // single source of truth here — nothing else should call the onClose
      // prop directly, or Escape/backdrop dismissal double-fires it.
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      className={cx(
        // `open:flex`, never a bare `flex`. The UA stylesheet hides a closed
        // dialog with `dialog:not([open]) { display: none }`, and any explicit
        // `display` in a class overrides it — so an unconditional `flex` turns
        // every *closed* sheet into an invisible full-width click blocker
        // sitting over the page. That is not theoretical: it took out the
        // quantity stepper the moment this file grew a flex column, because
        // the risk-detail sheet is always mounted and merely closed.
        'm-0 mt-auto mb-0 w-full max-w-full flex-col open:flex',
        'rounded-t-[var(--wariba-component-bottom-sheet-radius-top)] rounded-b-none',
        // The UA's white Canvas background is replaced, not merely covered:
        // a child with its own background would still leave white gutters
        // around the radius and under the handle.
        'bg-[color:var(--wariba-theme-surface)] text-[color:var(--wariba-theme-text)]',
        'border-x-0 border-b-0 border-t border-solid border-[color:var(--wariba-theme-border)] p-0',
        'backdrop:bg-[color:var(--wariba-background-inverse)] backdrop:opacity-[var(--wariba-opacity-overlay)]',
        'shadow-[var(--wariba-component-bottom-sheet-shadow)]',
        // `tall` opens to a working height and leaves the status context above
        // it visible; `auto` hugs its content up to the same ceiling.
        size === 'tall' ? 'h-[90dvh] max-h-[90dvh]' : 'max-h-[85dvh]',
      )}
    >
      <div className="flex shrink-0 justify-center pt-3">
        <span
          aria-hidden="true"
          className="h-1 w-[var(--wariba-component-bottom-sheet-minimum-handle-width)] rounded-full bg-[color:var(--wariba-theme-border)]"
        />
      </div>
      {title ? (
        <h2
          id={titleId}
          className={cx(
            'shrink-0 text-[length:var(--wariba-font-size-heading-sm)] font-semibold',
            'text-[color:var(--wariba-theme-text)]',
            'px-[var(--wariba-component-bottom-sheet-padding)] pb-3 pt-2',
          )}
        >
          {title}
        </h2>
      ) : null}
      <div
        className={cx(
          'flex min-h-0 flex-1 flex-col',
          // A flush sheet hands the whole box to its content, which then owns
          // its own scrolling and any sticky region inside it.
          flush
            ? 'overflow-hidden'
            : 'overflow-y-auto p-[var(--wariba-component-bottom-sheet-padding)] pt-0',
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
