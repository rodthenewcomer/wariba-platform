'use client';

import { isPendingOrderCreationPriceValid } from '@wariba/domain';
import type { MarketTick, SymbolSpec } from '@wariba/contracts';
import { pendingOrderTypeFor, type ExecutionSide } from './execution-contract';
import { ExecutionField } from './ExecutionField';

export interface TriggerPriceControlProps {
  /** Never rendered for 'market' — the caller decides; this narrows the type. */
  orderKind: 'limit' | 'stop';
  spec: SymbolSpec | undefined;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

/**
 * Which sides this trigger price is currently creatable for.
 *
 * Delegates to `isPendingOrderCreationPriceValid` (@wariba/domain) — the exact
 * function `createPendingOrder` re-runs server-side under lock. W4 §20 is
 * explicit that a side-specific hint is allowed *only* when it comes from that
 * canonical rule, precisely so a third slightly-different bid/ask comparison
 * cannot drift between the Execution Center, the chart context menu and the
 * server. Returns null when there is nothing to compare against, in which case
 * the caller offers both sides and lets the server answer.
 */
export function creatableSidesFor(params: {
  orderKind: 'limit' | 'stop';
  triggerPrice: string;
  tick: MarketTick | null;
  hasError: boolean;
}): Record<ExecutionSide, boolean> | null {
  const { orderKind, triggerPrice, tick, hasError } = params;
  if (hasError || !tick || triggerPrice.trim() === '') return null;
  if (tick.marketStatus !== 'open') return null;
  const check = (side: ExecutionSide): boolean =>
    isPendingOrderCreationPriceValid({
      orderType: pendingOrderTypeFor(orderKind, side),
      triggerPrice: triggerPrice.trim(),
      currentBid: tick.bid,
      currentAsk: tick.ask,
    });
  return { buy: check('buy'), sell: check('sell') };
}

const RELATIONSHIP_HINT: Record<'limit' | 'stop', string> = {
  limit: 'Achat limite sous l’Ask · Vente limite au-dessus du Bid.',
  stop: 'Achat stop au-dessus de l’Ask · Vente stop sous le Bid · prix non garanti.',
};

const RELATIONSHIP_DETAIL: Record<'limit' | 'stop', string> = {
  limit:
    'Un achat limite doit être placé sous l’Ask et une vente limite au-dessus du Bid, sinon l’ordre s’exécuterait immédiatement.',
  stop: 'Un achat stop doit être placé au-dessus de l’Ask et une vente stop sous le Bid. Le prix n’est pas garanti : un écart de marché peut exécuter l’ordre au-delà du seuil.',
};

/**
 * W4 §18/§19 — the pending-order trigger level.
 *
 * The copy states the creation-side rule and, for stops, states plainly that
 * the stop price is not a guaranteed fill: the server fills at the first valid
 * quote after the trigger and a gap is explicitly allowed
 * (`clampPendingOrderFillPrice` clamps limit fills and deliberately exempts
 * stops). Nothing here re-implements the pending-order engine; the field is a
 * price input and the sides it is currently valid for come from the canonical
 * helper above.
 */
export function TriggerPriceControl({
  orderKind,
  spec,
  value,
  onChange,
  error,
}: TriggerPriceControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <ExecutionField
        label="Prix de déclenchement"
        prefix="Seuil"
        prefixClassName="text-[color:var(--wariba-component-workstation-interaction-selected-text)]"
        type="text"
        inputMode="decimal"
        name="triggerPrice"
        data-testid="trigger-price-input"
        accentClassName="bg-[color:var(--wariba-component-workstation-interaction-selected)]"
        placeholder={spec ? `0.${'0'.repeat(Math.max(0, spec.pricePrecision - 1))}0` : 'Prix'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        errorText={error}
      />
      {/*
       * Visual closure §11 — the rule, once, as metadata.
       *
       * The "valid on neither side" banner that used to live here is gone: it
       * was a footer sentence a trader had to map back onto two equally
       * emphasised buttons. `ExecutionActions` now de-saturates the side the
       * current quote does not support and labels it under that side, which is
       * the same information where the decision is actually made. This line
       * keeps the general rule for someone who has not typed a threshold yet.
       */}
      <p
        title={RELATIONSHIP_DETAIL[orderKind]}
        data-testid="trigger-price-hint"
        className="text-[length:var(--wariba-component-workstation-type-meta)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]"
      >
        {spec ? `${spec.pricePrecision} déc. · ` : ''}
        {RELATIONSHIP_HINT[orderKind]}
      </p>
    </div>
  );
}
