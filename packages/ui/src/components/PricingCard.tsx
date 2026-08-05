import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { Card } from './Card';
import { cx } from '../lib/cx';

export interface PricingCardProps {
  code: string;
  nominalLabel: string;
  priceLabel: string;
  priceValue: string;
  secondaryPriceLine?: string;
  rules: readonly string[];
  cta: ReactNode;
  footnote?: string;
  featured?: boolean;
  featuredLabel?: string;
  className?: string;
}

/**
 * Single source of truth for "what a WARIBA offer looks like" — used on both
 * the homepage and /offres so the two never visually drift (Design System §47.4).
 */
export function PricingCard({
  code,
  nominalLabel,
  priceLabel,
  priceValue,
  secondaryPriceLine,
  rules,
  cta,
  footnote,
  featured = false,
  featuredLabel = 'Offre principale',
  className,
}: PricingCardProps) {
  return (
    <Card
      padding="comfortable"
      data-product-code={code}
      className={cx(
        'flex min-h-[460px] flex-col',
        featured
          ? 'border-[color:var(--wariba-color-cobalt-400)] bg-[color:var(--wariba-color-cobalt-900)]'
          : 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)]',
        className,
      )}
    >
      <div className="flex min-h-8 items-start justify-between gap-3">
        <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-200)]">
          WARIBA ONE
        </p>
        {featured ? <Badge variant="information">{featuredLabel}</Badge> : null}
      </div>
      <p className="wariba-data mt-6 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
        {code}
      </p>
      <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
        {nominalLabel}
      </p>
      <div className="mt-7 border-t border-[color:var(--wariba-color-ink-600)] pt-6">
        <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
          {priceLabel}
        </p>
        <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
          {priceValue}
        </p>
        {secondaryPriceLine ? (
          <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            {secondaryPriceLine}
          </p>
        ) : null}
      </div>
      <ul className="mt-6 grid gap-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
        {rules.map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--wariba-color-success-500)]"
            >
              <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
            </svg>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{cta}</div>
      {footnote ? (
        <p className="mt-3 text-center text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
          {footnote}
        </p>
      ) : null}
    </Card>
  );
}
