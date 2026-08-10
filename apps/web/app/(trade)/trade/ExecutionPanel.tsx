'use client';

import { memo, useMemo } from 'react';
import { Alert, Guardian, Text, type GuardianConcentrationBucket } from '@wariba/ui';
import { estimateRequiredMargin } from '@wariba/domain';
import type { AccountRisk, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { OrderTicket, type OrderRejectionDetail } from './OrderTicket';
import { CONCENTRATION_BUCKET_LABEL } from './trade-labels';
import { deriveRiskRibbonStatus } from './risk-status';
import {
  quantityErrorFor,
  triggerPriceErrorFor,
  type TicketDraft,
  type TicketDraftSetters,
} from './ticket-draft';
import { useTick, type TickStore } from './tick-store';

export interface ExecutionPanelProps {
  store: TickStore;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  accountPublicId: string;
  draft: TicketDraft;
  setters: TicketDraftSetters;
  risk: AccountRisk | null;
  connectionOk: boolean;
  isResyncing: boolean;
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  onSubmit: (side: 'buy' | 'sell') => void;
}

/**
 * W1 §16 — one of the four legitimate selected-symbol tick consumers. The
 * ticket shows the live bid/ask and Guardian prices the current draft against
 * it, so this surface genuinely re-renders per tick; nothing above it does.
 *
 * The submit gate is unchanged from the pre-split TradeClient: connection,
 * then market staleness, then risk lock, then the two client-side field
 * checks, in that order. Every value it reads is server-authoritative
 * (AccountSnapshot.risk, SymbolSpec) or a canonical domain helper — this
 * component introduces no arithmetic of its own.
 */
export const ExecutionPanel = memo(function ExecutionPanel({
  store,
  symbol,
  spec,
  accountPublicId,
  draft,
  setters,
  risk,
  connectionOk,
  isResyncing,
  pending,
  rejection,
  onSubmit,
}: ExecutionPanelProps) {
  const tick = useTick(store, symbol);
  const isStale = tick?.marketStatus === 'stale';

  const riskRibbonStatus = deriveRiskRibbonStatus({ risk, isStale, isResyncing });
  const isShortDurationEntryLocked = risk?.shortDurationMonitoring.status === 'entry_locked';
  const isRiskLocked =
    riskRibbonStatus === 'soft-lock' ||
    riskRibbonStatus === 'hard-breach' ||
    isShortDurationEntryLocked;

  const quantityError = quantityErrorFor(draft.quantity, spec);
  const triggerPriceError = triggerPriceErrorFor(draft.orderKind, draft.triggerPrice);

  const submitDisabled =
    !connectionOk ||
    isStale ||
    isRiskLocked ||
    Boolean(quantityError) ||
    Boolean(triggerPriceError);

  const disabledMessage = !connectionOk
    ? 'Connexion au serveur en cours…'
    : isStale
      ? 'Les nouvelles positions sont bloquées tant que le marché n’est pas à jour.'
      : isRiskLocked
        ? isShortDurationEntryLocked
          ? 'Les nouvelles ouvertures sont suspendues pour revue après six profits sous 60 secondes sur 24 h.'
          : riskRibbonStatus === 'hard-breach'
            ? 'La limite maximale de perte est dépassée. Aucun nouvel ordre possible.'
            : 'Votre compte est en blocage temporaire jusqu’au prochain reset à 00:00 UTC.'
        : (quantityError ?? triggerPriceError);

  // Guardian (UX Architecture §22.8) — impact potentiel of the current Order
  // Ticket draft. Side-agnostic on purpose: the exposure gate
  // (isAggregateExposureAllowed) sums raw quantities regardless of buy/sell,
  // so margin/exposure impact don't depend on a chosen side either. Null
  // until a symbol spec + a live tick + a priced account exist — no
  // fabricated numbers before then.
  const guardianProps = useMemo(() => {
    if (!spec || !tick || !risk) return null;
    const midPrice = ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision);
    const marginEstimated = estimateRequiredMargin({
      quantity: draft.quantity,
      price: midPrice,
      contractSize: spec.contractSize,
      leverage: spec.leverage,
    });
    const concentration: GuardianConcentrationBucket[] = risk.concentration.map((bucket) => ({
      bucket: bucket.bucket,
      label: CONCENTRATION_BUCKET_LABEL[bucket.bucket] ?? bucket.bucket,
      usedFormatted: bucket.usedQuantity,
      limitFormatted: bucket.limitQuantity,
      usedRatioPercent: Number(bucket.usedRatio) * 100,
    }));
    return {
      symbol,
      quantityFormatted: draft.quantity,
      marginEstimatedFormatted: `${marginEstimated} USD`,
      dailyLossRemainingFormatted: `${risk.dailyLoss.remaining} USD`,
      maximumLossRemainingFormatted: `${risk.maximumLoss.remaining} USD`,
      concentration,
      isPriceStale: tick.marketStatus === 'stale',
    };
  }, [spec, tick, risk, symbol, draft.quantity]);

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      {/* Kept from the pre-W1 header stack. The status bar carries the badge
          that says *that* the monitoring fired; this is where the trader is
          about to act, so it is where the full explanation belongs. The
          entry_locked case is additionally surfaced through the ticket's own
          disabledMessage above. */}
      {risk?.shortDurationMonitoring.status === 'warning' && (
        <Alert level="warning" title="Profits de très courte durée détectés">
          {risk.shortDurationMonitoring.count24h} clôtures profitables sous 60 secondes sur 24 h.
          Elles restent visibles mais ne comptent pas dans votre progression.
        </Alert>
      )}
      {risk?.shortDurationMonitoring.status === 'entry_locked' && (
        <Alert level="warning" title="Nouvelles ouvertures temporairement suspendues">
          Vous pouvez toujours réduire ou fermer vos positions. Le verrou suit une fenêtre glissante
          de 24 h ; le signal reste auditable pour revue du risque et aucune violation permanente
          n’est créée automatiquement.
        </Alert>
      )}
      {isResyncing && (
        <Alert level="warning" title="Resynchronisation en cours">
          Un écart de séquence a été détecté. Les ordres restent bloqués jusqu&apos;au nouveau
          snapshot serveur.
        </Alert>
      )}

      <OrderTicket
        accountPublicId={accountPublicId}
        symbol={symbol}
        spec={spec ?? null}
        tick={tick}
        quantity={draft.quantity}
        onQuantityChange={setters.setQuantity}
        quantityError={quantityError}
        stopLoss={draft.stopLoss}
        onStopLossChange={setters.setStopLoss}
        takeProfit={draft.takeProfit}
        onTakeProfitChange={setters.setTakeProfit}
        onSubmit={onSubmit}
        pending={pending}
        submitDisabled={submitDisabled}
        disabledMessage={disabledMessage}
        rejection={rejection}
        orderKind={draft.orderKind}
        onOrderKindChange={setters.setOrderKind}
        triggerPrice={draft.triggerPrice}
        onTriggerPriceChange={setters.setTriggerPrice}
        triggerPriceError={triggerPriceError}
      />

      {guardianProps ? (
        <Guardian {...guardianProps} />
      ) : (
        <Text variant="body-sm" color="tertiary">
          Guardian sera actif après votre première journée de trading.
        </Text>
      )}
    </div>
  );
});
