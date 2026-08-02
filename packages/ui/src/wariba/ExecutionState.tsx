import { cx } from '../lib/cx';

export type ExecutionStateValue =
  'received' | 'validated' | 'accepted' | 'filled' | 'partially-filled' | 'rejected' | 'cancelled';

const LABEL: Record<ExecutionStateValue, string> = {
  received: 'Reçu',
  validated: 'Validé',
  accepted: 'Accepté',
  filled: 'Exécuté',
  'partially-filled': 'Partiellement exécuté',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

const TONE: Record<ExecutionStateValue, string> = {
  received: 'text-[color:var(--wariba-text-secondary)]',
  validated: 'text-[color:var(--wariba-text-secondary)]',
  accepted: 'text-[color:var(--wariba-status-information-text)]',
  filled: 'text-[color:var(--wariba-status-success-text)]',
  'partially-filled': 'text-[color:var(--wariba-status-warning-text)]',
  rejected: 'text-[color:var(--wariba-status-danger-text)]',
  cancelled: 'text-[color:var(--wariba-text-secondary)]',
};

/** Design System §25.7 — precise execution states, never a vague "Processing…" (UX Architecture §22.9). */
export function ExecutionState({ state }: { state: ExecutionStateValue }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[length:var(--wariba-font-size-label-md)] font-medium',
        TONE[state],
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'h-1.5 w-1.5 rounded-full',
          state === 'filled' && 'bg-[color:var(--wariba-status-success-strong)]',
          state === 'partially-filled' && 'bg-[color:var(--wariba-status-warning-strong)]',
          (state === 'rejected' || state === 'cancelled') &&
            'bg-[color:var(--wariba-status-danger-strong)]',
          (state === 'received' || state === 'validated' || state === 'accepted') &&
            'bg-[color:var(--wariba-status-information-strong)]',
        )}
      />
      {LABEL[state]}
    </span>
  );
}
