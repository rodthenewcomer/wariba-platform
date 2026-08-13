'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from '../lib/cx';

export interface TooltipProps {
  label: string;
  /** A single focusable element (button, link) — receives aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
  side?: 'top' | 'bottom' | 'right';
}

/**
 * Design System §24.8 — short help only, never the sole channel for required info,
 * and accessible via keyboard focus, not hover-only (also not a substitute for
 * a real explanation on mobile — pair critical content with a visible affordance).
 *
 * **A tooltip is always dark and elevated, in every theme.**
 *
 * This used to paint `--wariba-background-inverse` on `--wariba-text-inverse`,
 * which is the *inverse of the current theme* — correct on the light product
 * surfaces it was written against, and exactly backwards in WariX: under the
 * dark trade theme those tokens resolve to bone on ink, so hovering a drawing
 * tool put a bright cream box on the dark workstation. It is the same class of
 * defect as the sheet backdrop resolving to a white veil: a chrome element that
 * must not flip was wired to a token whose whole job is flipping.
 *
 * The dedicated `component.tooltip.*` tokens are fixed values, so one treatment
 * serves both themes — dark tooltips on the light surfaces (the conventional
 * reading, unchanged from before) and the same dark elevated treatment as the
 * workstation's own popovers inside WariX. Fixed at the primitive on purpose:
 * every workstation tooltip comes through here, so there is no second place for
 * this to be got wrong.
 */
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children, { 'aria-describedby': id })
    : (children as ReactNode);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {trigger}
      <span id={id} role="tooltip" hidden={!open} className="contents">
        <span
          className={cx(
            'pointer-events-none absolute left-1/2 z-[var(--wariba-z-popover)] w-max max-w-xs -translate-x-1/2',
            'rounded-[var(--wariba-component-tooltip-radius)] px-[var(--wariba-component-tooltip-padding-x)] py-1',
            'bg-[color:var(--wariba-component-tooltip-surface)] text-[color:var(--wariba-component-tooltip-text)]',
            'border border-[color:var(--wariba-component-tooltip-border)]',
            'text-[length:var(--wariba-component-tooltip-font-size)] font-semibold leading-tight',
            'shadow-[var(--wariba-component-tooltip-shadow)]',
            side === 'top'
              ? 'bottom-full mb-2'
              : side === 'right'
                ? 'left-full top-1/2 ml-2 -translate-x-0 -translate-y-1/2'
                : 'top-full mt-2',
          )}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
