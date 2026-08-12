'use client';

import { memo } from 'react';
import { quotedPrice } from '@wariba/domain';
import type { AccountRisk, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { ExecutionActions } from './execution/ExecutionActions';
import { ExecutionImpactSummary } from './execution/ExecutionImpactSummary';
import { ExecutionMarketHeader } from './execution/ExecutionMarketHeader';
import { ExecutionSection } from './execution/ExecutionSection';
import { ExecutionStatus } from './execution/ExecutionStatus';
import { OrderTypeSelector } from './execution/OrderTypeSelector';
import { ProtectionSection } from './execution/ProtectionSection';
import { QuantityControl } from './execution/QuantityControl';
import { TradeImpactPanel } from './execution/TradeImpactPanel';
import { TriggerPriceControl, creatableSidesFor } from './execution/TriggerPriceControl';
import type { ExecutionSide, OrderRejectionDetail } from './execution/execution-contract';
import { deriveExecutionGate } from './execution/execution-gating';
import { deriveProtectionPreview, deriveTradeImpact } from './execution/execution-impact';
import {
  protectionPriceErrorFor,
  quantityErrorFor,
  triggerPriceErrorFor,
  useTicketDraft,
  type TicketDraftStore,
} from './ticket-draft';
import { useTick, type TickStore } from './tick-store';

export interface ExecutionPanelProps {
  store: TickStore;
  draftStore: TicketDraftStore;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  accountPublicId: string;
  /** The account's server-priced equity, for the SL/TP impact preview. Null before the first snapshot. */
  equity: string | null;
  risk: AccountRisk | null;
  connectionOk: boolean;
  isResyncing: boolean;
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  onSubmit: (side: ExecutionSide) => void;
}

/**
 * The Execution Center (W4 §10/§11/§12) — one instrument, one draft, one
 * surface.
 *
 * Before W4 this panel was a stack of independently-boxed widgets: three
 * full-width `Alert` cards, then an `OrderTicket` card, then a `Guardian`
 * card, each with its own border, radius and 16px padding. On a 320px column
 * that pushed the Buy/Sell buttons below the fold whenever a single notice was
 * showing — the trader had to scroll a *trading panel* to reach the trade. The
 * sections below are the same information with the boxes removed: a hairline
 * seam and a small-caps heading per section (`ExecutionSection`), notices
 * reduced to a left-edge accent rule (`ExecutionStatus`), and the actions
 * pinned last where the eye ends up.
 *
 * **This component composes and derives; it does not compute.** Every number
 * shown comes from a canonical helper or verbatim from the server's snapshot
 * (see `execution-impact.ts`), every gate branch mirrors a rule the server
 * enforces anyway (see `execution-gating.ts`), and the arithmetic that could
 * produce a floating-point artefact lives in `@wariba/domain` where decimal.js
 * exists (see `execution-quantity.ts`). W4 §5's constraint — no new browser
 * arithmetic — is met structurally rather than by review.
 *
 * **Two subscriptions, both local.** The tick (W1 §16: one of the four
 * legitimate selected-symbol consumers) and the ticket draft. Both terminate
 * here: `TradeClient` holds the draft store but never reads it during render,
 * so a keystroke in the quantity field re-renders this panel and nothing above
 * it (W4 §68). That is why the draft is an external store rather than
 * `useState` in the composition root — see `ticket-draft.ts`.
 */
export const ExecutionPanel = memo(function ExecutionPanel({
  store,
  draftStore,
  symbol,
  spec,
  accountPublicId,
  equity,
  risk,
  connectionOk,
  isResyncing,
  pending,
  rejection,
  onSubmit,
}: ExecutionPanelProps) {
  const tick = useTick(store, symbol);
  const draft = useTicketDraft(draftStore);

  const quantityError = quantityErrorFor(draft.quantity, spec);
  const triggerPriceError = triggerPriceErrorFor(draft.orderKind, draft.triggerPrice);
  const stopLossError = protectionPriceErrorFor(draft.stopLoss);
  const takeProfitError = protectionPriceErrorFor(draft.takeProfit);

  const gate = deriveExecutionGate({
    connectionOk,
    isResyncing,
    tick,
    risk,
    quantityError,
    triggerPriceError,
    protectionError: stopLossError ?? takeProfitError,
  });

  // Not memoized, deliberately. Both derivations depend on `tick`, which is a
  // new object on every tick this panel subscribes to — a useMemo keyed on it
  // would recompute every time anyway while adding a dependency array that can
  // silently go stale. The pre-W4 panel memoized Guardian's props on exactly
  // the same (always-changing) key.
  const impactInput = { spec, tick, risk, equity, draft };
  const impact = deriveTradeImpact(impactInput);
  const protectionPreview = deriveProtectionPreview(impactInput);
  /** Null impact still owes an explanation; a populated one only needs the section for its detail. */
  const hasImpactDetail = impact === null || impact.concentration.length > 0 || impact.isPriceStale;

  /**
   * The price each action references: its own executable quote for a market
   * order (`quotedPrice` — the server's rule, not a re-implementation), and the
   * trigger level for a pending one, shown only once that level parses.
   */
  const referencePriceFor = (side: ExecutionSide): string | null => {
    if (draft.orderKind !== 'market') {
      if (triggerPriceError !== null) return null;
      return draft.triggerPrice.trim() || null;
    }
    if (!tick) return null;
    return quotedPrice({ bid: tick.bid, ask: tick.ask, positionSide: side, action: 'open' });
  };
  const referencePrice: Record<ExecutionSide, string | null> = {
    sell: referencePriceFor('sell'),
    buy: referencePriceFor('buy'),
  };

  const creatableSides =
    draft.orderKind === 'market'
      ? null
      : creatableSidesFor({
          orderKind: draft.orderKind,
          triggerPrice: draft.triggerPrice,
          tick,
          hasError: triggerPriceError !== null,
        });

  return (
    <div
      data-testid="execution-center"
      className="flex min-h-0 flex-1 flex-col bg-[color:var(--wariba-component-workstation-surface-module)]"
    >
      {/* The three quotes and the reason the trader cannot act: pinned, because
          neither is useful if it has scrolled away from the button. */}
      <div className="shrink-0">
        <ExecutionMarketHeader
          symbol={symbol}
          spec={spec}
          tick={tick}
          accountPublicId={accountPublicId}
        />
        <ExecutionStatus gate={gate} rejection={rejection} risk={risk} />
      </div>

      {/*
       * Only the *fields* scroll.
       *
       * The panel used to scroll as one block, which put the Buy/Sell actions
       * below the fold on a 900px-tall screen as soon as the protection
       * preview or a notice was showing — the pre-W4 defect W4 §36 exists to
       * fix, reintroduced by a different mechanism. With the header and the
       * actions pinned and this region owning the overflow, the two things
       * that spend money are on screen at every viewport and in every state,
       * whatever the sections between them grow to.
       */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ExecutionSection title="Type" testId="execution-order-type">
          <OrderTypeSelector value={draft.orderKind} onChange={draftStore.setOrderKind} />
          {draft.orderKind !== 'market' ? (
            <TriggerPriceControl
              orderKind={draft.orderKind}
              spec={spec}
              value={draft.triggerPrice}
              onChange={draftStore.setTriggerPrice}
              error={triggerPriceError}
            />
          ) : null}
        </ExecutionSection>

        <ExecutionSection title="Quantité" testId="execution-quantity">
          <QuantityControl
            spec={spec}
            value={draft.quantity}
            onChange={draftStore.setQuantity}
            error={quantityError}
          />
        </ExecutionSection>

        <ExecutionSection title="Protection" testId="execution-protection">
          <ProtectionSection
            spec={spec}
            stopLoss={draft.stopLoss}
            onStopLossChange={draftStore.setStopLoss}
            stopLossError={stopLossError}
            takeProfit={draft.takeProfit}
            onTakeProfitChange={draftStore.setTakeProfit}
            takeProfitError={takeProfitError}
            preview={protectionPreview}
          />
        </ExecutionSection>

        {/*
         * The section exists only when it has something the pinned summary
         * above the actions does not already carry — a concentration bucket,
         * or the stale-price caveat — or when there is no impact at all and
         * the panel owes the trader an explanation. Otherwise the heading
         * would stand over an empty box, which is exactly the "widget that
         * announces itself" the W4 redesign removed.
         */}
        {hasImpactDetail ? (
          <ExecutionSection title="Impact" testId="execution-impact">
            <TradeImpactPanel impact={impact} />
          </ExecutionSection>
        ) : null}
      </div>

      {/* Explicitly opaque, not merely last in the flow: the fields above
          scroll *under* this bar, and a transparent one would let a
          half-scrolled input show through the buttons. */}
      <div className="shrink-0 border-t border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] shadow-[0_-8px_16px_rgba(0,0,0,0.12)]">
        {/* §9 — margin and both loss budgets stay with the actions, whatever
            the Impact section above happens to be scrolled to. */}
        <ExecutionImpactSummary impact={impact} />
        <ExecutionActions
          orderKind={draft.orderKind}
          referencePrice={referencePrice}
          creatableSides={creatableSides}
          disabled={gate.entryBlocked}
          pending={pending}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
});
