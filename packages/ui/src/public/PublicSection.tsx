import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type SectionTone =
  /** Plain canvas. The default rhythm. */
  | 'canvas'
  /** One step up, with seams top and bottom — used to break a run of canvas. */
  | 'band'
  /** The deepest surface. Sinks a section below the page for contrast. */
  | 'deep'
  /** Canvas plus the single cobalt ambient field. At most once per page. */
  | 'ambient';

export interface PublicSectionProps {
  children: ReactNode;
  tone?: SectionTone;
  /** Vertical rhythm. `tight` for utility bands, `loose` for a closing scene. */
  space?: 'tight' | 'default' | 'loose';
  id?: string;
  'aria-labelledby'?: string;
  className?: string;
}

/**
 * A public page section — Phase 3.4.5A §13.
 *
 * ## Why this exists before any page uses it
 *
 * Phases B–N will build a homepage, three product pages, how-it-works, rules,
 * WariX marketing, payouts and help. Without a shared section primitive, each
 * of those invents its own vertical rhythm and its own background, and by page
 * four the site has four spacing systems that are almost the same. The one
 * thing a shell can do that a page cannot is make the boring decisions once.
 *
 * It deliberately encodes no content — no heading, no eyebrow, no grid. It
 * owns the band's background, its gutters and its vertical rhythm, and stops.
 */
export function PublicSection({
  children,
  tone = 'canvas',
  space = 'default',
  id,
  className,
  ...aria
}: PublicSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={aria['aria-labelledby']}
      className={cx(TONE[tone], className)}
    >
      <div
        className={cx(
          'mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)]',
          SPACE[space],
        )}
      >
        {children}
      </div>
    </section>
  );
}

const TONE: Record<SectionTone, string> = {
  canvas: '',
  band: 'border-y border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-base)]',
  deep: 'border-y border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-deep)]',
  ambient: 'wariba-ambient',
};

/* 80 / 128 / 176px at desktop, roughly two thirds of that on a phone. Sections
   that touch on mobile are the most common way a dark page turns into one
   undifferentiated column. */
const SPACE = {
  tight: 'py-14 lg:py-20',
  default: 'py-20 lg:py-28',
  loose: 'py-24 lg:py-36',
} as const;

export interface SectionHeaderProps {
  /** Small caps, cobalt, preceded by a dot. Four words at most. */
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  align?: 'start' | 'center';
  className?: string;
}

/** The eyebrow / title / lead triplet, so every section opens the same way. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  id,
  align = 'start',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cx(align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow ? <p className="wariba-eyebrow">{eyebrow}</p> : null}
      <h2 id={id} className={cx('wariba-section-title', eyebrow && 'mt-5')}>
        {title}
      </h2>
      {lead ? (
        <p className={cx('wariba-lead mt-5', align === 'center' && 'mx-auto')}>{lead}</p>
      ) : null}
    </div>
  );
}
