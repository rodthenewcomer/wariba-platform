'use client';

import { ModuleHeader } from '@wariba/ui';
import { useQuoteDirection } from '../use-quote-direction';
import type { MarketTick, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { MARKET_STATUS_LABEL, MARKET_STATUS_SHORT_LABEL } from './execution-gating';

export interface ExecutionMarketHeaderProps {
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  tick: MarketTick | null;
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
export function ExecutionMarketHeader({ symbol, spec, tick }: ExecutionMarketHeaderProps) {
  /*
   * §9-G — the deck's two quotes tint briefly in the direction they moved.
   *
   * Attached here because this component is already handed the tick by a parent
   * that subscribes for the figures themselves, so the feedback costs no new
   * subscription and no extra render — the hook writes to these nodes directly.
   */
  const bidRef = useQuoteDirection<HTMLDivElement>(tick?.bid);
  const askRef = useQuoteDirection<HTMLDivElement>(tick?.ask);
  const status = tick?.marketStatus ?? null;
  const spread =
    tick && spec ? (Number(tick.ask) - Number(tick.bid)).toFixed(spec.pricePrecision) : null;
  const quotesAreLive = status === 'open';

  return (
    <div className="flex flex-col" data-testid="execution-market-header">
      {/* §4 step 1 — instrument and live status, read before anything else.
          The copper rule marks this module as the one WARIBA instrument on the
          desk that spends money. */}
      <ModuleHeader
        title={symbol}
        accent="identity"
        status={
          <span
            className={`flex items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] ring-1 ring-inset ${
              status === 'open'
                ? 'bg-[color:var(--wariba-component-workstation-wash-neutral)] text-[color:var(--wariba-component-workstation-text-secondary)] ring-[color:var(--wariba-component-workstation-border-hairline)]'
                : 'bg-[color:var(--wariba-component-workstation-wash-warning)] text-[color:var(--wariba-component-workstation-trading-warning)] ring-[color:var(--wariba-component-workstation-trading-warning)]/35'
            }`}
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
        /*
         * The account identifier used to sit here and the 1440 checkpoint
         * render showed what it cost: at 320px the header could not fit
         * "Exécution", the symbol, the state chip *and* a 19-character public
         * id, so the title truncated to "EUR…" — the one word in the panel that
         * must never be ambiguous was the word that got cut. It is not lost:
         * the same identifier is stated in the instrumentation bar under the
         * programme name, one glance away and never truncated, so showing it
         * twice was duplication that cost the instrument its name.
         */
      />

      {/*
       * Visual closure §12B — a quote deck, not a row of three labels.
       *
       * The deck is sunk to the workstation's deepest tone, below the module it
       * sits in, so it reads as a well cut into the instrument rather than as
       * another band of panel. Each quote carries a 2px rule in its own side
       * colour along the bottom edge of its cell — the cheapest possible way to
       * make a price feel like a live readout without animating anything on a
       * tick, which §20 forbids outright.
       *
       * The digits shown are the server's own strings at the instrument's
       * precision — nothing here rounds or reformats.
       */}
      <div className="grid min-h-[var(--wariba-component-workstation-quote-deck-height)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 border-b border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-quote-deck)] px-2.5 py-1.5">
        <div
          ref={bidRef}
          className="relative flex min-w-0 flex-col justify-center gap-1 rounded-[6px] pb-1"
        >
          <span className="text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Bid
          </span>
          <span
            data-testid="execution-bid"
            className={`wariba-data truncate text-[length:var(--wariba-component-workstation-type-instrument)] font-semibold leading-none tracking-[-0.02em] tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-component-workstation-trading-live-bid)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.bid ?? DASH}
          </span>
          <span
            aria-hidden="true"
            className={`absolute bottom-0 left-0 h-0.5 w-7 rounded-full ${
              quotesAreLive
                ? 'bg-[color:var(--wariba-component-workstation-trading-live-bid)]'
                : 'bg-[color:var(--wariba-component-workstation-border-strong)]'
            }`}
          />
        </div>

        {/* Spread sits between the two quotes as an enclosed chip: it is the
            relationship between them, not a third quote. */}
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Spread
          </span>
          <span className="wariba-data rounded-[5px] bg-[color:var(--wariba-component-workstation-wash-neutral)] px-1 py-0.5 text-[length:var(--wariba-component-workstation-type-meta)] font-medium leading-none tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)]">
            {spread ?? DASH}
          </span>
        </div>

        <div
          ref={askRef}
          className="relative flex min-w-0 flex-col items-end justify-center gap-1 rounded-[6px] pb-1"
        >
          <span className="text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Ask
          </span>
          <span
            data-testid="execution-ask"
            className={`wariba-data max-w-full truncate text-[length:var(--wariba-component-workstation-type-instrument)] font-semibold leading-none tracking-[-0.02em] tabular-nums ${
              quotesAreLive
                ? 'text-[color:var(--wariba-component-workstation-trading-live-ask)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {tick?.ask ?? DASH}
          </span>
          <span
            aria-hidden="true"
            className={`absolute bottom-0 right-0 h-0.5 w-7 rounded-full ${
              quotesAreLive
                ? 'bg-[color:var(--wariba-component-workstation-trading-live-ask)]'
                : 'bg-[color:var(--wariba-component-workstation-border-strong)]'
            }`}
          />
        </div>
      </div>

      {tick && !quotesAreLive ? (
        <p className="border-l-2 border-[color:var(--wariba-component-workstation-trading-warning)] bg-[color:var(--wariba-component-workstation-wash-warning)] px-2.5 py-1 text-[length:var(--wariba-component-workstation-type-label)] font-semibold leading-tight text-[color:var(--wariba-component-workstation-trading-warning)]">
          {status === 'stale'
            ? 'Dernier prix connu — le flux n’est plus à jour.'
            : 'Dernier prix connu — marché fermé.'}
        </p>
      ) : null}
    </div>
  );
}
