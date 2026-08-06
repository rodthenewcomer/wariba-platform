import type { ReactNode } from 'react';

/**
 * Prompt 7 Appendix 07-C §3-§5 — the interactive layer over WariX's chart.
 * lightweight-charts' native price lines render their label on the price
 * axis with no per-pixel offset or click handler, so every genuinely
 * interactive element (position badge, SL/TP chips/handles, drag preview)
 * is one of these — plain, presentational, DOM/domain-logic-free
 * components, absolutely positioned by TradeChart.tsx from
 * `series.priceToCoordinate` + chart-overlay-geometry.ts's collision
 * resolution. TradeChart.tsx keeps the native `createPriceLine` calls too,
 * purely for the horizontal stroke across the candles and the plain axis
 * price tag — this layer is what makes any of it clickable or draggable.
 */

export type LevelSyncState = 'confirmed' | 'dragging_preview' | 'pending_server' | 'stale_disabled';

const SYNC_DOT_CLASS: Record<LevelSyncState, string> = {
  confirmed: 'bg-[color:var(--wariba-status-success-text)]',
  dragging_preview: 'bg-[color:var(--wariba-status-information-text)]',
  pending_server: 'bg-[color:var(--wariba-status-warning-text)] animate-pulse',
  stale_disabled: 'bg-[color:var(--wariba-text-tertiary)]',
};

export function OverlayAnchor({
  y,
  children,
  className = '',
}: {
  y: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-auto absolute right-2 flex -translate-y-1/2 items-center gap-1.5 ${className}`}
      style={{ top: y }}
    >
      {children}
    </div>
  );
}

export interface PositionBadgeProps {
  y: number;
  label: string;
  priceFormatted: string;
  pnlFormatted: string;
  pnlTone: 'positive' | 'negative' | 'neutral';
  syncState: LevelSyncState;
  syncLabel: string | null;
  onManage: () => void;
  onClose: () => void;
  closeDisabled: boolean;
  showCloseButton: boolean;
}

const PNL_TONE_CLASS: Record<PositionBadgeProps['pnlTone'], string> = {
  positive: 'text-[color:var(--wariba-status-success-text)]',
  negative: 'text-[color:var(--wariba-status-danger-text)]',
  neutral: 'text-[color:var(--wariba-text-primary)]',
};

export function PositionBadge({
  y,
  label,
  priceFormatted,
  pnlFormatted,
  pnlTone,
  syncState,
  syncLabel,
  onManage,
  onClose,
  closeDisabled,
  showCloseButton,
}: PositionBadgeProps) {
  return (
    <OverlayAnchor y={y}>
      <div className="flex items-center gap-1.5 rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)]/95 px-2 py-1 shadow-[var(--wariba-shadow-sm)] transition-[top] duration-150">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${SYNC_DOT_CLASS[syncState]}`}
          title={syncLabel ?? undefined}
        />
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-text-primary)]">
          {label} · {priceFormatted}
        </span>
        <span
          className={`wariba-data text-[length:var(--wariba-font-size-label-sm)] font-semibold ${PNL_TONE_CLASS[pnlTone]}`}
        >
          {pnlFormatted}
        </span>
        <button
          type="button"
          onClick={onManage}
          className="rounded-[var(--wariba-radius-xs)] px-1.5 py-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-action-secondary-text)] hover:bg-[color:var(--wariba-action-secondary-hover)]"
        >
          Gérer
        </button>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="rounded-[var(--wariba-radius-xs)] px-1.5 py-0.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-status-danger-text)] hover:bg-[color:var(--wariba-status-danger-background)] disabled:opacity-50"
          >
            Fermer
          </button>
        )}
      </div>
    </OverlayAnchor>
  );
}

export interface LevelChipProps {
  y: number;
  kind: 'stop_loss' | 'take_profit';
  disabled: boolean;
  disabledReason: string | null;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
}

const CHIP_LABEL: Record<LevelChipProps['kind'], string> = { stop_loss: 'SL', take_profit: 'TP' };
const CHIP_TONE_CLASS: Record<LevelChipProps['kind'], string> = {
  stop_loss:
    'border-[color:var(--wariba-status-danger-border)] text-[color:var(--wariba-status-danger-text)]',
  take_profit:
    'border-[color:var(--wariba-status-success-border)] text-[color:var(--wariba-status-success-text)]',
};

/**
 * Both a drag handle (mouse/touch pointerdown, see TradeChart's drag state
 * machine) and a button (onActivate — click/tap without a meaningful drag
 * distance opens exact-price entry; also the sole path for keyboard/screen
 * reader users, satisfying the "every drag needs a non-drag alternative"
 * requirement directly).
 */
export function LevelChip({
  y,
  kind,
  disabled,
  disabledReason,
  onPointerDown,
  onActivate,
}: LevelChipProps) {
  return (
    <OverlayAnchor y={y}>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onClick={onActivate}
        disabled={disabled}
        title={disabledReason ?? undefined}
        aria-label={kind === 'stop_loss' ? 'Activer un Stop Loss' : 'Activer un Take Profit'}
        className={`rounded-[var(--wariba-radius-xs)] border border-dashed bg-[color:var(--wariba-background-elevated)]/90 px-2 py-0.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold ${CHIP_TONE_CLASS[kind]} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        [ {CHIP_LABEL[kind]} ]
      </button>
    </OverlayAnchor>
  );
}

export interface LevelHandleProps {
  y: number;
  kind: 'stop_loss' | 'take_profit';
  priceFormatted: string;
  pnlFormatted: string;
  syncState: LevelSyncState;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onActivate: () => void;
  onRemove: () => void;
  /** Appendix §4 "arrow-key adjustment for accessibility" — the on-chart, non-drag equivalent of dragging the handle: each key press commits one tick immediately, no separate preview state. */
  onKeyboardAdjust: (direction: 1 | -1) => void;
}

const HANDLE_LABEL: Record<LevelHandleProps['kind'], string> = {
  stop_loss: 'SL',
  take_profit: 'TP',
};

export function LevelHandle({
  y,
  kind,
  priceFormatted,
  pnlFormatted,
  syncState,
  disabled,
  onPointerDown,
  onActivate,
  onRemove,
  onKeyboardAdjust,
}: LevelHandleProps) {
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
        className={`flex items-center gap-1 rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-elevated)]/95 px-1.5 py-0.5 shadow-[var(--wariba-shadow-sm)] transition-[top] duration-150 ${
          syncState === 'dragging_preview' ? 'ring-1 ring-[color:var(--wariba-action-primary)]' : ''
        }`}
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
          aria-label={
            kind === 'stop_loss'
              ? `Modifier le Stop Loss, actuellement ${priceFormatted}. Flèches haut/bas pour ajuster d’un pas, Entrée pour saisir un prix exact.`
              : `Modifier le Take Profit, actuellement ${priceFormatted}. Flèches haut/bas pour ajuster d’un pas, Entrée pour saisir un prix exact.`
          }
          className="wariba-data min-h-[2.75rem] cursor-ns-resize text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)] disabled:cursor-not-allowed sm:min-h-0"
        >
          {HANDLE_LABEL[kind]} · {priceFormatted} · {pnlFormatted}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={kind === 'stop_loss' ? 'Retirer le Stop Loss' : 'Retirer le Take Profit'}
          className="text-[color:var(--wariba-text-tertiary)] hover:text-[color:var(--wariba-status-danger-text)] disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </OverlayAnchor>
  );
}

export interface DragPreviewPanelProps {
  kind: 'stop_loss' | 'take_profit';
  priceFormatted: string;
  distancePointsFormatted: string;
  pnlFormatted: string;
  percentOfAccountFormatted: string;
  riskRewardFormatted: string | null;
  dailyLossRemainingAfterFormatted: string | null;
}

const PREVIEW_TITLE: Record<DragPreviewPanelProps['kind'], string> = {
  stop_loss: 'Stop Loss',
  take_profit: 'Take Profit',
};

/** Appendix §4's floating preview card, shown while dragging (or right after tapping a chip/handle to open exact-price entry, reused by ModifyPositionDialog). */
export function DragPreviewPanel({
  kind,
  priceFormatted,
  distancePointsFormatted,
  pnlFormatted,
  percentOfAccountFormatted,
  riskRewardFormatted,
  dailyLossRemainingAfterFormatted,
}: DragPreviewPanelProps) {
  return (
    <div className="pointer-events-none absolute right-14 top-4 flex w-48 flex-col gap-0.5 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-theme-border)] bg-[color:var(--wariba-background-elevated)] p-3 shadow-[var(--wariba-shadow-md)]">
      <span className="text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
        {PREVIEW_TITLE[kind]}
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
        {priceFormatted}
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {distancePointsFormatted} points
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {pnlFormatted} ({percentOfAccountFormatted}% du compte)
      </span>
      {riskRewardFormatted && (
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          Ratio risque/rendement : {riskRewardFormatted}
        </span>
      )}
      {dailyLossRemainingAfterFormatted && (
        <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
          Perte quotidienne restante après exécution : {dailyLossRemainingAfterFormatted}
        </span>
      )}
    </div>
  );
}
