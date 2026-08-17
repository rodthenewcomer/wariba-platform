'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  WariXAlertClockIcon,
  WariXBuyIcon,
  WariXCopyIcon,
  WariXEyeIcon,
  WariXEyeOffIcon,
  WariXFitContentIcon,
  WariXMagnetIcon,
  WariXObjectTreeIcon,
  WariXPreferencesIcon,
  WariXSellIcon,
  WariXStudiesIcon,
  WariXTrashIcon,
} from '@wariba/ui';
import type { MarketTick, PendingOrderType, PositionDTO } from '@wariba/contracts';
import { isPendingOrderCreationPriceValid } from '@wariba/domain';

/**
 * The chart's right-click (desktop) / long-press (mobile) context menu.
 *
 * Appendix 07-D established the trading half: pending-order suggestions are
 * filtered by `isPendingOrderCreationPriceValid` — the exact function
 * `createPendingOrder` re-checks server-side — so the menu never offers an order
 * type that would be rejected at the clicked price, and never shows a disabled
 * placeholder for the other two.
 *
 * Reopen §16 adds the rest of what a charting context menu is. WX1's menu was a
 * flat list of at most seven trading actions; the reference's is four grouped
 * bands covering price, trading, the chart view and the objects on it, and a
 * trader right-clicks a chart expecting all four. So the menu now carries:
 *
 * - **price** — create an alert at this exact price, copy this exact price;
 * - **trading** — unchanged, and still routed through the same command path;
 * - **chart** — fit the view, magnet the crosshair, open Settings;
 * - **objects** — object tree, remove drawings, remove indicators, visibility.
 *
 * **Nothing here bypasses execution authority** (§16). The trading entries call
 * the same callbacks the Execution Center's own controls call; this menu
 * constructs no order and sends no command of its own. It is a shortcut to a
 * prefilled intent, never a second execution path.
 *
 * **Disabling is scoped, not global.** A stale quote disables the *trading*
 * band, because a price you cannot trust must not become an order. It leaves the
 * chart and object bands enabled, because resetting a viewport or hiding a
 * drawing has nothing to do with quote freshness — and a menu that greys out
 * "Paramètres…" because the market went quiet is telling the trader something
 * untrue.
 */

export interface ChartContextMenuAction {
  key: string;
  label: string;
  tone?: 'default' | 'danger';
  icon?: ReactNode;
  /** Right-aligned state text — `Activé`, a count. Never a fake shortcut. */
  detail?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ChartContextMenuSection {
  id: string;
  actions: ChartContextMenuAction[];
  /** Trading actions go dead on a stale or disconnected quote; the rest do not. */
  followsQuote?: boolean;
}

/** Everything the chart-side (non-trading) bands need. All optional — the mobile sheet passes them too. */
export interface ChartContextMenuChartActions {
  onResetView?: () => void;
  onCopyPrice?: () => void;
  onOpenSettings?: () => void;
  onOpenObjectTree?: () => void;
  onToggleMagnet?: () => void;
  magnet?: boolean;
  onRemoveDrawings?: () => void;
  drawingCount?: number;
  onRemoveIndicators?: () => void;
  indicatorCount?: number;
  onToggleDrawingsHidden?: () => void;
  onToggleIndicatorsHidden?: () => void;
  drawingsHidden?: boolean;
  indicatorsHidden?: boolean;
}

export interface ChartContextMenuContentProps extends ChartContextMenuChartActions {
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

/**
 * The trading band, unchanged in behaviour and in order.
 *
 * Kept as its own exported function because it encodes the pending-order
 * validity rule, which is the one part of this menu with a correctness contract
 * rather than a presentational one.
 */
export function buildContextMenuActions(
  props: Omit<ChartContextMenuContentProps, 'disabled' | 'disabledReason'>,
): ChartContextMenuAction[] {
  const actions: ChartContextMenuAction[] = [
    {
      key: 'market_buy',
      label: 'Achat au marché',
      icon: <WariXBuyIcon size="toolbar" />,
      onSelect: props.onMarketBuy,
    },
    {
      key: 'market_sell',
      label: 'Vente au marché',
      icon: <WariXSellIcon size="toolbar" />,
      onSelect: props.onMarketSell,
    },
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
  return actions;
}

/** The full grouped menu: price, trading, chart, objects. */
export function buildContextMenuSections(
  props: Omit<ChartContextMenuContentProps, 'disabled' | 'disabledReason'>,
): ChartContextMenuSection[] {
  const sections: ChartContextMenuSection[] = [];

  const price: ChartContextMenuAction[] = [
    {
      key: 'create_alert',
      // §19 — the price is in the label, so the menu states exactly what it will
      // create rather than relying on the trader remembering where they clicked.
      label: `Créer une alerte @ ${props.clickedPriceFormatted}`,
      icon: <WariXAlertClockIcon size="toolbar" />,
      onSelect: props.onCreateAlertHere,
    },
  ];
  if (props.onCopyPrice) {
    price.push({
      key: 'copy_price',
      label: `Copier le prix ${props.clickedPriceFormatted}`,
      icon: <WariXCopyIcon size="toolbar" />,
      onSelect: props.onCopyPrice,
    });
  }
  sections.push({ id: 'price', actions: price, followsQuote: true });

  sections.push({ id: 'trading', actions: buildContextMenuActions(props), followsQuote: true });

  const chart: ChartContextMenuAction[] = [];
  if (props.onResetView) {
    chart.push({
      key: 'reset_view',
      label: 'Réinitialiser la vue',
      icon: <WariXFitContentIcon size="toolbar" />,
      onSelect: props.onResetView,
    });
  }
  if (props.onToggleMagnet) {
    chart.push({
      key: 'magnet',
      label: 'Aimanter le réticule aux valeurs OHLC',
      icon: <WariXMagnetIcon size="toolbar" />,
      ...(props.magnet ? { detail: 'Activé' } : {}),
      onSelect: props.onToggleMagnet,
    });
  }
  if (props.onOpenSettings) {
    chart.push({
      key: 'settings',
      label: 'Paramètres…',
      icon: <WariXPreferencesIcon size="toolbar" />,
      onSelect: props.onOpenSettings,
    });
  }
  if (chart.length > 0) sections.push({ id: 'chart', actions: chart });

  const objects: ChartContextMenuAction[] = [];
  if (props.onOpenObjectTree) {
    objects.push({
      key: 'object_tree',
      label: 'Arborescence des objets…',
      icon: <WariXObjectTreeIcon size="toolbar" />,
      onSelect: props.onOpenObjectTree,
    });
  }
  if (props.onToggleDrawingsHidden) {
    objects.push({
      key: 'hide_drawings',
      label: props.drawingsHidden ? 'Afficher les dessins' : 'Masquer les dessins',
      icon: props.drawingsHidden ? (
        <WariXEyeIcon size="toolbar" />
      ) : (
        <WariXEyeOffIcon size="toolbar" />
      ),
      onSelect: props.onToggleDrawingsHidden,
    });
  }
  if (props.onToggleIndicatorsHidden) {
    objects.push({
      key: 'hide_indicators',
      label: props.indicatorsHidden ? 'Afficher les indicateurs' : 'Masquer les indicateurs',
      icon: <WariXStudiesIcon size="toolbar" />,
      onSelect: props.onToggleIndicatorsHidden,
    });
  }
  if (props.onRemoveDrawings) {
    const count = props.drawingCount ?? 0;
    objects.push({
      key: 'remove_drawings',
      label: count === 1 ? 'Supprimer 1 dessin' : `Supprimer ${count} dessins`,
      icon: <WariXTrashIcon size="toolbar" />,
      tone: 'danger',
      disabled: count === 0,
      onSelect: props.onRemoveDrawings,
    });
  }
  if (props.onRemoveIndicators) {
    const count = props.indicatorCount ?? 0;
    objects.push({
      key: 'remove_indicators',
      label: count === 1 ? 'Désactiver 1 indicateur' : `Désactiver ${count} indicateurs`,
      disabled: count === 0,
      onSelect: props.onRemoveIndicators,
    });
  }
  if (objects.length > 0) sections.push({ id: 'objects', actions: objects });

  return sections;
}

/** Shared content — a popover on desktop, a BottomSheet on mobile (long press). */
export function ChartContextMenuContent({
  disabled,
  disabledReason,
  ...actionProps
}: ChartContextMenuContentProps) {
  const sections = buildContextMenuSections(actionProps);
  return (
    <div
      className="flex flex-col py-1"
      role="menu"
      aria-label={`Actions au prix ${actionProps.clickedPriceFormatted}`}
    >
      <div className="px-3 pb-1 pt-1">
        <p className="wariba-data text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          Prix {actionProps.clickedPriceFormatted}
        </p>
        {disabled && disabledReason && (
          <p className="pt-0.5 text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-trading-warning)]">
            {disabledReason}
          </p>
        )}
      </div>
      {sections.map((section, index) => (
        <div key={section.id}>
          {index > 0 && (
            <div
              aria-hidden="true"
              className="my-1 h-px bg-[color:var(--wariba-component-workstation-border-hairline)]"
            />
          )}
          {section.actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              data-testid={`chart-menu-${action.key}`}
              disabled={action.disabled === true || (section.followsQuote === true && disabled)}
              onClick={action.onSelect}
              className={`flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[length:var(--wariba-component-workstation-type-data)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent lg:min-h-8 ${
                action.tone === 'danger'
                  ? 'text-[color:var(--wariba-component-workstation-trading-sell)]'
                  : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
              }`}
            >
              {/* A fixed icon column, occupied or not, so labels align down the
                  whole menu — a ragged left edge is what makes a dense menu feel
                  improvised. */}
              <span className="flex w-4 shrink-0 justify-center opacity-80">{action.icon}</span>
              <span className="min-w-0 flex-1 truncate">{action.label}</span>
              {action.detail ? (
                <span className="shrink-0 text-[length:var(--wariba-component-workstation-type-meta)] uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-interaction-selected-text)]">
                  {action.detail}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export interface ChartContextMenuPopoverProps extends ChartContextMenuContentProps {
  x: number;
  y: number;
  onDismiss: () => void;
}

/** Desktop anchor: fixed-positioned near the right-click point, closes on outside click/Escape. */
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

  /*
   * Flipped against the viewport rather than clamped to it.
   *
   * The menu is now four bands tall, so a right-click in the lower half of a
   * 900px workstation put its own bottom off-screen. Flipping about the pointer
   * keeps the click point on a corner of the menu — which is what makes it feel
   * anchored to where the trader clicked rather than repositioned by the app.
   */
  const MENU_WIDTH = 268;
  const MENU_MAX_HEIGHT = 460;
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const left = x + MENU_WIDTH > viewportWidth - 8 ? Math.max(8, x - MENU_WIDTH) : x;
  const flipUp = y + MENU_MAX_HEIGHT > viewportHeight - 8 && y > viewportHeight / 2;

  return (
    <div
      ref={ref}
      data-testid="chart-context-menu"
      className="fixed z-[var(--wariba-z-popover)] max-h-[min(70vh,460px)] w-[268px] overflow-y-auto overscroll-contain rounded-[10px] border border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-popover)_ease-out]"
      style={
        flipUp
          ? { left, bottom: Math.max(8, viewportHeight - y) }
          : { left, top: Math.min(y, viewportHeight - 24) }
      }
    >
      <ChartContextMenuContent {...contentProps} />
    </div>
  );
}
