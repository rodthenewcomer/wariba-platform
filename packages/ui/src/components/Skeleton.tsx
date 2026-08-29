import { cx } from '../lib/cx';

export interface SkeletonProps {
  className?: string;
  /** Reflect the real shape being loaded — never a generic block (Design System §33.1). */
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Position in a group, in shapes. Neighbours sweep 80ms apart so a grid
   * breathes instead of blinking as one block — see the note below.
   */
  index?: number;
}

const RADIUS = {
  sm: 'rounded-[var(--wariba-radius-sm)]',
  md: 'rounded-[var(--wariba-radius-md)]',
  lg: 'rounded-[var(--wariba-radius-lg)]',
  xl: 'rounded-[var(--wariba-radius-xl)]',
  full: 'rounded-full',
};

/**
 * A placeholder shaped like the thing it is waiting for.
 *
 * ## What changed in 3.4.5R
 *
 * This used to be `animate-pulse` on `--wariba-background-subtle`. Two
 * problems with that on a dark canvas.
 *
 * **Opacity pulsing reads as a fault.** Fading a graphite block in and out
 * against near-black is a flicker; on a grid of them, synchronised, it is the
 * clearest possible signal that a screen is broken rather than busy. What the
 * references do instead is sweep a light across the shape — the surface is
 * always there, something is passing over it.
 *
 * **Synchronised is worse than staggered.** Twelve shapes pulsing on the same
 * clock is one large blinking rectangle. Offsetting neighbours by 80ms turns
 * the same twelve shapes into a wave, which reads as a system loading rather
 * than a page failing. Pass `index` and the offset is applied for you.
 *
 * Under `prefers-reduced-motion` the sweep stops entirely and the shape holds
 * at its mid luminance — still obviously a placeholder, with nothing moving.
 *
 * ## The marker
 *
 * `data-skeleton="true"` stays. It is inert — no styling, no behaviour, and
 * invisible to assistive technology — but it lets the evidence harness know it
 * has photographed a loading state, which it twice did without noticing.
 */
export function Skeleton({
  className,
  width = '100%',
  height = '1rem',
  rounded = 'sm',
  index = 0,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-skeleton="true"
      className={cx('wariba-skeleton block', RADIUS[rounded], className)}
      style={{ width, height, ['--wariba-skeleton-delay' as string]: `${(index % 8) * 80}ms` }}
    />
  );
}

export interface SkeletonTextProps {
  /** How many lines. The last one is short, the way a real paragraph ends. */
  lines?: number;
  className?: string;
}

/** A paragraph-shaped placeholder. The ragged last line is the tell that makes it read as text. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, line) => (
        <Skeleton
          key={line}
          index={line}
          height="0.75rem"
          width={line === lines - 1 ? '58%' : '100%'}
        />
      ))}
    </span>
  );
}
