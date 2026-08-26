import { cx } from '../lib/cx';

export interface SkeletonProps {
  className?: string;
  /** Reflect the real shape being loaded — never a generic block (Design System §33.1). */
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const RADIUS = {
  sm: 'rounded-[var(--wariba-radius-sm)]',
  md: 'rounded-[var(--wariba-radius-md)]',
  lg: 'rounded-[var(--wariba-radius-lg)]',
  full: 'rounded-full',
};

export function Skeleton({
  className,
  width = '100%',
  height = '1rem',
  rounded = 'sm',
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      /*
       * A placeholder says so.
       *
       * A skeleton is invisible to assistive technology by design, and it
       * carried no marker of any kind — so nothing could tell "this region is
       * still a promise" from "this region is the answer". An evidence harness
       * photographing a page therefore had no way to know it had caught a
       * loading state, and twice it did. The attribute is inert: no styling, no
       * behaviour, no effect on what a reader is told.
       */
      data-skeleton="true"
      className={cx(
        'block animate-pulse bg-[color:var(--wariba-background-subtle)]',
        RADIUS[rounded],
        className,
      )}
      style={{ width, height }}
    />
  );
}
