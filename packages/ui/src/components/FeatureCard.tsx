import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export type FeatureCardTone = 'default' | 'cobalt' | 'success' | 'copper';

const TONE: Record<FeatureCardTone, string> = {
  default: 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)]',
  cobalt: 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-cobalt-900)]',
  success: 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-success-700)]',
  copper: 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-copper-900)]',
};

export interface FeatureCardProps {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: ReactNode;
  footer?: ReactNode;
  tone?: FeatureCardTone;
  className?: string;
}

/**
 * Icon/eyebrow + title + body + optional footer. Framework-agnostic (no
 * router import) — wrap the rendered card in the app's own `<Link>` when a
 * card needs to be a whole-tile link, e.g. `<Link href={...}><FeatureCard .../></Link>`.
 */
export function FeatureCard({
  eyebrow,
  title,
  body,
  icon,
  footer,
  tone = 'default',
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cx(
        'flex h-full min-h-[220px] flex-col rounded-[var(--wariba-radius-2xl)] border p-7 sm:p-8',
        TONE[tone],
        className,
      )}
    >
      {icon ? (
        <div className="text-[color:var(--wariba-color-bone-50)]" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      {eyebrow ? (
        <p
          className={cx(
            'text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-caps)] text-[color:var(--wariba-color-bone-200)]',
            icon ? 'mt-4' : false,
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <p
        className={cx(
          'text-[length:var(--wariba-font-size-heading-md)] font-semibold leading-[var(--wariba-line-height-heading-md)] text-[color:var(--wariba-color-bone-50)]',
          icon || eyebrow ? 'mt-4' : false,
        )}
      >
        {title}
      </p>
      <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-color-bone-100)]">
        {body}
      </p>
      {footer ? (
        <div className="mt-auto border-t border-[color:var(--wariba-color-bone-300)]/50 pt-5 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-bone-100)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
