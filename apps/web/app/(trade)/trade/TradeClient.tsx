'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Badge,
  BottomSheet,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Guardian,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  type BadgeVariant,
  type GuardianConcentrationBucket,
  type RiskRibbonStatus,
} from '@wariba/ui';
import {
  computeDailyLossUsedRatio,
  estimateRequiredMargin,
  isQuantityWithinBounds,
} from '@wariba/domain';
import {
  accountStateChannel,
  accountOrdersChannel,
  accountPositionsChannel,
  marketSymbolChannel,
  TRADABLE_SYMBOLS,
  type AccountRisk,
  type AccountSnapshot,
  type MarketStatus,
  type MarketTick,
  type OrderResultMessage,
  type SubmitOrderMessage,
  type CloseAllMessage,
  type TradableSymbol,
  type SymbolSpec,
  type PositionDTO,
  type FillDTO,
  type OrderDTO,
  type OrderType,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { OrderTicket, type OrderRejectionDetail } from './OrderTicket';
import { CloseAllDialog, type CloseAllOutcome } from './CloseAllDialog';
import { TradeHeaderPanel } from './TradeHeaderPanel';
import { WatchlistPanel } from './WatchlistPanel';
import { PositionsTabPanel } from './PositionsTabPanel';
import { createTickStore, useTick } from './tick-store';
import type { FillMarker } from './TradeChart';

// lightweight-charts touches the DOM/canvas directly and has no useful
// server-rendered output — Prompt 07's own performance requirement ("chart
// lazy-loaded"), and avoids paying its bundle cost before it's needed.
const TradeChart = dynamic(() => import('./TradeChart').then((m) => m.TradeChart), {
  ssr: false,
});

const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open: 'Ouvert',
  stale: 'Périmé',
  closed: 'Fermé',
};

// UX Architecture §23.3: normal < attention < near-limit < soft-lock, an
// early warning before the actual soft-lock gate (softLockTriggered/status)
// fires. Thresholds aren't specified numerically anywhere in the docs — 50%
// and 80% of today's daily-loss budget used are this component's own choice,
// not a rule figure.
const ATTENTION_THRESHOLD = '0.5';
const NEAR_LIMIT_THRESHOLD = '0.8';

const CONCENTRATION_BUCKET_LABEL: Record<string, string> = {
  forex: 'Forex (EUR/USD, GBP/USD, USD/JPY)',
  xauusd: 'Or (XAUUSD)',
  nas100: 'Indices (NAS100)',
};

// UX Architecture §22.10 — every rejection needs a reason, a code, and a
// possible action, never an ambiguous loss. These are the only rejection
// codes packages/database/src/trading.ts actually produces (REJECTION
// const in trading.ts) — no fabricated codes.
const REJECTION_DETAIL: Record<string, { reason: string; action: string }> = {
  account_not_active: {
    reason:
      'Votre compte n’est plus actif pour trader (blocage temporaire, dépassement de limite, ou statut inactif).',
    action: 'Consultez le Hub pour connaître le statut exact de votre compte.',
  },
  stale_market_data: {
    reason:
      'Le prix pour ce symbole n’était plus à jour au moment où le serveur a traité votre ordre.',
    action: 'Réessayez une fois le prix rafraîchi.',
  },
  invalid_quantity: {
    reason: 'La taille demandée est en dehors des bornes autorisées pour ce symbole.',
    action: 'Ajustez la quantité selon le pas et les bornes indiqués dans le ticket.',
  },
  unknown_symbol_spec: {
    reason: 'Ce symbole n’est pas configuré pour votre compte.',
    action: 'Contactez le support si le problème persiste.',
  },
  exposure_limit_exceeded: {
    reason: 'Cet ordre dépasserait votre exposition maximale autorisée sur ce groupe de symboles.',
    action: 'Réduisez la taille ou fermez une position existante sur ce groupe.',
  },
  short_duration_entry_locked: {
    reason:
      'Les nouvelles ouvertures sont temporairement suspendues après six clôtures profitables sous 60 secondes sur 24 h.',
    action:
      'Vous pouvez réduire ou fermer vos positions. Le verrou se lève lorsque le compteur glissant sur 24 h repasse sous six ; le signal reste disponible pour revue.',
  },
  position_not_found: {
    reason: 'La position visée n’existe plus.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
  position_already_closed: {
    reason: 'Cette position est déjà fermée.',
    action: 'Rafraîchissez vos positions ouvertes.',
  },
};
const UNKNOWN_REJECTION_DETAIL = {
  reason: 'Le serveur a refusé cet ordre.',
  action: 'Réessayez, ou contactez le support si le problème persiste.',
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  market_open: 'Ouverture',
  partial_close: 'Clôture partielle',
  full_close: 'Clôture',
  close_all: 'Tout fermer',
  modify_sl: 'Modif. SL',
  modify_tp: 'Modif. TP',
};

const ORDER_STATUS_LABEL: Record<OrderDTO['status'], string> = {
  received: 'Reçu',
  validated: 'Validé',
  accepted: 'Accepté',
  filled: 'Exécuté',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

const ORDER_STATUS_BADGE_VARIANT: Record<OrderDTO['status'], BadgeVariant> = {
  received: 'neutral',
  validated: 'neutral',
  accepted: 'information',
  filled: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const ELIGIBILITY_LABEL: Record<NonNullable<FillDTO['eligibilityReason']>, string> = {
  eligible: 'Éligible',
  short_duration_profit: 'Profit < 60 s',
  loss_counted: 'Perte comptée',
  breakeven: 'Neutre',
};

const ELIGIBILITY_BADGE_VARIANT: Record<NonNullable<FillDTO['eligibilityReason']>, BadgeVariant> = {
  eligible: 'success',
  short_duration_profit: 'warning',
  loss_counted: 'information',
  breakeven: 'neutral',
};

// UTC throughout WariX (RiskRibbon's "Reset 00:00 UTC", TradeChart's explicit
// UTC axis) — the History tab keeps that same reference timezone rather than
// silently switching to the browser's local time.
function formatOrderTimestamp(iso: string): string {
  return `${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))} UTC`;
}

function formatDuration(durationMs: string | null): string {
  if (durationMs === null) return '—';
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1_000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
}

function deriveRiskRibbonStatus(params: {
  risk: AccountRisk | null;
  isStale: boolean;
  isResyncing: boolean;
}): RiskRibbonStatus {
  if (params.isStale || params.isResyncing) return 'stale';
  if (!params.risk) return 'normal';
  if (params.risk.status === 'breached') return 'hard-breach';
  if (params.risk.status === 'soft_locked' || params.risk.dailyLoss.softLockTriggered) {
    return 'soft-lock';
  }
  const usedRatio = computeDailyLossUsedRatio(params.risk.dailyLoss);
  if (Number(usedRatio) >= Number(NEAR_LIMIT_THRESHOLD)) return 'near-limit';
  if (Number(usedRatio) >= Number(ATTENTION_THRESHOLD)) return 'attention';
  return 'normal';
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function TradeClient({ accountId, wsUrl }: { accountId: string; wsUrl: string }) {
  const clientRef = useRef<RealtimeClient | null>(null);
  const pendingCommandRef = useRef<
    | { kind: 'order'; payload: SubmitOrderMessage }
    | { kind: 'close_all'; payload: CloseAllMessage }
    | null
  >(null);
  // Keyed by the sub-order's own id (not pushed to an array) — a
  // resubscribe-triggered retry (see the account.snapshot handler below) can
  // replay the same idempotent close_all outcome, and this must converge to
  // the true position count rather than double-count a replay.
  const closeAllTrackerRef = useRef<{
    idempotencyKey: string;
    expectedCount: number;
    outcomes: Map<string, CloseAllOutcome>;
  } | null>(null);
  // Ticks live outside React state — see tick-store.ts's doc comment. A
  // stable, lazily-created store instance for this connection's lifetime.
  const [tickStore] = useState(() => createTickStore());
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [symbolSpecs, setSymbolSpecs] = useState<Partial<Record<TradableSymbol, SymbolSpec>>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<TradableSymbol>('EURUSD');
  const [quantity, setQuantity] = useState('0.10');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [pending, setPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState('positions');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false);
  const [closeAllResult, setCloseAllResult] = useState<CloseAllOutcome[] | null>(null);
  // §22.6 "historique d'exécution" — hydrated from the authoritative fill
  // history in AccountSnapshot and incremented immediately by order_result.
  const [fills, setFills] = useState<FillMarker[]>([]);

  useEffect(() => {
    const client = new RealtimeClient(wsUrl, getAccessToken);
    clientRef.current = client;

    const offState = client.onStateChange(setConnectionState);
    const offMessage = client.onMessage((envelope) => {
      if (envelope.type === 'account.snapshot') {
        const nextSnapshot = envelope.payload as AccountSnapshot;
        setSnapshot(nextSnapshot);
        setFills(
          nextSnapshot.recentFills.map((fill) => ({
            id: fill.id,
            symbol: fill.symbol,
            time: Math.floor(new Date(fill.occurredAt).getTime() / 1_000),
            price: Number(fill.price),
            side: fill.side,
            effect: fill.fillType,
          })),
        );
        const pendingCommand = pendingCommandRef.current;
        if (pendingCommand) {
          const key = pendingCommand.payload.idempotencyKey;
          const wasProcessed = nextSnapshot.recentOrders.some(
            (order) => order.idempotencyKey === key || order.idempotencyKey.startsWith(`${key}:`),
          );
          if (wasProcessed) {
            pendingCommandRef.current = null;
            setPending(false);
          } else if (pendingCommand.kind === 'order') {
            clientRef.current?.submitOrder(pendingCommand.payload);
          } else {
            clientRef.current?.closeAll(pendingCommand.payload);
          }
        }
      } else if (envelope.type === 'market.tick') {
        tickStore.update(envelope.payload as MarketTick);
      } else if (envelope.type === 'symbol_specs') {
        // Static for the session (services/realtime sends this once, right
        // after account.snapshot on the initial state-channel subscribe).
        const { specs } = envelope.payload as { specs: SymbolSpec[] };
        setSymbolSpecs(
          Object.fromEntries(specs.map((spec) => [spec.symbol, spec])) as Partial<
            Record<TradableSymbol, SymbolSpec>
          >,
        );
      } else if (envelope.type === 'account.risk_preview') {
        // Throttled server push (services/realtime) — only equity/risk change
        // here, positions/orders/balance stay whatever the last real
        // account.snapshot said (see accountRiskPreviewMessageSchema's doc
        // comment for why this is a separate, untracked message type).
        const preview = envelope.payload as {
          accountId: string;
          equity: string;
          risk: AccountRisk | null;
        };
        setSnapshot((prev) =>
          prev && prev.accountId === preview.accountId
            ? { ...prev, equity: preview.equity, risk: preview.risk }
            : prev,
        );
      } else if (envelope.type === 'order_result') {
        const result = envelope.payload as OrderResultMessage;
        const pendingCommand = pendingCommandRef.current;
        const tracker = closeAllTrackerRef.current;
        const isCloseAllResult =
          pendingCommand?.kind === 'close_all' &&
          pendingCommand.payload.idempotencyKey === result.idempotencyKey &&
          tracker !== null &&
          Boolean(result.order);

        if (isCloseAllResult && result.order) {
          tracker.outcomes.set(result.order.id, {
            symbol: result.order.symbol,
            status: result.status,
            rejectionCode: result.rejectionCode,
          });
          if (tracker.outcomes.size >= tracker.expectedCount) {
            pendingCommandRef.current = null;
            setPending(false);
            setCloseAllResult([...tracker.outcomes.values()]);
            closeAllTrackerRef.current = null;
          }
        } else {
          if (pendingCommand?.payload.idempotencyKey === result.idempotencyKey) {
            pendingCommandRef.current = null;
            setPending(false);
          }
          if (result.status === 'rejected') {
            setOrderError(result.rejectionCode ?? 'unknown_error');
          } else {
            setOrderError(null);
          }
        }
        if (result.fill) {
          const fill = result.fill;
          // A resubscribe-triggered retry (the account.snapshot handler
          // above) can resend an already-processed order — the server
          // replays the same idempotent outcome, fill included, so dedupe
          // on the fill's own id rather than blindly appending.
          setFills((prev) =>
            prev.some((f) => f.id === fill.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: fill.id,
                    symbol: fill.symbol,
                    time: Math.floor(new Date(fill.occurredAt).getTime() / 1000),
                    price: Number(fill.price),
                    side: fill.side,
                    effect: fill.fillType,
                  },
                ],
          );
        }
        // Server always answers a (re)subscribe with a fresh full snapshot —
        // simplest correct way to pick up the new position/order/balance.
        client.subscribe([accountStateChannel(accountId)]);
      } else if (envelope.type === 'error') {
        pendingCommandRef.current = null;
        setPending(false);
        const payload = envelope.payload as { code: string; message: string };
        setOrderError(payload.code);
      }
    });

    void client.connect().then(() => {
      client.subscribe([
        accountStateChannel(accountId),
        accountOrdersChannel(accountId),
        accountPositionsChannel(accountId),
        ...TRADABLE_SYMBOLS.map((s) => marketSymbolChannel(s)),
      ]);
    });

    return () => {
      offState();
      offMessage();
      client.close();
    };
  }, [accountId, wsUrl, tickStore]);

  // The only tick this component itself subscribes to — the selected
  // symbol's, needed by the chart/ticket/guardian below. Every other
  // symbol's ticks only ever reach WatchlistPanel's own rows.
  const selectedTick = useTick(tickStore, selectedSymbol);
  const isStale = selectedTick?.marketStatus === 'stale';
  const connectionOk = connectionState === 'open';
  const isResyncing = connectionState === 'resyncing';
  const risk = snapshot?.risk ?? null;
  const riskRibbonStatus = deriveRiskRibbonStatus({ risk, isStale, isResyncing });
  const isShortDurationEntryLocked = risk?.shortDurationMonitoring.status === 'entry_locked';
  const isRiskLocked =
    riskRibbonStatus === 'soft-lock' ||
    riskRibbonStatus === 'hard-breach' ||
    isShortDurationEntryLocked;
  const symbolPositions: PositionDTO[] = useMemo(
    () => snapshot?.openPositions.filter((p) => p.symbol === selectedSymbol) ?? [],
    [snapshot, selectedSymbol],
  );
  const symbolFills = useMemo(
    () => fills.filter((f) => f.symbol === selectedSymbol),
    [fills, selectedSymbol],
  );

  // Guardian (UX Architecture §22.8) — impact potentiel of the current
  // Order Ticket draft. Side-agnostic on purpose: the exposure gate
  // (isAggregateExposureAllowed) sums raw quantities regardless of buy/sell,
  // so margin/exposure impact don't depend on a chosen side either. Null
  // until a symbol spec + a live tick + a priced account exist — no
  // fabricated numbers before then.
  const guardianProps = useMemo(() => {
    const spec = symbolSpecs[selectedSymbol];
    if (!spec || !selectedTick || !risk) return null;
    const midPrice = ((Number(selectedTick.bid) + Number(selectedTick.ask)) / 2).toFixed(
      spec.pricePrecision,
    );
    const marginEstimated = estimateRequiredMargin({
      quantity,
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
      symbol: selectedSymbol,
      quantityFormatted: quantity,
      marginEstimatedFormatted: `${marginEstimated} USD`,
      dailyLossRemainingFormatted: `${risk.dailyLoss.remaining} USD`,
      maximumLossRemainingFormatted: `${risk.maximumLoss.remaining} USD`,
      concentration,
      isPriceStale: selectedTick.marketStatus === 'stale',
    };
  }, [symbolSpecs, selectedSymbol, selectedTick, risk, quantity]);

  const submitMarketOrder = useCallback(
    (side: 'buy' | 'sell') => {
      if (!clientRef.current) return;
      setPending(true);
      setOrderError(null);
      const command: SubmitOrderMessage = {
        orderType: 'market_open',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        symbol: selectedSymbol,
        side,
        quantity,
        ...(stopLoss.trim() ? { stopLoss: stopLoss.trim() } : {}),
        ...(takeProfit.trim() ? { takeProfit: takeProfit.trim() } : {}),
      };
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId, selectedSymbol, quantity, stopLoss, takeProfit],
  );

  // Client-side bounds check for instant feedback — the server (INVALID_QUANTITY,
  // packages/database/src/trading.ts) is the real gate; this only saves a
  // round trip for an obviously-wrong value.
  const quantityError = useMemo(() => {
    const spec = symbolSpecs[selectedSymbol];
    if (!spec || quantity.trim() === '') return null;
    const withinBounds = isQuantityWithinBounds({
      quantity,
      minimumQuantity: spec.minimumQuantity,
      maximumQuantity: spec.maximumQuantity,
      quantityStep: spec.quantityStep,
    });
    return withinBounds
      ? null
      : `Doit être entre ${spec.minimumQuantity} et ${spec.maximumQuantity}, par pas de ${spec.quantityStep}.`;
  }, [symbolSpecs, selectedSymbol, quantity]);

  const submitDisabled = !connectionOk || isStale || isRiskLocked || Boolean(quantityError);

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
        : quantityError;

  const rejection: OrderRejectionDetail | null = orderError
    ? { code: orderError, ...(REJECTION_DETAIL[orderError] ?? UNKNOWN_REJECTION_DETAIL) }
    : null;

  const closePosition = useCallback(
    (positionId: string) => {
      if (!clientRef.current) return;
      setPending(true);
      const command: SubmitOrderMessage = {
        orderType: 'full_close',
        accountId,
        idempotencyKey: crypto.randomUUID(),
        positionId,
      };
      pendingCommandRef.current = { kind: 'order', payload: command };
      clientRef.current.submitOrder(command);
    },
    [accountId],
  );

  const openCloseAllDialog = useCallback(() => {
    setCloseAllResult(null);
    setCloseAllDialogOpen(true);
  }, []);

  const confirmCloseAll = useCallback(() => {
    if (!clientRef.current || !snapshot || snapshot.openPositions.length === 0) return;
    const command: CloseAllMessage = { accountId, idempotencyKey: crypto.randomUUID() };
    closeAllTrackerRef.current = {
      idempotencyKey: command.idempotencyKey,
      expectedCount: snapshot.openPositions.length,
      outcomes: new Map(),
    };
    setCloseAllResult(null);
    setPending(true);
    pendingCommandRef.current = { kind: 'close_all', payload: command };
    clientRef.current.closeAll(command);
  }, [accountId, snapshot]);

  const orderTicket = useMemo(
    () => (
      <div className="flex flex-col gap-4">
        <OrderTicket
          accountPublicId={accountId.slice(0, 8).toUpperCase()}
          symbol={selectedSymbol}
          spec={symbolSpecs[selectedSymbol] ?? null}
          tick={selectedTick}
          quantity={quantity}
          onQuantityChange={setQuantity}
          quantityError={quantityError}
          stopLoss={stopLoss}
          onStopLossChange={setStopLoss}
          takeProfit={takeProfit}
          onTakeProfitChange={setTakeProfit}
          onSubmit={submitMarketOrder}
          pending={pending}
          submitDisabled={submitDisabled}
          disabledMessage={disabledMessage}
          rejection={rejection}
        />

        {guardianProps ? (
          <Guardian {...guardianProps} />
        ) : (
          <Text variant="body-sm" color="tertiary">
            Guardian sera actif après votre première journée de trading.
          </Text>
        )}
      </div>
    ),
    [
      accountId,
      selectedSymbol,
      symbolSpecs,
      selectedTick,
      quantity,
      quantityError,
      stopLoss,
      takeProfit,
      submitMarketOrder,
      pending,
      submitDisabled,
      disabledMessage,
      rejection,
      guardianProps,
    ],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <TradeHeaderPanel
          accountId={accountId}
          nominalFormatted={snapshot ? `${snapshot.nominalBalance} USD` : '—'}
          balanceFormatted={snapshot ? `${snapshot.balance} USD` : '—'}
          equityFormatted={snapshot ? `${snapshot.equity} USD` : '—'}
          programEligibleBalanceFormatted={
            snapshot ? `${snapshot.programEligibleBalance} USD` : '—'
          }
          connectionOk={connectionOk}
          riskRibbonStatus={riskRibbonStatus}
          risk={risk}
          isResyncing={isResyncing}
        />
        {/* UX Architecture §22.2's layout diagram lists "Market Status" as its
            own header element alongside Account Context/Risk Ribbon — the
            selected symbol's session state, distinct from RiskRibbon's own
            dot (WS connection quality, a different concern entirely). Stays
            outside TradeHeaderPanel since, unlike the rest of the header, it
            genuinely needs the selected symbol's tick. */}
        <div className="flex items-center gap-2 text-[length:var(--wariba-font-size-body-sm)]">
          <Text as="span" color="secondary">
            Marché {selectedSymbol}
          </Text>
          <span
            className={`font-medium ${
              selectedTick?.marketStatus === 'stale'
                ? 'text-[color:var(--wariba-status-warning-text)]'
                : 'text-[color:var(--wariba-text-primary)]'
            }`}
          >
            {selectedTick ? MARKET_STATUS_LABEL[selectedTick.marketStatus] : '—'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <WatchlistPanel
          store={tickStore}
          symbolSpecs={symbolSpecs}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
        />

        <div className="flex min-h-[280px] flex-1 flex-col gap-2 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:border-b-0 lg:border-r">
          <TradeChart
            symbol={selectedSymbol}
            tick={selectedTick}
            positions={symbolPositions}
            fills={symbolFills}
            connectionState={connectionState}
          />
          <Button variant="secondary" className="lg:hidden" onClick={() => setTicketOpen(true)}>
            Trader {selectedSymbol}
          </Button>
        </div>

        <aside className="hidden p-[var(--wariba-component-trade-panel-padding)] lg:flex lg:w-[var(--wariba-size-trade-order-ticket-max)] lg:flex-col">
          {orderTicket}
        </aside>
      </div>

      <BottomSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={`Trader ${selectedSymbol}`}
      >
        {orderTicket}
      </BottomSheet>

      <CloseAllDialog
        open={closeAllDialogOpen}
        onClose={() => setCloseAllDialogOpen(false)}
        onConfirm={confirmCloseAll}
        positionCount={snapshot?.openPositions.length ?? 0}
        accountPublicId={accountId.slice(0, 8).toUpperCase()}
        pending={pending}
        result={closeAllResult}
      />

      <div className="border-t border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Compte">
            <Tab value="positions">Positions</Tab>
            <Tab value="orders">Ordres</Tab>
            <Tab value="history">Historique</Tab>
            <Tab value="journal">Journal</Tab>
          </TabList>
          <TabPanel value="positions">
            <PositionsTabPanel
              store={tickStore}
              openPositions={snapshot?.openPositions ?? []}
              symbolSpecs={symbolSpecs}
              onClosePosition={closePosition}
              onOpenCloseAll={openCloseAllDialog}
              pending={pending}
            />
          </TabPanel>
          <TabPanel value="orders">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
                  <DataTableHeaderCell>Raison</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.recentOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={4}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{ORDER_TYPE_LABEL[o.orderType]}</DataTableCell>
                      <DataTableCell>{o.symbol ?? '—'}</DataTableCell>
                      <DataTableCell align="right">
                        <Badge variant={ORDER_STATUS_BADGE_VARIANT[o.status]}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-[color:var(--wariba-text-secondary)]">
                        {o.status === 'rejected'
                          ? (REJECTION_DETAIL[o.rejectionCode ?? '']?.reason ??
                            UNKNOWN_REJECTION_DETAIL.reason)
                          : '—'}
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="history">
            {snapshot?.profitEligibility.enabled && (
              <Text variant="body-sm" color="secondary" className="mb-3 block max-w-4xl">
                La balance réelle inclut chaque résultat. Pour la progression WARIBA, seul le profit
                net positif d’une clôture détenue moins de 60 secondes est exclu. Les pertes nettes
                comptent toujours ; les commissions sont appliquées avant la classification.
              </Text>
            )}
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Clôture</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell>Sens</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Quantité</DataTableHeaderCell>
                  <DataTableHeaderCell>Ouverture → clôture</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Durée</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL net</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL éligible</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Règle</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot ||
                snapshot.recentFills.filter((fill) => fill.fillType === 'close').length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={9}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucune clôture exécutée.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentFills
                    .filter(
                      (
                        fill,
                      ): fill is FillDTO & {
                        eligibilityReason: NonNullable<FillDTO['eligibilityReason']>;
                      } => fill.fillType === 'close' && fill.eligibilityReason !== null,
                    )
                    .map((fill) => (
                      <DataTableRow key={fill.id}>
                        <DataTableCell numeric>
                          {formatOrderTimestamp(fill.occurredAt)}
                        </DataTableCell>
                        <DataTableCell>{fill.symbol}</DataTableCell>
                        <DataTableCell>{fill.side === 'buy' ? 'Achat' : 'Vente'}</DataTableCell>
                        <DataTableCell numeric>{fill.quantity}</DataTableCell>
                        <DataTableCell numeric>
                          {fill.openingPrice} → {fill.price}
                        </DataTableCell>
                        <DataTableCell numeric>{formatDuration(fill.durationMs)}</DataTableCell>
                        <DataTableCell numeric>{fill.netRealizedPnl ?? '—'} USD</DataTableCell>
                        <DataTableCell numeric>{fill.eligibleRealizedPnl ?? '—'} USD</DataTableCell>
                        <DataTableCell align="right">
                          <Badge variant={ELIGIBILITY_BADGE_VARIANT[fill.eligibilityReason]}>
                            {ELIGIBILITY_LABEL[fill.eligibilityReason]}
                          </Badge>
                        </DataTableCell>
                      </DataTableRow>
                    ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="journal">
            <Text variant="body-sm" color="tertiary">
              Le journal de trading (annotations, tags, revue de session) arrive dans un prompt
              ultérieur.
            </Text>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
