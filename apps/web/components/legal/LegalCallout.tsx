import type { ReactNode } from 'react';

export type LegalCalloutTone = 'info' | 'caution' | 'verified' | 'prohibited';

const TONE_STYLES: Record<LegalCalloutTone, { border: string; bg: string; label: string }> = {
  info: {
    border: 'var(--wariba-brand-edge)',
    bg: 'var(--wariba-brand-wash)',
    label: 'var(--wariba-brand-300)',
  },
  caution: {
    border: 'var(--wariba-accent-amber-edge)',
    bg: 'var(--wariba-accent-amber-wash)',
    label: 'var(--wariba-accent-amber)',
  },
  verified: {
    border: 'var(--wariba-accent-emerald-edge)',
    bg: 'var(--wariba-accent-emerald-wash)',
    label: 'var(--wariba-accent-emerald)',
  },
  prohibited: {
    border: 'var(--wariba-accent-red-edge)',
    bg: 'var(--wariba-accent-red-wash)',
    label: 'var(--wariba-accent-red)',
  },
};

export interface LegalCalloutProps {
  tone?: LegalCalloutTone;
  title: string;
  children: ReactNode;
}

/** A compact callout box for a distinction, caution or verified fact inside legal-page prose. */
export function LegalCallout({ tone = 'info', title, children }: LegalCalloutProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className="rounded-[var(--wariba-radius-lg)] px-5 py-4"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <p
        className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.1em]"
        style={{ color: styles.label }}
      >
        {title}
      </p>
      <div className="mt-2 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
        {children}
      </div>
    </div>
  );
}
