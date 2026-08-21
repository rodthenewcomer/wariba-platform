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
  /**
   * `auto` hugs its content up to 85dvh. `tall` opens to a fixed working
   * height for surfaces that scroll a long list. `fitted` (VX1-D.1 §16) hugs
   * its content like `auto` but keeps `tall`'s taller ceiling — for a sheet
   * whose content is short today and may not be tomorrow, and which must never
   * reserve empty pixels in the meantime.
   */
  size?: 'auto' | 'tall' | 'fitted';
  /**
   * Drops the body padding so a panel can run edge to edge, keeping its own
   * seams and sticky regions intact. The handle and title keep their inset.
   */
  flush?: boolean;
  /**
   * Keeps `title` as the dialog's accessible name but stops drawing it, for a
   * panel that already carries its own module header.
   *
   * The mobile execution sheet is the case: the sheet said "Trader EURUSD" and
   * the panel under it said "Exécution · EURUSD · Ouvert", so the instrument
   * appeared twice within 40px and the sheet spent a band of a phone screen
   * repeating itself. The dialog still has a name — it is simply not drawn
   * twice.
   */
  hideTitle?: boolean;
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
  hideTitle = false,
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
        'rounded-t-[var(--wariba-component-workstation-radius-sheet)] rounded-b-none',
        // The UA's white Canvas background is replaced, not merely covered:
        // a child with its own background would still leave white gutters
        // around the radius and under the handle.
        'bg-[color:var(--wariba-theme-surface)] text-[color:var(--wariba-theme-text)]',
        'border-x-0 border-b-0 border-t border-solid border-[color:var(--wariba-theme-border)] p-0',
        // VX1-B §28 — the sheet is a lifted surface: a rim light along its top
        // edge, the same one every raised module in WariX carries.
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]',
        // A scrim is always *darker* than the page it dims. `--wariba-background-inverse`
        // is the inverse of the current theme, so under the dark trade theme it
        // resolved to bone (#F7F3EB) and every mobile sheet opened behind a
        // 64%-white veil — which is why the workstation looked washed out above
        // an open execution sheet rather than pushed back behind it. The
        // dedicated overlay token carries its own alpha and is dark in every
        // theme, which is what a scrim has to be.
        'backdrop:bg-[color:var(--wariba-component-workstation-surface-overlay-backdrop)]',
        // §27 — a very light blur only: the chart is still running behind this.
        'backdrop:backdrop-blur-[2px]',
        'shadow-[var(--wariba-component-bottom-sheet-shadow)]',
        /*
         * VX1-D.1 §16 — a height a sheet has earned, not one it was given.
         *
         * `tall` pins 90dvh whatever is inside it, which is right for a long
         * scrolling list and wrong for a form: the order ticket's content ends
         * well short of that, so the sheet reserved a band of empty graphite
         * between the impact row and the Sell/Buy footer and read as
         * unfinished. `fitted` keeps the same ceiling and drops the floor, so
         * the sheet is exactly as tall as what it holds and grows only if the
         * content does.
         */
        size === 'tall' ? 'h-[90dvh] max-h-[90dvh]' : '',
        size === 'fitted' ? 'max-h-[90dvh]' : '',
        size === 'auto' ? 'max-h-[85dvh]' : '',
      )}
    >
      {/* VX1-C §22 — the handle is the sheet's own affordance: one weight, one
          colour, one position, on every sheet in the product. */}
      <div className="flex shrink-0 justify-center pb-1.5 pt-2.5">
        <span
          aria-hidden="true"
          className="h-1 w-[var(--wariba-component-bottom-sheet-minimum-handle-width)] rounded-full bg-[color:var(--wariba-component-workstation-seam-strong)]"
        />
      </div>
      {/* Visual closure §17 — a sheet header, not a page heading. At 18px the
          title dominated the surface it introduced and repeated identity the
          panel below already carries; at 15px with a hairline under it, it reads
          as the top edge of a native sheet and hands the hierarchy back to the
          content. */}
      {title ? (
        <h2
          id={titleId}
          className={cx(
            hideTitle
              ? 'sr-only'
              : cx(
                  'shrink-0 border-b border-[color:var(--wariba-theme-border)]',
                  'text-[length:var(--wariba-font-size-heading-sm)] font-bold tracking-[-0.01em]',
                  'text-[color:var(--wariba-theme-text)]',
                  'px-[var(--wariba-component-bottom-sheet-padding)] pb-2.5 pt-1.5',
                ),
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
          // §22 — the home indicator never sits on the last row of a sheet.
          'pb-[max(env(safe-area-inset-bottom),0px)]',
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
