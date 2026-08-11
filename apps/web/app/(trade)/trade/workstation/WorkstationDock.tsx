'use client';

import { memo, type ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from '@wariba/ui';
import type { AccountSnapshot, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { PositionsTabPanel } from '../PositionsTabPanel';
import type { TickStore } from '../tick-store';
import { AccountPanel, type AccountPanelProps } from './dock/AccountPanel';
import { AlertsPanel, type AlertsPanelProps } from './dock/AlertsPanel';
import { OrdersPanel } from './dock/OrdersPanel';
import { TradesPanel } from './dock/TradesPanel';

export const DOCK_TABS = ['positions', 'orders', 'trades', 'alerts', 'account'] as const;
export type DockTab = (typeof DOCK_TABS)[number];

export interface WorkstationDockProps {
  store: TickStore;
  snapshot: AccountSnapshot | null;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  tab: DockTab;
  onTabChange: (tab: DockTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  pending: boolean;
  onClosePosition: (positionId: string) => void;
  onModifyPosition: (positionId: string) => void;
  onPartialClosePosition: (positionId: string) => void;
  onOpenCloseAll: () => void;
  onManagePendingOrder: (pendingOrderId: string) => void;
  onCancelPendingOrder: (pendingOrderId: string) => void;
  alerts: AlertsPanelProps['alerts'];
  notifications: AlertsPanelProps['notifications'];
  onEnableAlert: (alertId: string) => void;
  onDisableAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onManageAlerts: () => void;
  account: Omit<AccountPanelProps, 'snapshot'>;
  /** The horizontal resize separator, supplied by the shell. */
  resizeHandle?: ReactNode;
}

/**
 * The trading dock, at its final W2 membership: **Positions · Orders · Trades ·
 * Alerts · Account** (W2 §15).
 *
 * Two surfaces left, for opposite reasons. Payout was a *program* workflow
 * sitting in an *execution* dock — it now lives on its canonical `/payouts`
 * route (W2 §16), reachable from the Account tab. Journal was a placeholder
 * sentence promising a future feature; it is deleted outright rather than
 * replaced by another "coming soon" panel (W2 §17). No dead UI.
 *
 * Only the active panel is mounted — `TabPanel` returns null when inactive — so
 * the Positions panel's `useAllTicks` subscription exists only while Positions
 * is the visible tab, and an inactive Orders/Trades/Alerts/Account tree costs
 * nothing per tick.
 */
export const WorkstationDock = memo(function WorkstationDock({
  store,
  snapshot,
  symbolSpecs,
  tab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  pending,
  onClosePosition,
  onModifyPosition,
  onPartialClosePosition,
  onOpenCloseAll,
  onManagePendingOrder,
  onCancelPendingOrder,
  alerts,
  notifications,
  onEnableAlert,
  onDisableAlert,
  onDeleteAlert,
  onManageAlerts,
  account,
  resizeHandle,
}: WorkstationDockProps) {
  // Counts only where the number is unambiguous (W2 §28). Open positions,
  // live pending orders and enabled alerts are each a complete current set.
  // Trades deliberately has none: the snapshot carries a bounded recent
  // window that would read as a lifetime total.
  const openPositions = snapshot?.openPositions.length ?? 0;
  const pendingOrders = snapshot?.pendingOrders.length ?? 0;
  const activeAlerts = alerts.filter((alert) => alert.enabled).length;

  const label = (text: string, count: number) => (
    <>
      {text}
      {count > 0 ? (
        <span className="wariba-data ml-1.5 text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-tertiary)]">
          {count}
        </span>
      ) : null}
    </>
  );

  return (
    <section
      aria-label="Compte"
      data-testid="workstation-dock"
      className="flex min-h-0 min-w-0 flex-col border-t border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] lg:flex-1"
    >
      {resizeHandle}

      <Tabs
        value={tab}
        onValueChange={(next) => onTabChange(next as DockTab)}
        className="flex min-h-0 min-w-0 flex-col"
      >
        <div className="flex shrink-0 items-center gap-2 pr-1">
          {/* The tab strip is the one element allowed to be wider than the
              viewport, and only inside this box — never the document. */}
          <div
            data-testid="workstation-dock-tabs"
            className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap"
          >
            <TabList aria-label="Compte">
              <Tab value="positions">{label('Positions', openPositions)}</Tab>
              <Tab value="orders">{label('Orders', pendingOrders)}</Tab>
              <Tab value="trades">Trades</Tab>
              <Tab value="alerts">{label('Alerts', activeAlerts)}</Tab>
              <Tab value="account">Account</Tab>
            </TabList>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Déplier le dock' : 'Replier le dock'}
            data-testid="workstation-dock-collapse"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--wariba-radius-sm)] text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
        </div>

        {/* Collapsed keeps the tab strip and its counts — the trader still sees
            which surface is active and how many positions are open — while the
            body's vertical space returns to the chart. */}
        {collapsed ? null : (
          <div className="min-h-0 min-w-0 flex-1 overflow-auto p-[var(--wariba-component-workstation-panel-padding)]">
            <TabPanel value="positions">
              <PositionsTabPanel
                store={store}
                openPositions={snapshot?.openPositions ?? []}
                symbolSpecs={symbolSpecs}
                onClosePosition={onClosePosition}
                onModifyPosition={onModifyPosition}
                onPartialClosePosition={onPartialClosePosition}
                onOpenCloseAll={onOpenCloseAll}
                pending={pending}
              />
            </TabPanel>

            <TabPanel value="orders">
              <OrdersPanel
                snapshot={snapshot}
                pending={pending}
                onManagePendingOrder={onManagePendingOrder}
                onCancelPendingOrder={onCancelPendingOrder}
              />
            </TabPanel>

            <TabPanel value="trades">
              <TradesPanel snapshot={snapshot} />
            </TabPanel>

            <TabPanel value="alerts">
              <AlertsPanel
                alerts={alerts}
                notifications={notifications}
                pending={pending}
                onEnableAlert={onEnableAlert}
                onDisableAlert={onDisableAlert}
                onDeleteAlert={onDeleteAlert}
                onManageAlerts={onManageAlerts}
              />
            </TabPanel>

            <TabPanel value="account">
              <AccountPanel {...account} snapshot={snapshot} />
            </TabPanel>
          </div>
        )}
      </Tabs>
    </section>
  );
});
