'use client';

import type { TicketOrderKind } from './execution-contract';

export const ORDER_KIND_LABEL: Record<TicketOrderKind, string> = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop',
};

const ORDER_KINDS: readonly TicketOrderKind[] = ['market', 'limit', 'stop'];

export interface OrderTypeSelectorProps {
  value: TicketOrderKind;
  onChange: (kind: TicketOrderKind) => void;
}

/**
 * W4 §16 — exactly Market, Limit and Stop. No Stop Limit, no trailing entry,
 * no OCO pair, no futures types.
 *
 * A real `radiogroup` with roving focus rather than three independent buttons:
 * arrow keys move between the options and select as they go, which is the
 * pattern assistive tech expects and the one the pre-W4 control only half
 * implemented (it had the roles but no keyboard navigation, so every option
 * was a separate tab stop).
 */
export function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  const move = (delta: number) => {
    const index = ORDER_KINDS.indexOf(value);
    const next = ORDER_KINDS[(index + delta + ORDER_KINDS.length) % ORDER_KINDS.length];
    if (next) onChange(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Type d’ordre"
      data-testid="order-type-selector"
      className="flex gap-0.5 rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-component-workstation-surface-sunken)] p-0.5"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {ORDER_KINDS.map((kind) => {
        const selected = value === kind;
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: the group is one tab stop, arrows move within it.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            className={[
              'flex-1 rounded-[var(--wariba-radius-xs)] px-2 py-1.5',
              'text-[length:var(--wariba-font-size-body-sm)] transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-border-focus)]',
              selected
                ? 'bg-[color:var(--wariba-surface-selected)] font-semibold text-[color:var(--wariba-theme-text)]'
                : 'text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-theme-text)]',
            ].join(' ')}
          >
            {ORDER_KIND_LABEL[kind]}
          </button>
        );
      })}
    </div>
  );
}
