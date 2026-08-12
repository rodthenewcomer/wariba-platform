'use client';

import { ModuleHeader } from '@wariba/ui';
import type { MarketTick, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { MARKET_STATUS_LABEL, MARKET_STATUS_SHORT_LABEL } from './execution-gating';

export interface ExecutionMarketHeaderProps {
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  tick: MarketTick | null;
  accountPublicId: string;
}

const DASH = '—';

const STATUS_DOT: Record<'open' | 'stale' | 'closed', string> = {
  open: 'bg-[color:var(--wariba-status-success-strong)]',
  stale: 'bg-[color:var(--wariba-status-warning-strong)]',
  closed: 'bg-[color:var(--wariba-text-tertiary)]',
};

/**
 * W4 §13/§14/§15/§57 — the instrument, its state, and the two prices the two
 * side actions reference.
 *
 * Bid sits on the left under the Sell action and Ask on the right under Buy,
 * matching the button order below, because that is the pairing the trader
 * needs to read in one glance — a sell opens at the bid, a buy at the ask
 * (`quotedPrice`, the server's own rule). The quotes are indicative: the fill
 * price is whatever the server computes at execution time, including adverse
 * slippage this display does not model.
 *
 * There is no daily change, no session high/low and no percentage: W3's
 * history has no approved reference semantics for such a figure, and W4 §13 is
 * explicit that this milestone adds no market statistics.
 *
 * The state chip carries its meaning as text, never as colour alone (§63), and
 * a stale or closed quote is marked right next to the numbers rather than
 * hidden behind a tooltip (§57).
 */
export function ExecutionMarketHeader({
  symbol,
  spec,
  tick,
  accountPublicId,
}: ExecutionMarketHeaderProps) {
  const status = tick?.marketStatus ?? null;
  const spread =
    tick && spec ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec.pricePrecision) : null;
  const quotesAreLive = status === 'open';

  return (
    <div className="flex flex-col" data-testid="execution-market-header">
      {/* §4 step 1 — instrument and live status, read before anything else. */}
      <ModuleHeader
        eyebrow="Exécution"
        title={symbol}
        status={
          <span
            className="flex items-center gap-1.5 font-medium uppercase tracking-[0.06em] text-[color:var(--wariba-component-workstation-text-secondary)]"
            data-testid="execution-market-status"
            data-market-status={status ?? 'unavailable'}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                status
                  ? STATUS_DOT[status]
                  : 'bg-[color:var(--wariba-component-workstation-text-tertiary)]'
              }`}
            />
            {status ? MARKET_STATUS_SHORT_LABEL[status] : 'Indisponible'}
            <span className="sr-only">
              {status ? MARKET_STATUS_LABEL[status] : 'Cotation indisponible'}
            </span>
          </span>
        }
        actions={
          <span
            className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-component-workstation-text-tertiary)]"
            title="Compte"
          >
            {accountPublicId}
          </span>
        }
      />

      {/*
       * Visual closure §5 — the quotes are the largest thing on the panel.
       *
       * They were `data-md` (16px) with `label-sm` (12px) labels above them, so
       * a label and its price were within one step of each other and neither
       * won. The price now runs at `data-lg` (24px) and the label drops to
       * `data-xs` (11px): a 13px gap, which is what makes "1.08504" register
       * before the word "Bid" does. Tabular figures throughout, so the digits
       * do not shift column as the last decimal ticks.
       *
       * The digits shown are the server's own strings at the instrument's
       * precision — nothing here rounds or reformats.
       */}
      <div className="grid min-h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-1.5 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-control)] px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[length:var(--wariba-font-size-data-xs)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
            Vente · Bid
          </span>
          <span
            data-testid="execution-bid"
            className={`wariba-data text-[length:var(--wariba-font-size-data-lg)] font-semibold leading-none tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-component-workstation-trading-live-bid)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.bid ?? DASH}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 pb-0.5">
          <span className="text-[length:var(--wariba-font-size-data-xs)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
            Spread
          </span>
          <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] tabular-nums text-[color:var(--wariba-text-secondary)]">
            {spread ?? DASH}
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[length:var(--wariba-font-size-data-xs)] uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
            Achat · Ask
          </span>
          <span
            data-testid="execution-ask"
            className={`wariba-data text-[length:var(--wariba-font-size-data-lg)] font-semibold leading-none tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-component-workstation-trading-live-ask)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.ask ?? DASH}
          </span>
        </div>
      </div>

      {tick && !quotesAreLive ? (
        <p className="px-3 py-1.5 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-component-workstation-trading-warning)]">
          {status === 'stale'
            ? 'Dernier prix connu — le flux n’est plus à jour.'
            : 'Dernier prix connu — marché fermé.'}
        </p>
      ) : null}
    </div>
  );
}
