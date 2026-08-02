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
      className={cx(
        'block animate-pulse bg-[color:var(--wariba-background-subtle)]',
        RADIUS[rounded],
        className,
      )}
      style={{ width, height }}
    />
  );
}
