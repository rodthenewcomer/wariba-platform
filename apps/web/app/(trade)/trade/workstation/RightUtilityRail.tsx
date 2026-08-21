'use client';

import { memo } from 'react';
import { Tooltip, WariXDestinationIcon, type WarixDestinationId } from '@wariba/ui';

export type UtilityDrawerId = 'markets' | 'trade' | 'calendar' | 'help';

interface UtilityButtonProps {
  label: string;
  destination: WarixDestinationId;
  active?: boolean;
  badge?: number;
  testId: string;
  onClick(): void;
}

/**
 * One workstation destination.
 *
 * VX1-C.1 §16/§17 — the four states, and what each is allowed to spend:
 *
 * - **idle** — soft steel glyph on the rail's own surface, nothing else.
 * - **hover** — the glyph brightens to ice, a graphite plate appears under it,
 *   and the key lifts a single pixel. Never more: a rail that moves under the
 *   cursor is a rail a trader mis-clicks.
 * - **active** — a thin cobalt energy line on the rail's inner edge, a
 *   translucent cobalt backplate, a fine top highlight and a very local glow.
 *   Deliberately *not* a bright blue square: the destination should read as lit
 *   from within, not painted over.
 * - **disabled** — quiet neutral, no elevation, no glow.
 */
function UtilityButton({
  label,
  destination,
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
        className="warix-destination-key relative"
        data-active={active ? 'true' : 'false'}
        data-warix-destination={destination}
        data-testid={testId}
        onClick={onClick}
      >
        <WariXDestinationIcon destination={destination} />
        {badge > 0 ? (
          <span className="wariba-data absolute -right-1 -top-1 min-w-4 rounded-full bg-[color:var(--wariba-component-workstation-trading-danger)] px-1 text-center text-[9px] font-bold leading-4 tabular-nums text-white ring-2 ring-[color:var(--wariba-component-workstation-surface-raised-module)] motion-safe:animate-[wariba-badge-pop_var(--wariba-component-workstation-motion-standard)_var(--wariba-component-workstation-ease-settle)]">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

export interface RightUtilityRailProps {
  activeDrawer: UtilityDrawerId | null;
  activityActive: boolean;
  alertsActive: boolean;
  journalActive: boolean;
  openPositionCount: number;
  activeAlertCount: number;
  onToggleDrawer(drawer: UtilityDrawerId): void;
  onOpenActivity(): void;
  onOpenAlerts(): void;
  onOpenJournal(): void;
}

/**
 * Persistent workspace destinations. Heavy content never lives in this rail: it
 * either opens the single inward drawer or routes to an already canonical
 * activity surface.
 *
 * **VX1-C.1 §14/§18 — what the rail is, and what it is not.**
 *
 * It is a list of *places*, grouped by what a trader is doing when they reach
 * for one: the four execution surfaces, then the two intelligence surfaces,
 * then help. The groups are separated by real negative space rather than by
 * being packed against one another, because a rail that reads as one long strip
 * of glyphs is a rail nobody scans.
 *
 * It carries no connectivity: the feed's health lives in the header, once, and
 * putting a second network state here would be the fourth green dot the product
 * just got rid of.
 */
export const RightUtilityRail = memo(function RightUtilityRail({
  activeDrawer,
  activityActive,
  alertsActive,
  journalActive,
  openPositionCount,
  activeAlertCount,
  onToggleDrawer,
  onOpenActivity,
  onOpenAlerts,
  onOpenJournal,
}: RightUtilityRailProps) {
  return (
    <aside
      aria-label="Destinations WariX"
      data-testid="right-utility-rail"
      className="flex h-full w-[var(--wariba-component-workstation-utility-rail-width)] shrink-0 flex-col items-center border-l border-[color:var(--wariba-component-workstation-seam-strong)] bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-1.5 py-3 shadow-[inset_1px_0_0_0_var(--wariba-component-workstation-rim-light)]"
    >
      {/* Execution — the four surfaces a trader works from. */}
      <div className="flex flex-col items-center gap-1.5">
        <UtilityButton
          label="Marchés"
          destination="markets"
          active={activeDrawer === 'markets'}
          testId="utility-markets"
          onClick={() => onToggleDrawer('markets')}
        />
        <UtilityButton
          label="Trade"
          destination="trade"
          active={activeDrawer === 'trade'}
          testId="utility-trade"
          onClick={() => onToggleDrawer('trade')}
        />
        <UtilityButton
          label="Activité"
          destination="activity"
          active={activityActive}
          badge={openPositionCount}
          testId="utility-activity"
          onClick={onOpenActivity}
        />
        <UtilityButton
          label="Alertes"
          destination="alerts"
          active={alertsActive}
          badge={activeAlertCount}
          testId="utility-alerts"
          onClick={onOpenAlerts}
        />
      </div>

      {/* §14 — negative space, not a divider: the gap is what tells a trader the
          next two destinations are a different kind of thing. */}
      <div className="h-9 shrink-0" aria-hidden="true" />

      {/* Intelligence — what is happening around the market. */}
      <div className="flex flex-col items-center gap-1.5">
        <UtilityButton
          label="Calendrier"
          destination="calendar"
          active={activeDrawer === 'calendar'}
          testId="utility-calendar"
          onClick={() => onToggleDrawer('calendar')}
        />
        <UtilityButton
          label="Journal"
          destination="journal"
          active={journalActive}
          testId="utility-journal"
          onClick={onOpenJournal}
        />
      </div>

      {/* System — alone at the bottom, where a trader looks for it and nowhere
          near the surfaces that place orders. */}
      <div className="mt-auto flex flex-col items-center">
        <UtilityButton
          label="Aide"
          destination="help"
          active={activeDrawer === 'help'}
          testId="utility-help"
          onClick={() => onToggleDrawer('help')}
        />
      </div>
    </aside>
  );
});
