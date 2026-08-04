import { cx } from '../lib/cx';

export interface StatTileProps {
  label: string;
  value: string;
  className?: string;
}

/** Design System §11 — IBM Plex Mono (`wariba-data`) reserved for numeric/financial values. */
export function StatTile({ label, value, className }: StatTileProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)]',
        'bg-[color:var(--wariba-color-ink-900)] p-4',
        className,
      )}
    >
      <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
        {label}
      </p>
      <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
        {value}
      </p>
    </div>
  );
}
