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
  side?: 'top' | 'bottom';
}

/**
 * Design System §24.8 — short help only, never the sole channel for required info,
 * and accessible via keyboard focus, not hover-only (also not a substitute for
 * a real explanation on mobile — pair critical content with a visible affordance).
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
            'rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-inverse)] px-[var(--wariba-space-2)] py-1',
            'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-inverse)] shadow-[var(--wariba-shadow-sm)]',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
