import type { ReactNode } from 'react';

/**
 * A state, said in one pill.
 *
 * Colour is never the only carrier: every pill draws a dot *and* a word, so
 * the state survives greyscale, colour-blindness and a screenshot pasted into
 * a support ticket. That is also why there is no icon-only variant.
 */

export type PillTone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger' | 'info';

const TONE: Record<PillTone, { dot: string; text: string; wash: string; edge: string }> = {
  neutral: {
    dot: 'var(--wariba-text-tertiary)',
    text: 'var(--wariba-text-secondary)',
    wash: 'var(--warix-surface-raised)',
    edge: 'var(--warix-border-subtle)',
  },
  progress: {
    dot: 'var(--wariba-accent-indigo)',
    text: 'var(--wariba-accent-indigo)',
    wash: 'var(--wariba-accent-indigo-wash)',
    edge: 'var(--wariba-accent-indigo-edge)',
  },
  attention: {
    dot: 'var(--wariba-accent-amber)',
    text: 'var(--wariba-accent-amber)',
    wash: 'var(--wariba-accent-amber-wash)',
    edge: 'var(--wariba-accent-amber-edge)',
  },
  success: {
    dot: 'var(--wariba-accent-emerald)',
    text: 'var(--wariba-accent-emerald)',
    wash: 'var(--wariba-accent-emerald-wash)',
    edge: 'var(--wariba-accent-emerald-edge)',
  },
  danger: {
    dot: 'var(--wariba-accent-red)',
    text: 'var(--wariba-accent-red)',
    wash: 'var(--wariba-accent-red-wash)',
    edge: 'var(--wariba-accent-red-edge)',
  },
  info: {
    dot: 'var(--wariba-accent-cyan)',
    text: 'var(--wariba-accent-cyan)',
    wash: 'var(--wariba-accent-cyan-wash)',
    edge: 'var(--wariba-accent-cyan-edge)',
  },
};

export function StatusPill({
  tone = 'neutral',
  children,
  size = 'md',
  'data-testid': testId,
}: {
  tone?: PillTone;
  children: ReactNode;
  size?: 'sm' | 'md';
  'data-testid'?: string;
}) {
  const style = TONE[tone];
  return (
    <span
      data-testid={testId}
      data-tone={tone}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold ${
        size === 'sm'
          ? 'h-5 px-2 text-[11px]'
          : 'h-6 px-2.5 text-[length:var(--wariba-font-size-label-sm)]'
      }`}
      style={{ background: style.wash, color: style.text, borderColor: style.edge }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: style.dot }}
      />
      {children}
    </span>
  );
}

/** Maps the lifecycle/payout tone vocabulary onto the pill's. */
export function toneFromLifecycle(
  tone: 'neutral' | 'progress' | 'attention' | 'success' | 'danger',
): PillTone {
  return tone;
}
