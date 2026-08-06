'use client';

import { useEffect, useRef } from 'react';
import { Text } from '@wariba/ui';
import type { MarketTick, PendingOrderType, PositionDTO } from '@wariba/contracts';
import { isPendingOrderCreationPriceValid } from '@wariba/domain';

/**
 * Prompt 7 Appendix 07-D — the chart's right-click (desktop) / long-press
 * (mobile) context menu. Appendix 07-C originally documented this menu as
 * having no pending-order/price-alert actions at all, since neither
 * subsystem existed yet (packages/database/src/pending-orders.ts and
 * price-alerts.ts). 07-D is an explicit scope override requiring both — the
 * "Do not show invalid pending-order choices" instruction now has real
 * teeth: PENDING_ORDER_TYPES_AT_PRICE below only ever suggests the order
 * types isPendingOrderCreationPriceValid (@wariba/domain, the exact same
 * function packages/database/src/pending-orders.ts's createPendingOrder
 * re-checks server-side) actually accepts at the clicked price — never a
 * disabled placeholder for the other two.
 */
export interface ChartContextMenuAction {
  key: string;
  label: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

export interface ChartContextMenuContentProps {
  clickedPriceFormatted: string;
  position: PositionDTO | null;
  tick: MarketTick | null;
  onMarketBuy: () => void;
  onMarketSell: () => void;
  onManageStopLoss: () => void;
  onManageTakeProfit: () => void;
  onPartialClose: () => void;
  onClosePosition: () => void;
  onPendingOrderRequest: (orderType: PendingOrderType) => void;
  onCreateAlertHere: () => void;
  disabled: boolean;
  disabledReason: string | null;
}

const PENDING_ORDER_TYPE_LABEL: Record<PendingOrderType, string> = {
  buy_limit: 'Achat Limite ici',
  sell_limit: 'Vente Limite ici',
  buy_stop: 'Achat Stop ici',
  sell_stop: 'Vente Stop ici',
};

const PENDING_ORDER_TYPES: readonly PendingOrderType[] = [
  'buy_limit',
  'sell_limit',
  'buy_stop',
  'sell_stop',
];

export function buildContextMenuActions(
  props: Omit<ChartContextMenuContentProps, 'disabled' | 'disabledReason'>,
): ChartContextMenuAction[] {
  const actions: ChartContextMenuAction[] = [
    { key: 'market_buy', label: 'Achat au marché', onSelect: props.onMarketBuy },
    { key: 'market_sell', label: 'Vente au marché', onSelect: props.onMarketSell },
  ];
  if (props.position) {
    actions.push(
      {
        key: 'manage_sl',
        label: props.position.stopLoss ? 'Déplacer le Stop Loss' : 'Ajouter un Stop Loss',
        onSelect: props.onManageStopLoss,
      },
      {
        key: 'manage_tp',
        label: props.position.takeProfit ? 'Déplacer le Take Profit' : 'Ajouter un Take Profit',
        onSelect: props.onManageTakeProfit,
      },
      {
        key: 'partial_close',
        label: 'Clôturer une partie de la position',
        onSelect: props.onPartialClose,
      },
      {
        key: 'close_position',
        label: 'Fermer la position',
        tone: 'danger',
        onSelect: props.onClosePosition,
      },
    );
  }
  if (props.tick) {
    for (const orderType of PENDING_ORDER_TYPES) {
      const valid = isPendingOrderCreationPriceValid({
        orderType,
        triggerPrice: props.clickedPriceFormatted,
        currentBid: props.tick.bid,
        currentAsk: props.tick.ask,
      });
      if (valid) {
        actions.push({
          key: `pending_${orderType}`,
          label: PENDING_ORDER_TYPE_LABEL[orderType],
          onSelect: () => props.onPendingOrderRequest(orderType),
        });
      }
    }
  }
  actions.push({
    key: 'create_alert',
    label: 'Créer une alerte ici',
    onSelect: props.onCreateAlertHere,
  });
  return actions;
}

/** Shared action-list content — TradeChart renders this inside an absolutely-positioned popover on desktop, and inside a BottomSheet on mobile (long press). */
export function ChartContextMenuContent({
  clickedPriceFormatted,
  position,
  disabled,
  disabledReason,
  ...actionProps
}: ChartContextMenuContentProps) {
  const actions = buildContextMenuActions({ clickedPriceFormatted, position, ...actionProps });
  return (
    <div
      className="flex flex-col gap-1"
      role="menu"
      aria-label={`Actions au prix ${clickedPriceFormatted}`}
    >
      <Text variant="label-sm" color="tertiary" className="wariba-data px-2 py-1">
        Prix {clickedPriceFormatted}
      </Text>
      {disabled && disabledReason && (
        <Text variant="body-sm" color="secondary" className="px-2 pb-1">
          {disabledReason}
        </Text>
      )}
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={action.onSelect}
          className={`rounded-[var(--wariba-radius-xs)] px-2 py-1.5 text-left text-[length:var(--wariba-font-size-body-sm)] hover:bg-[color:var(--wariba-surface-selected)] disabled:cursor-not-allowed disabled:opacity-50 ${
            action.tone === 'danger'
              ? 'text-[color:var(--wariba-status-danger-text)]'
              : 'text-[color:var(--wariba-text-primary)]'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export interface ChartContextMenuPopoverProps extends ChartContextMenuContentProps {
  x: number;
  y: number;
  onDismiss: () => void;
}

/** Desktop anchor: fixed-positioned near the right-click point, closes on outside click/Escape (TradeChart also closes it on symbol change and after a successful command). */
export function ChartContextMenuPopover({
  x,
  y,
  onDismiss,
  ...contentProps
}: ChartContextMenuPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[220px] rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-theme-border)] bg-[color:var(--wariba-background-elevated)] p-1 shadow-[var(--wariba-shadow-md)]"
      style={{ left: x, top: y }}
    >
      <ChartContextMenuContent {...contentProps} />
    </div>
  );
}
