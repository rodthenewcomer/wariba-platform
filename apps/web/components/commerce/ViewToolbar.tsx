'use client';

import type { DisplayMode } from './rule-specs';

export type ViewMode = 'selected' | 'compare';

interface ViewToolbarProps {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function SegmentedButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={
        active
          ? 'rounded-full bg-[color:var(--commerce-accent)] px-3.5 py-2 text-xs font-semibold text-white'
          : 'rounded-full px-3.5 py-2 text-xs font-semibold text-[color:var(--wariba-color-ink-300)] transition-colors hover:text-[color:var(--wariba-color-ink-50)]'
      }
    >
      {children}
    </button>
  );
}

/** The Decision Engine's view toolbar — percent/amount is a display preference, selected/compare is a view mode; neither touches canonical selection. */
export function ViewToolbar({
  displayMode,
  onDisplayModeChange,
  viewMode,
  onViewModeChange,
}: ViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Unité d’affichage des règles"
        className="inline-flex gap-1 rounded-full border border-[color:var(--commerce-rule)] p-1"
      >
        <SegmentedButton
          active={displayMode === 'percent'}
          onClick={() => onDisplayModeChange('percent')}
        >
          % Pourcentages
        </SegmentedButton>
        <SegmentedButton
          active={displayMode === 'amount'}
          onClick={() => onDisplayModeChange('amount')}
          title="Affiche les limites dans l’unité nominale du compte simulé — pas en FCFA."
        >
          123 Montants
        </SegmentedButton>
      </div>

      <div
        role="group"
        aria-label="Mode d’affichage"
        className="inline-flex gap-1 rounded-full border border-[color:var(--commerce-rule)] p-1"
      >
        <SegmentedButton
          active={viewMode === 'selected'}
          onClick={() => onViewModeChange('selected')}
        >
          Vue sélection
        </SegmentedButton>
        <SegmentedButton
          active={viewMode === 'compare'}
          onClick={() => onViewModeChange('compare')}
        >
          Comparer
        </SegmentedButton>
      </div>
    </div>
  );
}
