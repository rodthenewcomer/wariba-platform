import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface StrongColorSurfaceProps {
  children: ReactNode;
  /** `brand` is cobalt; `deep` is a dark field lit from one corner. */
  tone?: 'brand' | 'deep';
  /** An image, chart or object, placed opposite the copy. */
  media?: ReactNode;
  className?: string;
}

/**
 * A saturated scene — Phase 3.4.5A §27.
 *
 * The alternating rhythm later pages need (dark → colour field → dark product
 * surface → editorial) only works if the colour field is a primitive. Left to
 * each page, a "cobalt section" becomes five slightly different cobalts.
 *
 * `brand` spends the page's saturation budget, so at most one per page. Text
 * on it is white — white on brand-500 measures 6.4:1 — and the specular sweep
 * in the corner is what stops a large flat fill reading as a coloured
 * rectangle.
 */
export function StrongColorSurface({
  children,
  tone = 'brand',
  media,
  className,
}: StrongColorSurfaceProps) {
  return (
    <div className={cx('wariba-strong-surface', className)} data-tone={tone}>
      {media ? (
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>{children}</div>
          <div className="min-w-0">{media}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export interface DarkProductSurfaceProps {
  children?: ReactNode;
  /** The product screenshot, mockup or live component. */
  media?: ReactNode;
  /** Reverse the columns on desktop. */
  flip?: boolean;
  className?: string;
}

/**
 * The surface a product shows itself on — Phase 3.4.5A §28.
 *
 * Deep background, a seam, a top rim and one pooled cobalt light behind the
 * media slot. Later phases drop the WariX terminal, an equity chart or a
 * dashboard mockup into `media`; the point of building it now is that the
 * lighting is decided once instead of per page.
 */
export function DarkProductSurface({
  children,
  media,
  flip = false,
  className,
}: DarkProductSurfaceProps) {
  return (
    <div className={cx('wariba-product-surface', className)}>
      <div
        className={cx(
          'grid items-center gap-10 lg:grid-cols-2',
          flip && 'lg:[&>*:first-child]:order-2',
        )}
      >
        <div className="min-w-0">{children}</div>
        <div className="min-w-0">{media}</div>
      </div>
    </div>
  );
}

export interface VisualCardProps {
  children: ReactNode;
  /** `panel` is the default module; `accent` is the one filled card per section. */
  variant?: 'panel' | 'accent' | 'quiet';
  /** Lifts on hover. Only for cards that are themselves links. */
  interactive?: boolean;
  className?: string;
}

/**
 * A visual card — Phase 3.4.5A §29.
 *
 * Three variants on purpose, not one card with fifteen props. `accent` is the
 * filled cobalt tile a section is allowed exactly one of; `panel` is
 * everything else; `quiet` is a card that is present but not competing —
 * an upcoming step, a disabled option.
 */
export function VisualCard({
  children,
  variant = 'panel',
  interactive = false,
  className,
}: VisualCardProps) {
  return (
    <div
      className={cx(
        'wariba-visual-card',
        interactive && 'wariba-visual-card-interactive',
        className,
      )}
      data-variant={variant}
    >
      {children}
    </div>
  );
}
