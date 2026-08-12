'use client';

import { memo, useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  MobileStructuredRow,
} from '@wariba/ui';
import type { AccountSnapshot } from '@wariba/contracts';
import { rejectionDetailFor } from '../../trade-copy';
import {
  ORDER_STATUS_BADGE_VARIANT,
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PENDING_ORDER_TYPE_LABEL,
} from '../../trade-labels';

type OrdersView = 'pending' | 'recent';

export interface OrdersPanelProps {
  snapshot: AccountSnapshot | null;
  pending: boolean;
  onManagePendingOrder: (pendingOrderId: string) => void;
  onCancelPendingOrder: (pendingOrderId: string) => void;
}

/**
 * The unified Orders dock destination (W2 §18).
 *
 * W1's dock had "En attente" and "Ordres" as two sibling tabs. They are folded
 * into one destination here, but **not** into one list: a pending order is a
 * live instruction waiting on a trigger, and a recent order is a settled
 * server outcome. Merging their rows would invite reading a rejected order as
 * something still working, so the segmented control switches between two
 * views over two distinct server collections.
 *
 * Both actions the pending list carried — Gérer and Annuler — are unchanged,
 * and every rejection still shows its reason rather than a bare code.
 */
export const OrdersPanel = memo(function OrdersPanel({
  snapshot,
  pending,
  onManagePendingOrder,
  onCancelPendingOrder,
}: OrdersPanelProps) {
  const [view, setView] = useState<OrdersView>('pending');
  const pendingOrders = snapshot?.pendingOrders ?? [];
  const recentOrders = snapshot?.recentOrders ?? [];

  const segment = (id: OrdersView, label: string, count: number | null) => (
    <button
      key={id}
      type="button"
      onClick={() => setView(id)}
      aria-pressed={view === id}
      className={`min-h-11 rounded-[var(--wariba-radius-sm)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-h-8 ${
        view === id
          ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
          : 'text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-theme-text)]'
      }`}
    >
      {label}
      {count !== null && count > 0 ? (
        <span className="wariba-data ml-1.5 text-[color:var(--wariba-text-tertiary)]">{count}</span>
      ) : null}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1" role="group" aria-label="Vue des ordres">
        {segment('pending', 'En attente', pendingOrders.length)}
        {/* No count on Récents: the snapshot carries a bounded recent window,
            so a number here would read as a lifetime total it is not. */}
        {segment('recent', 'Récents', null)}
      </div>

      {view === 'pending' ? (
        <>
          <div className="lg:hidden">
            {pendingOrders.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-[color:var(--wariba-component-workstation-text-secondary)]">
                Aucun ordre en attente.
              </p>
            ) : (
              pendingOrders.map((order) => (
                <MobileStructuredRow
                  key={order.id}
                  primary={`${order.symbol} · ${PENDING_ORDER_TYPE_LABEL[order.orderType]}`}
                  secondary={`Quantité ${order.quantity}`}
                  trailing={order.triggerPrice}
                  details="Statut · En attente"
                  action={
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        onClick={() => onManagePendingOrder(order.id)}
                        disabled={pending}
                      >
                        Gérer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-[color:var(--wariba-component-workstation-trading-rejection)]"
                        onClick={() => onCancelPendingOrder(order.id)}
                        disabled={pending}
                      >
                        Annuler
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </div>
          <div className="hidden lg:block">
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
                {pendingOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={5}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre en attente.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  pendingOrders.map((order) => (
                    <DataTableRow key={order.id}>
                      <DataTableCell>{PENDING_ORDER_TYPE_LABEL[order.orderType]}</DataTableCell>
                      <DataTableCell>{order.symbol}</DataTableCell>
                      <DataTableCell numeric>{order.quantity}</DataTableCell>
                      <DataTableCell numeric>{order.triggerPrice}</DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onManagePendingOrder(order.id)}
                          disabled={pending}
                        >
                          Gérer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancelPendingOrder(order.id)}
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
          </div>
        </>
      ) : (
        <>
          <div className="lg:hidden">
            {recentOrders.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-[color:var(--wariba-component-workstation-text-secondary)]">
                Aucun ordre.
              </p>
            ) : (
              recentOrders.map((order) => (
                <MobileStructuredRow
                  key={order.id}
                  primary={order.symbol ?? '—'}
                  secondary={ORDER_TYPE_LABEL[order.orderType]}
                  trailing={
                    <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  }
                  details={
                    order.status === 'rejected'
                      ? rejectionDetailFor(order.rejectionCode).reason
                      : 'Exécution traitée par le serveur'
                  }
                />
              ))
            )}
          </div>
          <div className="hidden lg:block">
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
                {recentOrders.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={4}
                      className="text-center text-[color:var(--wariba-text-secondary)]"
                    >
                      Aucun ordre.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  recentOrders.map((order) => (
                    <DataTableRow key={order.id}>
                      <DataTableCell>{ORDER_TYPE_LABEL[order.orderType]}</DataTableCell>
                      <DataTableCell>{order.symbol ?? '—'}</DataTableCell>
                      <DataTableCell align="right">
                        <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-[color:var(--wariba-text-secondary)]">
                        {order.status === 'rejected'
                          ? rejectionDetailFor(order.rejectionCode).reason
                          : '—'}
                      </DataTableCell>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
});
