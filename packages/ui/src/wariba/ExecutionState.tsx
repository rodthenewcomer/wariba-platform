import { cx } from '../lib/cx';

/**
 * `preparing`/`sending` are client-only, pre-network states (UX Architecture
 * §22.9) — set before/while a WS message is in flight, never persisted,
 * never present in a server message. `received` through `cancelled` mirror
 * @wariba/contracts' tradeOrderStatusSchema exactly.
 *
 * No `partially-filled`: TRD-021 (LOCKED) makes it structurally unreachable
 * — this sandbox's deterministic market always has sufficient liquidity, so
 * neither tradeOrderStatusSchema nor orderResultMessageSchema.status can
 * ever carry it. An earlier version of this type had it anyway; removed
 * rather than building UI for a state the server can never send.
 */
export type ExecutionStateValue =
  | 'preparing'
  | 'sending'
  | 'received'
  | 'validated'
  | 'accepted'
  | 'filled'
  | 'rejected'
  | 'cancelled';

const LABEL: Record<ExecutionStateValue, string> = {
  preparing: 'Préparation',
  sending: 'Envoi',
  received: 'Reçu',
  validated: 'Validé',
  accepted: 'Accepté',
  filled: 'Exécuté',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

const TONE: Record<ExecutionStateValue, string> = {
  preparing: 'text-[color:var(--wariba-text-secondary)]',
  sending: 'text-[color:var(--wariba-text-secondary)]',
  received: 'text-[color:var(--wariba-text-secondary)]',
  validated: 'text-[color:var(--wariba-text-secondary)]',
  accepted: 'text-[color:var(--wariba-status-information-text)]',
  filled: 'text-[color:var(--wariba-status-success-text)]',
  rejected: 'text-[color:var(--wariba-status-danger-text)]',
  cancelled: 'text-[color:var(--wariba-text-secondary)]',
};

const TERMINAL_DANGER: readonly ExecutionStateValue[] = ['rejected', 'cancelled'];
const IN_FLIGHT: readonly ExecutionStateValue[] = [
  'preparing',
  'sending',
  'received',
  'validated',
  'accepted',
];

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
          TERMINAL_DANGER.includes(state) && 'bg-[color:var(--wariba-status-danger-strong)]',
          IN_FLIGHT.includes(state) && 'bg-[color:var(--wariba-status-information-strong)]',
        )}
      />
      {LABEL[state]}
    </span>
  );
}
