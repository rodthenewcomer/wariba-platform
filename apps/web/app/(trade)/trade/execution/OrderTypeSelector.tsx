'use client';

import { SegmentedControl } from '@wariba/ui';
import type { TicketOrderKind } from './execution-contract';

export const ORDER_KIND_LABEL: Record<TicketOrderKind, string> = {
  market: 'Au marché',
  limit: 'Limite',
  stop: 'Stop',
};

const ORDER_KINDS: readonly TicketOrderKind[] = ['market', 'limit', 'stop'];
const ORDER_KIND_OPTIONS = ORDER_KINDS.map((kind) => ({
  value: kind,
  label: ORDER_KIND_LABEL[kind],
}));

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
  return (
    <SegmentedControl
      label="Type d’ordre"
      value={value}
      options={ORDER_KIND_OPTIONS}
      onValueChange={onChange}
      compact
      testId="order-type-selector"
    />
  );
}
