import type { PendingOrderType, AlertDirection } from '@wariba/contracts';
import { OverlayAnchor, SYNC_DOT_CLASS, type LevelSyncState } from './ChartPositionOverlay';

/**
 * Prompt 7 Appendix 07-D §5/§13 — the pending-order and price-alert
 * counterpart to ChartPositionOverlay's SL/TP handles: same drag-handle /
 * tap-to-manage / remove-button shape, same right-edge overlay column, same
 * native createPriceLine stroke underneath (drawn by TradeChart) — just a
 * different domain object (a pending order's trigger price, or an alert's
 * threshold price) instead of a position's SL/TP.
 */

const ORDER_TYPE_LABEL: Record<PendingOrderType, string> = {
  buy_limit: 'Achat Limite',
  sell_limit: 'Vente Limite',
  buy_stop: 'Achat Stop',
  sell_stop: 'Vente Stop',
};

const ORDER_TYPE_TONE_CLASS: Record<PendingOrderType, string> = {
  buy_limit:
    'border-[color:var(--wariba-status-information-border)] text-[color:var(--wariba-status-information-text)]',
  buy_stop:
    'border-[color:var(--wariba-status-information-border)] text-[color:var(--wariba-status-information-text)]',
  sell_limit:
    'border-[color:var(--wariba-status-warning-border)] text-[color:var(--wariba-status-warning-text)]',
  sell_stop:
    'border-[color:var(--wariba-status-warning-border)] text-[color:var(--wariba-status-warning-text)]',
};

export interface PendingOrderLineProps {
  y: number;
  orderType: PendingOrderType;
  quantityFormatted: string;
  priceFormatted: string;
  distancePointsFormatted: string;
  syncState: LevelSyncState;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  onRemove: () => void;
  onKeyboardAdjust: (direction: 1 | -1) => void;
}

export function PendingOrderLine({
  y,
  orderType,
  quantityFormatted,
  priceFormatted,
  distancePointsFormatted,
  syncState,
  disabled,
  onPointerDown,
  onActivate,
  onRemove,
  onKeyboardAdjust,
}: PendingOrderLineProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardAdjust(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardAdjust(-1);
    }
  };
  return (
    <OverlayAnchor y={y}>
      <div
        className={`flex items-center gap-1.5 rounded-[var(--wariba-radius-sm)] border border-dashed bg-[color:var(--wariba-background-elevated)]/95 px-1.5 py-0.5 shadow-[var(--wariba-shadow-sm)] transition-[top] duration-150 ${ORDER_TYPE_TONE_CLASS[orderType]} ${
          syncState === 'dragging_preview' ? 'ring-1 ring-[color:var(--wariba-action-primary)]' : ''
        } ${syncState === 'rejected' ? 'ring-1 ring-[color:var(--wariba-status-danger-border)]' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${SYNC_DOT_CLASS[syncState]}`}
        />
        <button
          type="button"
          onPointerDown={onPointerDown}
          onClick={onActivate}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={`Modifier l’ordre ${ORDER_TYPE_LABEL[orderType]}, déclenchement à ${priceFormatted}, ${quantityFormatted} lot. Flèches haut/bas pour ajuster d’un pas, Entrée pour saisir un prix exact.`}
          className="wariba-data min-h-[2.75rem] cursor-ns-resize text-[length:var(--wariba-font-size-label-sm)] font-semibold disabled:cursor-not-allowed sm:min-h-0"
        >
          {ORDER_TYPE_LABEL[orderType]} · {quantityFormatted} · {priceFormatted} ·{' '}
          {distancePointsFormatted} pts
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Annuler l’ordre ${ORDER_TYPE_LABEL[orderType]}`}
          className="text-[color:var(--wariba-text-tertiary)] hover:text-[color:var(--wariba-status-danger-text)] disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </OverlayAnchor>
  );
}

const ALERT_DIRECTION_LABEL: Record<AlertDirection, string> = {
  cross_above: 'Alerte ↑',
  cross_below: 'Alerte ↓',
};

export interface AlertLineProps {
  y: number;
  direction: AlertDirection;
  priceFormatted: string;
  syncState: LevelSyncState;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  onRemove: () => void;
  onKeyboardAdjust: (direction: 1 | -1) => void;
}

export function AlertLine({
  y,
  direction,
  priceFormatted,
  syncState,
  disabled,
  onPointerDown,
  onActivate,
  onRemove,
  onKeyboardAdjust,
}: AlertLineProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardAdjust(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardAdjust(-1);
    }
  };
  return (
    <OverlayAnchor y={y}>
      <div
        className={`flex items-center gap-1.5 rounded-[var(--wariba-radius-sm)] border border-dotted border-[color:var(--wariba-action-primary)] bg-[color:var(--wariba-background-elevated)]/95 px-1.5 py-0.5 shadow-[var(--wariba-shadow-sm)] transition-[top] duration-150 ${
          syncState === 'dragging_preview' ? 'ring-1 ring-[color:var(--wariba-action-primary)]' : ''
        } ${syncState === 'rejected' ? 'ring-1 ring-[color:var(--wariba-status-danger-border)]' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${SYNC_DOT_CLASS[syncState]}`}
        />
        <button
          type="button"
          onPointerDown={onPointerDown}
          onClick={onActivate}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={`Modifier ${ALERT_DIRECTION_LABEL[direction]}, seuil ${priceFormatted}. Flèches haut/bas pour ajuster d’un pas.`}
          className="wariba-data min-h-[2.75rem] cursor-ns-resize text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-action-primary)] disabled:cursor-not-allowed sm:min-h-0"
        >
          {ALERT_DIRECTION_LABEL[direction]} · {priceFormatted}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Supprimer l’alerte"
          className="text-[color:var(--wariba-text-tertiary)] hover:text-[color:var(--wariba-status-danger-text)] disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </OverlayAnchor>
  );
}
