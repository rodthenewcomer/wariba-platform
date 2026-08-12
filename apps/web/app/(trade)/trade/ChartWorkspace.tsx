'use client';

import dynamic from 'next/dynamic';
import { memo, useMemo } from 'react';
import { ModuleHeader } from '@wariba/ui';
import type {
  AccountSnapshot,
  PendingOrderDTO,
  PendingOrderType,
  PositionDTO,
  PriceAlertDTO,
  SymbolSpec,
  TradableSymbol,
} from '@wariba/contracts';
import type { RealtimeConnectionState } from '../../../lib/realtime-client';
import type { ModifyPendingOrderParams } from './ModifyPendingOrderDialog';
import type { FillMarker } from './TradeChart';
import type { PendingOrderAction, PendingRiskAction } from './trade-session';
import { MARKET_STATUS_LABEL } from './trade-labels';
import { useTick, type TickStore } from './tick-store';
import type { ChartHistoryTransport } from './chart-history';

// lightweight-charts touches the DOM/canvas directly and has no useful
// server-rendered output — Prompt 07's own performance requirement ("chart
// lazy-loaded"), and avoids paying its bundle cost before it's needed.
const TradeChart = dynamic(() => import('./TradeChart').then((m) => m.TradeChart), {
  ssr: false,
});

/**
 * Every chart-originated command, as one stable object. Built once by the
 * workstation root from the session's stable command layer, so the chart's
 * prop identity never changes for a reason unrelated to the market.
 */
export interface ChartWorkspaceActions {
  onCommitLevel(params: {
    positionId: string;
    field: 'stop_loss' | 'take_profit';
    value: string | null;
  }): void;
  onOpenManage(positionId: string): void;
  onClosePosition(positionId: string): void;
  onMarketOrderRequest(side: 'buy' | 'sell'): void;
  onOpenPartialClose(positionId: string): void;
  onModifyPendingOrderTrigger(params: ModifyPendingOrderParams): void;
  onOpenManagePendingOrder(pendingOrderId: string): void;
  onCancelPendingOrder(pendingOrderId: string): void;
  onModifyAlertThreshold(params: { alertId: string; thresholdPrice: string }): void;
  onOpenManageAlert(): void;
  onDeleteAlert(alertId: string): void;
  onPendingOrderRequest(params: { orderType: PendingOrderType; triggerPrice: string }): void;
  onCreateAlertHere(thresholdPrice: string): void;
}

export interface ChartWorkspaceProps {
  store: TickStore;
  /** W5 §79 — scope key for the chart's browser-local analysis preferences and drawings. */
  accountId: string;
  /** W3 §30 — the chart data layer's history port, passed straight through to TradeChart. */
  historyTransport: ChartHistoryTransport;
  symbol: TradableSymbol;
  spec: SymbolSpec | undefined;
  snapshot: AccountSnapshot | null;
  fills: FillMarker[];
  alerts: PriceAlertDTO[];
  connectionState: RealtimeConnectionState;
  pendingRiskAction: PendingRiskAction | null;
  pendingOrderAction: PendingOrderAction | null;
  rejectedOrderAction: PendingOrderAction | null;
  commandPending: boolean;
  actions: ChartWorkspaceActions;
  onOpenMobileMarkets(): void;
}

/**
 * The selected market's chart surface, and the second of the four legitimate
 * selected-symbol tick consumers (W1 §16).
 *
 * This is where the tick subscription that used to sit at the top of
 * TradeClient now lives. Everything the chart derives from the selected
 * symbol — its positions, fills, pending orders, alerts and the market's
 * own status — is filtered here rather than upstream, so a tick reaches the
 * canvas and this header strip and stops.
 *
 * The market-status readout moved out of the global account header on
 * purpose (W1 §11): it is a property of the selected instrument, not of the
 * account, and sharing the header's visual language with the connection dot
 * was the semantic confusion the W0 audit recorded at §3B.
 */
export const ChartWorkspace = memo(function ChartWorkspace({
  store,
  accountId,
  historyTransport,
  symbol,
  spec,
  snapshot,
  fills,
  alerts,
  connectionState,
  pendingRiskAction,
  pendingOrderAction,
  rejectedOrderAction,
  commandPending,
  actions,
  onOpenMobileMarkets,
}: ChartWorkspaceProps) {
  const tick = useTick(store, symbol);

  const symbolPositions: PositionDTO[] = useMemo(
    () => snapshot?.openPositions.filter((p) => p.symbol === symbol) ?? [],
    [snapshot, symbol],
  );
  const symbolFills = useMemo(() => fills.filter((f) => f.symbol === symbol), [fills, symbol]);
  const symbolPendingOrders: PendingOrderDTO[] = useMemo(
    () => snapshot?.pendingOrders.filter((o) => o.symbol === symbol) ?? [],
    [snapshot, symbol],
  );
  const symbolAlerts: PriceAlertDTO[] = useMemo(
    () => alerts.filter((a) => a.symbol === symbol && a.enabled),
    [alerts, symbol],
  );

  return (
    <section
      aria-label={`Espace de travail ${symbol}`}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-module)] lg:border-y"
    >
      <ModuleHeader
        title={symbol}
        testId="chart-context-header"
        className="hidden lg:flex"
        status={
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              tick?.marketStatus === 'stale'
                ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
                : 'text-[color:var(--wariba-component-workstation-text-secondary)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                tick?.marketStatus === 'open'
                  ? 'bg-[color:var(--wariba-component-workstation-trading-buy)]'
                  : 'bg-current'
              }`}
            />
            {tick ? MARKET_STATUS_LABEL[tick.marketStatus] : 'Indisponible'}
          </span>
        }
        actions={
          tick ? (
            <div className="wariba-data flex items-center gap-2 text-[11px] tabular-nums">
              <span className="text-[color:var(--wariba-component-workstation-text-tertiary)]">
                BID{' '}
                <strong className="text-[color:var(--wariba-component-workstation-trading-live-bid)]">
                  {tick.bid}
                </strong>
              </span>
              <span className="text-[color:var(--wariba-component-workstation-text-tertiary)]">
                ASK{' '}
                <strong className="text-[color:var(--wariba-component-workstation-trading-live-ask)]">
                  {tick.ask}
                </strong>
              </span>
            </div>
          ) : null
        }
      />

      <TradeChart
        symbol={symbol}
        accountId={accountId}
        store={store}
        historyTransport={historyTransport}
        tick={tick}
        positions={symbolPositions}
        fills={symbolFills}
        connectionState={connectionState}
        spec={spec ?? null}
        accountEquity={snapshot?.equity ?? '0'}
        dailyLossRemaining={snapshot?.risk?.dailyLoss.remaining ?? null}
        pendingRiskAction={pendingRiskAction}
        commandPending={commandPending}
        onCommitLevel={actions.onCommitLevel}
        onOpenManage={actions.onOpenManage}
        onClosePosition={actions.onClosePosition}
        onMarketOrderRequest={actions.onMarketOrderRequest}
        onOpenPartialClose={actions.onOpenPartialClose}
        pendingOrders={symbolPendingOrders}
        alerts={symbolAlerts}
        pendingOrderAction={pendingOrderAction}
        rejectedOrderAction={rejectedOrderAction}
        onModifyPendingOrderTrigger={actions.onModifyPendingOrderTrigger}
        onOpenManagePendingOrder={actions.onOpenManagePendingOrder}
        onCancelPendingOrder={actions.onCancelPendingOrder}
        onModifyAlertThreshold={actions.onModifyAlertThreshold}
        onOpenManageAlert={actions.onOpenManageAlert}
        onDeleteAlert={actions.onDeleteAlert}
        onPendingOrderRequest={actions.onPendingOrderRequest}
        onCreateAlertHere={actions.onCreateAlertHere}
        onOpenMobileMarkets={onOpenMobileMarkets}
      />
    </section>
  );
});
