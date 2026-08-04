'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AccountContext,
  Alert,
  BottomSheet,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Guardian,
  RiskRibbon,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
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
  type AccountRisk,
  type AccountSnapshot,
  type MarketTick,
  type OrderResultMessage,
  type SubmitOrderMessage,
  type CloseAllMessage,
  type TradableSymbol,
  type SymbolSpec,
  type PositionDTO,
} from '@wariba/contracts';
import { RealtimeClient, type RealtimeConnectionState } from '../../../lib/realtime-client';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { TradeRiskDetail } from './TradeRiskDetail';
import { OrderTicket, type OrderRejectionDetail } from './OrderTicket';
import type { FillMarker } from './TradeChart';

// lightweight-charts touches the DOM/canvas directly and has no useful
// server-rendered output — Prompt 07's own performance requirement ("chart
// lazy-loaded"), and avoids paying its bundle cost before it's needed.
const TradeChart = dynamic(() => import('./TradeChart').then((m) => m.TradeChart), {
  ssr: false,
});

const SYMBOLS: TradableSymbol[] = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'];

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
    reason: 'Le prix pour ce symbole n’était plus à jour au moment où le serveur a traité votre ordre.',
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
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [symbolSpecs, setSymbolSpecs] = useState<Partial<Record<TradableSymbol, SymbolSpec>>>({});
  const [ticks, setTicks] = useState<Partial<Record<TradableSymbol, MarketTick>>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<TradableSymbol>('EURUSD');
  const [quantity, setQuantity] = useState('0.10');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [pending, setPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tab, setTab] = useState('positions');
  const [ticketOpen, setTicketOpen] = useState(false);
  // §22.6 "historique d'exécution" — session-only, see TradeChart's doc
  // comment for why nothing retroactive is possible (no fill price anywhere
  // in AccountSnapshot, only on the order_result that announces a fill).
  const [fills, setFills] = useState<FillMarker[]>([]);

  useEffect(() => {
    const client = new RealtimeClient(wsUrl, getAccessToken);
    clientRef.current = client;

    const offState = client.onStateChange(setConnectionState);
    const offMessage = client.onMessage((envelope) => {
      if (envelope.type === 'account.snapshot') {
        const nextSnapshot = envelope.payload as AccountSnapshot;
        setSnapshot(nextSnapshot);
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
        const tick = envelope.payload as MarketTick;
        setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
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
        const preview = envelope.payload as { accountId: string; equity: string; risk: AccountRisk | null };
        setSnapshot((prev) =>
          prev && prev.accountId === preview.accountId
            ? { ...prev, equity: preview.equity, risk: preview.risk }
            : prev,
        );
      } else if (envelope.type === 'order_result') {
        const result = envelope.payload as OrderResultMessage;
        if (pendingCommandRef.current?.payload.idempotencyKey === result.idempotencyKey) {
          pendingCommandRef.current = null;
          setPending(false);
        }
        if (result.status === 'rejected') {
          setOrderError(result.rejectionCode ?? 'unknown_error');
        } else {
          setOrderError(null);
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
        ...SYMBOLS.map((s) => marketSymbolChannel(s)),
      ]);
    });

    return () => {
      offState();
      offMessage();
      client.close();
    };
  }, [accountId, wsUrl]);

  const selectedTick = ticks[selectedSymbol] ?? null;
  const isStale = selectedTick?.marketStatus === 'stale';
  const connectionOk = connectionState === 'open';
  const isResyncing = connectionState === 'resyncing';
  const risk = snapshot?.risk ?? null;
  const riskRibbonStatus = deriveRiskRibbonStatus({ risk, isStale, isResyncing });
  const isRiskLocked = riskRibbonStatus === 'soft-lock' || riskRibbonStatus === 'hard-breach';
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
    const tick = ticks[selectedSymbol];
    if (!spec || !tick || !risk) return null;
    const midPrice = ((Number(tick.bid) + Number(tick.ask)) / 2).toFixed(spec.pricePrecision);
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
      isPriceStale: tick.marketStatus === 'stale',
    };
  }, [symbolSpecs, selectedSymbol, ticks, risk, quantity]);

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
        ? riskRibbonStatus === 'hard-breach'
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

  const closeAll = useCallback(() => {
    if (!clientRef.current) return;
    setPending(true);
    const command: CloseAllMessage = { accountId, idempotencyKey: crypto.randomUUID() };
    pendingCommandRef.current = { kind: 'close_all', payload: command };
    clientRef.current.closeAll(command);
  }, [accountId]);

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
        <AccountContext
          program="WARIBA ONE"
          nominalFormatted={snapshot ? `${snapshot.balance} USD` : '—'}
          publicId={accountId.slice(0, 8).toUpperCase()}
          statusLabel={connectionOk ? 'Actif' : 'Connexion...'}
          statusVariant={connectionOk ? 'success' : 'warning'}
        />
        <RiskRibbon
          status={riskRibbonStatus}
          dailyLossRemaining={risk ? `${risk.dailyLoss.remaining} USD` : '—'}
          maximumLossRemaining={risk ? `${risk.maximumLoss.remaining} USD` : '—'}
          nextResetLabel="00:00 UTC"
          connectionOk={connectionOk}
        />
        {risk && <TradeRiskDetail risk={risk} />}
        {isResyncing && (
          <Alert level="warning" title="Resynchronisation en cours">
            Un écart de séquence a été détecté. Les ordres restent bloqués jusqu&apos;au nouveau
            snapshot serveur.
          </Alert>
        )}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex flex-col gap-1 border-b border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)] lg:w-[var(--wariba-size-trade-watchlist-max)] lg:border-b-0 lg:border-r">
          <Text variant="label-sm" color="tertiary" className="mb-1">
            Watchlist
          </Text>
          {SYMBOLS.map((symbol) => {
            const t = ticks[symbol];
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => setSelectedSymbol(symbol)}
                className={`flex items-center justify-between rounded-[var(--wariba-radius-sm)] px-2 py-2 text-left ${
                  symbol === selectedSymbol ? 'bg-[color:var(--wariba-surface-selected)]' : ''
                }`}
              >
                <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-theme-text)]">
                  {symbol}
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                  {t ? `${t.bid} / ${t.ask}` : '— / —'}
                </span>
              </button>
            );
          })}
        </aside>

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

      <div className="border-t border-[color:var(--wariba-theme-border)] p-[var(--wariba-component-trade-panel-padding)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Compte">
            <Tab value="positions">Positions</Tab>
            <Tab value="orders">Ordres</Tab>
            <Tab value="history">Historique</Tab>
          </TabList>
          <TabPanel value="positions">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Taille</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">PnL réalisé</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Action</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.openPositions.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={4}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucune position ouverte.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.openPositions.map((p) => (
                    <DataTableRow key={p.id}>
                      <DataTableCell>
                        {p.symbol} · {p.side === 'buy' ? 'Achat' : 'Vente'}
                      </DataTableCell>
                      <DataTableCell align="right" className="wariba-data">
                        {p.openQuantity}
                      </DataTableCell>
                      <DataTableCell align="right" className="wariba-data">
                        {p.realizedPnl}
                      </DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => closePosition(p.id)}
                          disabled={pending}
                        >
                          Fermer
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
            {snapshot && snapshot.openPositions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={closeAll}
                disabled={pending}
              >
                Tout fermer
              </Button>
            )}
          </TabPanel>
          <TabPanel value="orders">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.recentOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={3}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.recentOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{o.orderType}</DataTableCell>
                      <DataTableCell>{o.symbol ?? '—'}</DataTableCell>
                      <DataTableCell align="right">{o.status}</DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </TabPanel>
          <TabPanel value="history">
            <Text variant="body-sm" color="tertiary">
              L&apos;historique complet arrive avec Prompt 07.
            </Text>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
