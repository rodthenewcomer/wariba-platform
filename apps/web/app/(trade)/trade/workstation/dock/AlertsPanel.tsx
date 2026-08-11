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
  Text,
} from '@wariba/ui';
import type { AlertDirection, AlertNotificationDTO, PriceAlertDTO } from '@wariba/contracts';
import { formatOrderTimestamp } from '../../trade-labels';

const DIRECTION_LABEL: Record<AlertDirection, string> = {
  cross_above: 'Franchit au-dessus de',
  cross_below: 'Franchit en dessous de',
};

export interface AlertsPanelProps {
  alerts: PriceAlertDTO[];
  notifications: AlertNotificationDTO[];
  pending: boolean;
  onEnableAlert: (alertId: string) => void;
  onDisableAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onManageAlerts: () => void;
}

/**
 * The Alerts dock surface (W2 §20).
 *
 * There is no second alert engine and no second alert state here: the rows are
 * `useTradeSession`'s own `alerts` / `notifications`, and enable / disable /
 * delete are its own canonical commands. Creation deliberately stays with the
 * existing NotificationCenter and chart workflow — a second creation path
 * would be a second place for alert semantics to drift.
 *
 * This panel holds no tick subscription. An alert's threshold is a stored
 * server value, not a live quote, so nothing here needs to move with the
 * market.
 */
export const AlertsPanel = memo(function AlertsPanel({
  alerts,
  notifications,
  pending,
  onEnableAlert,
  onDisableAlert,
  onDeleteAlert,
  onManageAlerts,
}: AlertsPanelProps) {
  const recentTriggers = notifications.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text variant="label-sm" color="tertiary">
          Alertes actives
        </Text>
        <Button variant="ghost" size="sm" onClick={onManageAlerts}>
          Créer / gérer
        </Button>
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableHeaderCell>Symbole</DataTableHeaderCell>
            <DataTableHeaderCell>Condition</DataTableHeaderCell>
            <DataTableHeaderCell align="right">Seuil</DataTableHeaderCell>
            <DataTableHeaderCell align="right">État</DataTableHeaderCell>
            <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {alerts.length === 0 ? (
            <DataTableRow>
              <DataTableCell
                colSpan={5}
                className="text-center text-[color:var(--wariba-text-secondary)]"
              >
                Aucune alerte.
              </DataTableCell>
            </DataTableRow>
          ) : (
            alerts.map((alert) => (
              <DataTableRow key={alert.id}>
                <DataTableCell>{alert.symbol}</DataTableCell>
                <DataTableCell>{DIRECTION_LABEL[alert.direction]}</DataTableCell>
                <DataTableCell numeric>{alert.thresholdPrice}</DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={alert.enabled ? 'success' : 'neutral'}>
                    {alert.enabled ? 'Active' : 'Désactivée'}
                  </Badge>
                </DataTableCell>
                <DataTableCell align="right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      alert.enabled ? onDisableAlert(alert.id) : onEnableAlert(alert.id)
                    }
                  >
                    {alert.enabled ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onDeleteAlert(alert.id)}
                    className="text-[color:var(--wariba-status-danger-text)]"
                  >
                    Supprimer
                  </Button>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      {recentTriggers.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text variant="label-sm" color="tertiary">
            Déclenchements récents
          </Text>
          <ul className="flex flex-col gap-1">
            {recentTriggers.map((notification) => (
              <li
                key={notification.id}
                className="flex items-center justify-between gap-3 text-[length:var(--wariba-font-size-body-sm)]"
              >
                <span className="text-[color:var(--wariba-text-primary)]">
                  {notification.symbol} ·{' '}
                  {notification.direction === 'cross_above' ? 'au-dessus de' : 'en dessous de'}{' '}
                  <span className="wariba-data">{notification.thresholdPrice}</span>
                </span>
                <span className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-secondary)]">
                  {notification.triggeringPrice} · {formatOrderTimestamp(notification.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
