'use client';

import { memo, type ReactNode } from 'react';
import {
  Tooltip,
  WariXActivityIcon,
  WariXAlertsIcon,
  WariXCalendarIcon,
  WariXHelpIcon,
  WariXLogIcon,
  WariXMarketsIcon,
  WariXTradeIcon,
} from '@wariba/ui';

export type UtilityDrawerId = 'markets' | 'trade' | 'calendar' | 'help';

interface UtilityButtonProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number;
  testId: string;
  onClick(): void;
}

function UtilityButton({
  label,
  icon,
  active = false,
  badge = 0,
  testId,
  onClick,
}: UtilityButtonProps) {
  return (
    <Tooltip label={label} side="left">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-testid={testId}
        onClick={onClick}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] transition-[background-color,color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-px ${
          active
            ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)] after:absolute after:bottom-1.5 after:left-[-6px] after:top-1.5 after:w-[2px] after:rounded-r-full after:bg-[color:var(--wariba-component-workstation-interaction-selected)]'
            : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
        }`}
      >
        {icon}
        {badge > 0 ? (
          <span className="wariba-data absolute -right-1 -top-1 min-w-4 rounded-full bg-[color:var(--wariba-component-workstation-trading-danger)] px-1 text-center text-[9px] font-bold leading-4 tabular-nums text-white ring-2 ring-[color:var(--wariba-component-workstation-surface-raised-module)]">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

function GroupSeam() {
  return (
    <span
      aria-hidden="true"
      className="my-2 h-px w-6 shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
    />
  );
}

export interface RightUtilityRailProps {
  activeDrawer: UtilityDrawerId | null;
  activityActive: boolean;
  alertsActive: boolean;
  openPositionCount: number;
  activeAlertCount: number;
  unreadCount: number;
  onToggleDrawer(drawer: UtilityDrawerId): void;
  onOpenActivity(): void;
  onOpenAlerts(): void;
  onOpenNotifications(): void;
}

/**
 * Persistent workspace utilities. Heavy content never lives in this rail: it
 * either opens the single inward drawer or routes to an already canonical
 * activity surface.
 */
export const RightUtilityRail = memo(function RightUtilityRail({
  activeDrawer,
  activityActive,
  alertsActive,
  openPositionCount,
  activeAlertCount,
  unreadCount,
  onToggleDrawer,
  onOpenActivity,
  onOpenAlerts,
  onOpenNotifications,
}: RightUtilityRailProps) {
  return (
    <aside
      aria-label="Utilitaires WariX"
      data-testid="right-utility-rail"
      className="flex h-full w-[var(--wariba-component-workstation-utility-rail-width)] shrink-0 flex-col items-center border-l border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1.5 py-2 shadow-[inset_1px_0_0_0_var(--wariba-component-workstation-rim-light)]"
    >
      <div className="flex flex-col items-center gap-1">
        <UtilityButton
          label="Marchés"
          icon={<WariXMarketsIcon size="nav" />}
          active={activeDrawer === 'markets'}
          testId="utility-markets"
          onClick={() => onToggleDrawer('markets')}
        />
        <UtilityButton
          label="Trade"
          icon={<WariXTradeIcon size="nav" />}
          active={activeDrawer === 'trade'}
          testId="utility-trade"
          onClick={() => onToggleDrawer('trade')}
        />
        <UtilityButton
          label="Activité"
          icon={<WariXActivityIcon size="nav" />}
          active={activityActive}
          badge={openPositionCount}
          testId="utility-activity"
          onClick={onOpenActivity}
        />
        <UtilityButton
          label="Alertes"
          icon={<WariXAlertsIcon size="nav" />}
          active={alertsActive}
          badge={activeAlertCount}
          testId="utility-alerts"
          onClick={onOpenAlerts}
        />
      </div>

      <GroupSeam />

      <div className="flex flex-col items-center gap-1">
        <UtilityButton
          label="Calendrier et actualités"
          icon={<WariXCalendarIcon size="nav" />}
          active={activeDrawer === 'calendar'}
          testId="utility-calendar"
          onClick={() => onToggleDrawer('calendar')}
        />
        <UtilityButton
          label="Notifications et journal"
          icon={<WariXLogIcon size="nav" />}
          badge={unreadCount}
          testId="utility-notifications"
          onClick={onOpenNotifications}
        />
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        <GroupSeam />
        <UtilityButton
          label="Centre d’aide"
          icon={<WariXHelpIcon size="nav" />}
          active={activeDrawer === 'help'}
          testId="utility-help"
          onClick={() => onToggleDrawer('help')}
        />
      </div>
    </aside>
  );
});
