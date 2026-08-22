'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Select,
  Switch,
  Text,
  WariXDialog,
  WariXInlineStatus,
} from '@wariba/ui';
import type {
  AlertDirection,
  AlertNotificationDTO,
  AlertSource,
  PriceAlertDTO,
  TradableSymbol,
} from '@wariba/contracts';
import type { OrderRejectionDetail } from './execution/execution-contract';

export interface CreateAlertParams {
  symbol: TradableSymbol;
  direction: AlertDirection;
  thresholdPrice: string;
  source: AlertSource;
  recurrence: 'once' | 'every_crossing';
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  symbol: TradableSymbol;
  notifications: AlertNotificationDTO[];
  unreadCount: number;
  alerts: PriceAlertDTO[];
  pending: boolean;
  rejection: OrderRejectionDetail | null;
  onMarkAllRead: () => void;
  onEnableAlert: (alertId: string) => void;
  onDisableAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onCreateAlert: (params: CreateAlertParams) => void;
}

const DIRECTION_LABEL: Record<AlertDirection, string> = {
  cross_above: 'Franchit au-dessus de',
  cross_below: 'Franchit en dessous de',
};

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

function formatOccurredAt(iso: string): string {
  return `${new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso))} UTC`;
}

/**
 * Prompt 7 Appendix 07-D §16-§19 — bell-triggered notification center:
 * persisted alert-fire history (mark-read) plus management of the trader's
 * own price alerts (enable/disable/delete/create). Server-authoritative
 * throughout — every alert is evaluated exclusively by
 * services/realtime's tick loop (evaluateAlerts), never client-side; this
 * panel only ever reads AccountSnapshot-adjacent WS state and issues
 * create/modify/enable/disable/delete commands, the same command-response
 * shape every other WariX action already uses.
 */
export function NotificationCenter({
  open,
  onClose,
  symbol,
  notifications,
  unreadCount,
  alerts,
  pending,
  rejection,
  onMarkAllRead,
  onEnableAlert,
  onDisableAlert,
  onDeleteAlert,
  onCreateAlert,
}: NotificationCenterProps) {
  const [direction, setDirection] = useState<AlertDirection>('cross_above');
  const [thresholdPrice, setThresholdPrice] = useState('');
  const [source, setSource] = useState<AlertSource>('mid');
  const [recurrence, setRecurrence] = useState<'once' | 'every_crossing'>('once');

  const thresholdValid =
    thresholdPrice.trim() !== '' && DECIMAL_PATTERN.test(thresholdPrice.trim());

  const submitCreate = () => {
    if (!thresholdValid) return;
    onCreateAlert({ symbol, direction, thresholdPrice: thresholdPrice.trim(), source, recurrence });
    setThresholdPrice('');
  };

  return (
    <WariXDialog open={open} onClose={onClose} title="Notifications" size="md">
      <div className="flex flex-col gap-5">
        {rejection && (
          <WariXInlineStatus
            tone="danger"
            title="Commande refusée"
            description={rejection.reason}
          />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text variant="label-sm" color="tertiary">
              Historique des alertes déclenchées
            </Text>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={pending}>
                Tout marquer comme lu ({unreadCount})
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucune alerte déclenchée pour le moment.
            </Text>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex items-center justify-between gap-2 rounded-[var(--wariba-radius-sm)] px-2 py-1.5 ${
                    notification.readAt === null
                      ? 'bg-[color:var(--wariba-component-workstation-wash-selected)]'
                      : ''
                  }`}
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                    {notification.symbol} —{' '}
                    {notification.direction === 'cross_above' ? 'au-dessus de' : 'en dessous de'}{' '}
                    {notification.thresholdPrice} (atteint {notification.triggeringPrice})
                  </span>
                  <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {formatOccurredAt(notification.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[color:var(--wariba-theme-border)] pt-4">
          <Text variant="label-sm" color="tertiary">
            Mes alertes
          </Text>
          {alerts.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucune alerte configurée.
            </Text>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between gap-2">
                  <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                    {alert.symbol} · {DIRECTION_LABEL[alert.direction]} {alert.thresholdPrice}
                    {alert.triggerCount > 0 && (
                      <Badge variant="neutral" className="ml-1.5">
                        déclenchée {alert.triggerCount}×
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <Switch
                      label={`Activer l’alerte ${alert.symbol}`}
                      hideLabel
                      checked={alert.enabled}
                      onCheckedChange={(checked) =>
                        checked ? onEnableAlert(alert.id) : onDisableAlert(alert.id)
                      }
                      disabled={pending}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAlert(alert.id)}
                      disabled={pending}
                      className="text-[color:var(--wariba-status-danger-text)]"
                    >
                      Supprimer
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[color:var(--wariba-theme-border)] pt-4">
          <Text variant="label-sm" color="tertiary">
            Nouvelle alerte — {symbol}
          </Text>
          <Select
            label="Condition"
            value={direction}
            onChange={(e) => setDirection(e.target.value as AlertDirection)}
          >
            <option value="cross_above">Franchit au-dessus de</option>
            <option value="cross_below">Franchit en dessous de</option>
          </Select>
          <Input
            label="Prix seuil"
            type="text"
            inputMode="decimal"
            name="alertThreshold"
            value={thresholdPrice}
            onChange={(e) => setThresholdPrice(e.target.value)}
            {...(thresholdPrice.trim() !== '' && !thresholdValid
              ? { errorText: 'Doit être un nombre décimal valide.' }
              : {})}
          />
          <Select
            label="Source du prix"
            value={source}
            onChange={(e) => setSource(e.target.value as AlertSource)}
          >
            <option value="mid">Prix moyen (bid/ask)</option>
            <option value="bid">Bid</option>
            <option value="ask">Ask</option>
          </Select>
          <Select
            label="Récurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as 'once' | 'every_crossing')}
          >
            <option value="once">Une seule fois</option>
            <option value="every_crossing">À chaque franchissement</option>
          </Select>
          <Button
            variant="secondary"
            loading={pending}
            disabled={pending || !thresholdValid}
            onClick={submitCreate}
          >
            Créer l’alerte
          </Button>
        </div>
      </div>
    </WariXDialog>
  );
}
