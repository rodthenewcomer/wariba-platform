'use client';

import { memo, useState, type ReactNode } from 'react';
import {
  CompactEmptyState,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  WariXChevronDownIcon,
  WariXChevronUpIcon,
} from '@wariba/ui';
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
  /** True when the active panel has no row-level content. Desktop then occupies exactly 48px. */
  empty?: boolean;
  /**
   * Phone presentation. Five destination names do not fit a 390px tab strip, so
   * the fifth moves behind an overflow control rather than being clipped.
   */
  compact?: boolean;
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
/** What each surface says when it has nothing to report (VX1-C §7). */
const DOCK_EMPTY_TITLE: Record<DockTab, string> = {
  positions: 'Aucune position ouverte',
  orders: 'Aucun ordre en attente',
  trades: 'Aucune clôture exécutée',
  alerts: 'Aucune alerte active',
  account: 'Aucune activité',
};

export const WorkstationDock = memo(function WorkstationDock({
  store,
  snapshot,
  symbolSpecs,
  tab,
  onTabChange,
  collapsed,
  empty = false,
  compact = false,
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
  const [overflowOpen, setOverflowOpen] = useState(false);

  /**
   * Visual closure §14 — the count is a chip, not a trailing digit.
   *
   * "Positions 2" read as two words; an enclosed tabular count reads as a
   * quantity attached to a surface, which is what a trading dock's tab strip is
   * actually reporting. The chip takes the cobalt wash on the active tab so the
   * counter never competes with the tab it belongs to.
   */
  const label = (text: string, count: number) => (
    <>
      {text}
      {count > 0 ? (
        <span className="wariba-data min-w-[1.25rem] rounded-full bg-[color:var(--wariba-component-workstation-surface-control)] px-1.5 py-0.5 text-center text-[length:var(--wariba-component-workstation-type-meta)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)]">
          {count}
        </span>
      ) : null}
    </>
  );

  return (
    <section
      // The dock is no longer an account panel: it carries positions, orders,
      // trades and alerts, with Account as one tab among five. Its accessible
      // name names the whole surface, not its narrowest member.
      aria-label="Dock de trading"
      data-testid="workstation-dock"
      data-empty={empty ? 'true' : 'false'}
      /*
       * VX1-B §15 — the dock is a module of the workstation, not a table bolted
       * under the chart: raised graphite, a rim light along its own top edge and
       * a strong seam against the plot, so the boundary reads as machined.
       */
      className="flex min-h-0 min-w-0 flex-col border-t border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong)] lg:flex-1"
    >
      {resizeHandle}

      <Tabs
        value={tab}
        onValueChange={(next) => onTabChange(next as DockTab)}
        className="flex min-h-0 min-w-0 flex-col"
      >
        <div className="flex min-h-10 shrink-0 items-center gap-2 border-b border-[color:var(--wariba-component-workstation-seam-hairline)] bg-[color:var(--wariba-component-workstation-surface-shell)]/60 pr-1">
          {/* The tab strip is the one element allowed to be wider than the
              viewport, and only inside this box — never the document. */}
          <div
            data-testid="workstation-dock-tabs"
            className="flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden whitespace-nowrap"
          >
            <TabList variant="workstation" aria-label="Dock de trading">
              <Tab variant="workstation" value="positions">
                {label('Positions', openPositions)}
              </Tab>
              <Tab variant="workstation" value="orders">
                {label('Ordres', pendingOrders)}
              </Tab>
              <Tab variant="workstation" value="trades">
                Exécutions
              </Tab>
              <Tab variant="workstation" value="alerts">
                {label('Alertes', activeAlerts)}
              </Tab>
              {/*
               * Final closure §16 — the fifth destination overflows, it does not
               * truncate.
               *
               * At 390px the strip clipped "Account" to "ACC", which names
               * nothing. On a phone the four execution surfaces stay in the
               * strip and Account moves behind a "Plus" disclosure; the tab
               * itself is unchanged, still a real `role="tab"` in the same
               * tablist, so arrow-key navigation and the panel wiring are
               * untouched. It costs one extra tap to reach Account today, which
               * is the right trade against a destination whose name a trader
               * cannot read — and the pattern already holds whatever WX2 adds.
               *
               * Desktop keeps all five in the strip: it has the room.
               */}
              {!compact || overflowOpen || tab === 'account' ? (
                <Tab variant="workstation" value="account">
                  Compte
                </Tab>
              ) : null}
            </TabList>
            {compact && !overflowOpen && tab !== 'account' ? (
              <button
                type="button"
                onClick={() => setOverflowOpen(true)}
                aria-expanded={false}
                aria-label="Plus de surfaces d’activité"
                data-testid="workstation-dock-overflow"
                className="flex min-h-11 shrink-0 items-center gap-1 rounded-t-[7px] px-2 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
              >
                Plus
              </button>
            ) : null}
          </div>

          {!collapsed && empty ? (
            /*
             * VX1-C §7 — the strip states *which* surface is empty.
             *
             * The dock keeps its accepted behaviour of returning its body to the
             * chart when there is nothing to show, so the one line it can spare
             * has to do the work: "Aucune activité" was true of the dock and
             * silent about the tab the trader is actually looking at. The dock
             * does not grow by a pixel for this.
             */
            <CompactEmptyState
              title={DOCK_EMPTY_TITLE[tab]}
              className="hidden max-w-64 shrink truncate lg:flex"
            />
          ) : null}

          {/*
           * Collapsing is a *desktop* affordance: it returns the dock's grid
           * track to the chart. Inside the mobile sheet there is no track to
           * return — the sheet is the container and it has its own dismissal —
           * so the control did nothing but consume 44px of a 390px tab strip,
           * which is what pushed "Plus" to clip. Hiding it on phones is both
           * the honest behaviour and exactly the width the strip needed.
           */}
          {compact ? null : (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Déplier le dock' : 'Replier le dock'}
              data-testid="workstation-dock-collapse"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--wariba-component-workstation-radius-control)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-[background-color,color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-quick)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] hover:shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-px motion-reduce:transition-none lg:h-8 lg:w-8"
            >
              {collapsed ? <WariXChevronUpIcon /> : <WariXChevronDownIcon />}
            </button>
          )}
        </div>

        {/* Collapsed keeps the tab strip and its counts — the trader still sees
            which surface is active and how many positions are open — while the
            body's vertical space returns to the chart. */}
        {collapsed ? null : (
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-auto p-[var(--wariba-component-workstation-panel-padding)] ${empty ? 'lg:hidden' : ''}`}
          >
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
