import type { SVGProps } from 'react';
import { cx } from '../lib/cx';

const SIZE = {
  sm: 'h-[var(--wariba-size-icon-sm)] w-[var(--wariba-size-icon-sm)]',
  md: 'h-[var(--wariba-size-icon-md)] w-[var(--wariba-size-icon-md)]',
  lg: 'h-[var(--wariba-size-icon-lg)] w-[var(--wariba-size-icon-lg)]',
} as const;

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: keyof typeof SIZE;
  /** Accessible label. Omit only when the icon is purely decorative next to visible text. */
  label?: string;
}

/**
 * Icon wrapper — Design System §20: 1.5–1.75px stroke, inherits currentColor
 * from surrounding text (icons never carry sole semantic meaning, §41.4).
 * Consumers pass children (a specific icon's <path>s); this only standardizes
 * sizing, stroke, and accessibility wiring so no icon is added ad hoc.
 */
export function Icon({ size = 'md', label, className, children, ...props }: IconProps) {
  return (
    <svg
      className={cx(SIZE[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}
