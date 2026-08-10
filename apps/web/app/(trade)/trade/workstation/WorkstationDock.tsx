'use client';

import { memo } from 'react';
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@wariba/ui';
import type { AccountSnapshot, FillDTO, SymbolSpec, TradableSymbol } from '@wariba/contracts';
import { PayoutCenterPanel } from '../PayoutCenterPanel';
import { PositionsTabPanel } from '../PositionsTabPanel';
import type { TickStore } from '../tick-store';
import { rejectionDetailFor } from '../trade-copy';
import {
  ELIGIBILITY_BADGE_VARIANT,
  ELIGIBILITY_LABEL,
  ORDER_STATUS_BADGE_VARIANT,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PENDING_ORDER_TYPE_LABEL,
  formatDuration,
  formatOrderTimestamp,
} from '../trade-labels';

export interface WorkstationDockProps {
  store: TickStore;
  snapshot: AccountSnapshot | null;
  symbolSpecs: Partial<Record<TradableSymbol, SymbolSpec>>;
  tab: string;
  onTabChange: (tab: string) => void;
  pending: boolean;
  payoutAmount: string;
  payoutAmountError: string | null;
  onPayoutAmountChange: (value: string) => void;
  onRequestPayout: () => void;
  onClosePosition: (positionId: string) => void;
  onModifyPosition: (positionId: string) => void;
  onPartialClosePosition: (positionId: string) => void;
  onOpenCloseAll: () => void;
  onManagePendingOrder: (pendingOrderId: string) => void;
  onCancelPendingOrder: (pendingOrderId: string) => void;
}

/**
 * The trading dock, relocated into the workstation grid's bottom row.
 *
 * W1 deliberately keeps the dock's **membership** exactly as Prompt 08 left
 * it — Positions · En attente · Ordres · Historique · Payout · Journal. W2
 * owns collapse, resize, the Payout relocation and the Journal decision;
 * duplicating that judgement here would make the shell milestone
 * unreviewable.
 *
 * What W1 does close is the proven document-overflow defect the W0 audit
 * measured at 390 px (`scrollWidth 425 > clientWidth 390`, the six-button tab
 * strip): the strip now scrolls inside its own `overflow-x-auto` box, and the
 * panel body owns its own scrolling too, so neither can push the document
 * sideways. Same fix class as the Control shell overflow closed in Prompt 09
 * M6.
 */
export const WorkstationDock = memo(function WorkstationDock({
  store,
  snapshot,
  symbolSpecs,
  tab,
  onTabChange,
  pending,
  payoutAmount,
  payoutAmountError,
  onPayoutAmountChange,
  onRequestPayout,
  onClosePosition,
  onModifyPosition,
  onPartialClosePosition,
  onOpenCloseAll,
  onManagePendingOrder,
  onCancelPendingOrder,
}: WorkstationDockProps) {
  return (
    <section
      aria-label="Compte"
      data-testid="workstation-dock"
      // `lg:flex-1` only: on desktop the shell's dock cell is a fixed grid
      // track, and without it the panel sits at its content height, leaving
      // the bottom of the row as bare canvas. On mobile the cell is
      // content-sized (capped at 38dvh), so growing to a zero basis there
      // would fight the chart for the first screen.
      className="flex min-h-0 min-w-0 flex-col border-t border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] lg:flex-1"
    >
      <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 min-w-0 flex-col">
        {/* The tab strip is the one element allowed to be wider than the
            viewport, and only inside this box — never the document. */}
        <div
          data-testid="workstation-dock-tabs"
          // `whitespace-nowrap` is what makes the strip *scroll* rather than
          // wrap: without it the tabs keep their box and break their labels
          // onto a second line ("En attente"), which silently makes the dock
          // header taller instead of using the scroll box it already has.
          className="min-w-0 shrink-0 overflow-x-auto overflow-y-hidden whitespace-nowrap"
        >
          <TabList aria-label="Compte">
            <Tab value="positions">Positions</Tab>
            <Tab value="pending">En attente</Tab>
            <Tab value="orders">Ordres</Tab>
            <Tab value="history">Historique</Tab>
            {snapshot?.programType === 'WARIBA_PERFORMANCE' ? (
              <Tab value="payout">Payout</Tab>
            ) : null}
            <Tab value="journal">Journal</Tab>
          </TabList>
        </div>

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

          <TabPanel value="pending">
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Symbole</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Quantité</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Déclenchement</DataTableHeaderCell>
                  <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!snapshot || snapshot.pendingOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={5}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre en attente.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  snapshot.pendingOrders.map((o) => (
                    <DataTableRow key={o.id}>
                      <DataTableCell>{PENDING_ORDER_TYPE_LABEL[o.orderType]}</DataTableCell>
                      <DataTableCell>{o.symbol}</DataTableCell>
                      <DataTableCell numeric>{o.quantity}</DataTableCell>
                      <DataTableCell numeric>{o.triggerPrice}</DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onManagePendingOrder(o.id)}
                          disabled={pending}
                        >
                          Gérer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancelPendingOrder(o.id)}
                          disabled={pending}
                          className="text-[color:var(--wariba-status-danger-text)]"
                        >
                          Annuler
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
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
                        {o.status === 'rejected' ? rejectionDetailFor(o.rejectionCode).reason : '—'}
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

          {snapshot?.programType === 'WARIBA_PERFORMANCE' ? (
            <TabPanel value="payout">
              <PayoutCenterPanel
                performanceProgress={snapshot.performanceProgress}
                payoutRequests={snapshot.payoutRequests}
                requestedAmount={payoutAmount}
                onRequestedAmountChange={onPayoutAmountChange}
                onSubmit={onRequestPayout}
                pending={pending}
                amountError={payoutAmountError}
              />
            </TabPanel>
          ) : null}

          <TabPanel value="journal">
            <Text variant="body-sm" color="tertiary">
              Le journal de trading (annotations, tags, revue de session) arrive dans un prompt
              ultérieur.
            </Text>
          </TabPanel>
        </div>
      </Tabs>
    </section>
  );
});
