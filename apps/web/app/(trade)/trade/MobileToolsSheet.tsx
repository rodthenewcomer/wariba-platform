'use client';

import { useState, type ReactNode } from 'react';
import {
  WariXChevronDownIcon,
  WariXDrawingLockIcon,
  WariXEyeIcon,
  WariXEyeOffIcon,
  WariXFitContentIcon,
  WariXMagnetIcon,
  WariXPreferencesIcon,
  WariXStarIcon,
  WariXStudiesIcon,
  WariXTrashIcon,
} from '@wariba/ui';
import {
  CHART_CURSOR_ENTRIES,
  CHART_TOOL_FAMILIES,
  catalogEntry,
  type ChartToolCatalogEntry,
} from './chart-tool-catalog';
import { cursorModeLabel, type ChartCursorMode, type ChartTool } from './chart-tool-mode';

/**
 * The mobile Tools sheet — §27.
 *
 * Same taxonomy as the desktop rail, a different shape for it. The desktop rail
 * shows every family at once because a 44px column costs little; a phone sheet
 * that rendered thirty-two tools plus its utilities at 44px each would be a
 * scrolling wall covering the chart it exists to annotate. So the sheet
 * **drills down**: families first, one family's tools second, with a back
 * control — which is also how a phone user expects a hierarchy to behave.
 *
 * §26's rule holds throughout: this is not the desktop rail shrunk. Rows are
 * 44px, the categories are the phone's own top level, and the view actions a
 * desktop trader reaches for in the toolbar are collected here because there is
 * no toolbar room for them at 390px.
 */

export interface MobileToolsSheetProps {
  tool: ChartTool;
  onSelectTool(tool: ChartTool): void;
  cursorMode: ChartCursorMode;
  onSelectCursorMode(mode: ChartCursorMode): void;
  favorites: readonly string[];
  onToggleFavorite(id: string): void;
  onOpenIndicators(): void;
  onOpenSettings(): void;
  onResetView(): void;
  magnet: boolean;
  onToggleMagnet(): void;
  keepDrawingMode: boolean;
  onToggleKeepDrawingMode(): void;
  drawingsHidden: boolean;
  indicatorsHidden: boolean;
  onSetDrawingsHidden(hidden: boolean): void;
  onSetIndicatorsHidden(hidden: boolean): void;
  drawingCount: number;
  onRemoveAllDrawings(): void;
  onClose(): void;
}

function SheetRow({
  icon,
  label,
  detail,
  active = false,
  disabled = false,
  trailing,
  onSelect,
  testId,
}: {
  icon?: ReactNode;
  label: string;
  detail?: string;
  active?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  onSelect(): void;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        data-testid={testId}
        className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-[10px] px-3 text-left text-[length:var(--wariba-component-workstation-type-data)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
            : 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-secondary)]'
        }`}
      >
        {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {detail ? (
          <span className="shrink-0 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            {detail}
          </span>
        ) : null}
        {trailing}
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 pt-1 text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
      {children}
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-[color:var(--wariba-component-workstation-border-hairline)]"
      />
    </h3>
  );
}

export function MobileToolsSheet({
  tool,
  onSelectTool,
  cursorMode,
  onSelectCursorMode,
  favorites,
  onToggleFavorite,
  onOpenIndicators,
  onOpenSettings,
  onResetView,
  magnet,
  onToggleMagnet,
  keepDrawingMode,
  onToggleKeepDrawingMode,
  drawingsHidden,
  indicatorsHidden,
  onSetDrawingsHidden,
  onSetIndicatorsHidden,
  drawingCount,
  onRemoveAllDrawings,
  onClose,
}: MobileToolsSheetProps) {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const family = CHART_TOOL_FAMILIES.find((entry) => entry.id === familyId) ?? null;

  const pick = (next: ChartTool) => {
    onSelectTool(next);
    onClose();
  };

  const pickCursor = (next: ChartCursorMode) => {
    onSelectCursorMode(next);
    onClose();
  };

  const favoriteEntries = favorites
    .map((id) => catalogEntry(id as ChartTool))
    .filter((entry): entry is ChartToolCatalogEntry => entry !== null);

  if (familyId === 'cursor') {
    return (
      <div className="flex flex-col gap-2 pb-2" data-testid="chart-tools-sheet">
        <button
          type="button"
          onClick={() => setFamilyId(null)}
          data-testid="chart-tools-back"
          className="flex min-h-11 items-center gap-2 self-start rounded-[9px] px-2 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)]"
        >
          <span className="rotate-90">
            <WariXChevronDownIcon size="mobile" />
          </span>
          Toutes les familles
        </button>
        <SectionTitle>Curseur</SectionTitle>
        {CHART_CURSOR_ENTRIES.map((entry) => (
          <SheetRow
            key={entry.mode}
            icon={entry.icon}
            label={entry.label}
            active={tool === 'select' && cursorMode === entry.mode}
            onSelect={() => pickCursor(entry.mode)}
            testId={`chart-cursor-${entry.mode}`}
          />
        ))}
      </div>
    );
  }

  if (family) {
    return (
      <div className="flex flex-col gap-2 pb-2" data-testid="chart-tools-sheet">
        <button
          type="button"
          onClick={() => setFamilyId(null)}
          data-testid="chart-tools-back"
          className="flex min-h-11 items-center gap-2 self-start rounded-[9px] px-2 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)]"
        >
          <span className="rotate-90">
            <WariXChevronDownIcon size="mobile" />
          </span>
          Toutes les familles
        </button>
        {family.groups.map((group) => (
          <div key={group.heading} className="flex flex-col gap-1.5">
            <SectionTitle>{group.heading}</SectionTitle>
            {group.entries.map((entry) => (
              <SheetRow
                key={entry.tool}
                icon={entry.icon}
                label={entry.label}
                active={entry.tool === tool}
                onSelect={() => pick(entry.tool)}
                testId={`chart-tool-${entry.tool}`}
                trailing={
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={
                      favorites.includes(entry.tool)
                        ? `Retirer ${entry.label} des favoris`
                        : `Ajouter ${entry.label} aux favoris`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(entry.tool);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleFavorite(entry.tool);
                    }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] ${
                      favorites.includes(entry.tool)
                        ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
                        : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden="true">
                      <path
                        d="M12 3.6l2.6 5.6 6 0.8-4.4 4.3 1.1 6.1L12 17.5l-5.3 2.9 1.1-6.1L3.4 10l6-0.8Z"
                        fill={favorites.includes(entry.tool) ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                }
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-2" data-testid="chart-tools-sheet">
      {favoriteEntries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <WariXStarIcon size="toolbar" />
              Favoris
            </span>
          </SectionTitle>
          {favoriteEntries.map((entry) => (
            <SheetRow
              key={entry.tool}
              icon={entry.icon}
              label={entry.label}
              active={entry.tool === tool}
              onSelect={() => pick(entry.tool)}
              testId={`chart-favorite-${entry.tool}`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <SectionTitle>Dessin</SectionTitle>
        <SheetRow
          icon={CHART_CURSOR_ENTRIES.find((entry) => entry.mode === cursorMode)?.icon}
          label="Curseur"
          detail={cursorModeLabel(cursorMode)}
          active={tool === 'select'}
          onSelect={() => setFamilyId('cursor')}
          testId="chart-tool-family-cursor"
          trailing={
            <span className="-rotate-90 shrink-0 text-[color:var(--wariba-component-workstation-text-tertiary)]">
              <WariXChevronDownIcon size="mobile" />
            </span>
          }
        />
        {CHART_TOOL_FAMILIES.map((entry) => (
          <SheetRow
            key={entry.id}
            icon={entry.icon}
            label={entry.label}
            detail={String(entry.groups.reduce((total, group) => total + group.entries.length, 0))}
            onSelect={() => setFamilyId(entry.id)}
            testId={`chart-tool-family-${entry.id}`}
            trailing={
              <span className="-rotate-90 shrink-0 text-[color:var(--wariba-component-workstation-text-tertiary)]">
                <WariXChevronDownIcon size="mobile" />
              </span>
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle>Analyse</SectionTitle>
        <SheetRow
          icon={<WariXStudiesIcon size="mobile" />}
          label="Indicateurs"
          onSelect={() => {
            onOpenIndicators();
            onClose();
          }}
          testId="chart-indicators-trigger-mobile"
        />
        <SheetRow
          icon={<WariXPreferencesIcon size="mobile" />}
          label="Paramètres du graphique"
          onSelect={() => {
            onOpenSettings();
            onClose();
          }}
          testId="chart-settings-trigger-mobile"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionTitle>Vue</SectionTitle>
        <SheetRow
          icon={<WariXFitContentIcon size="mobile" />}
          label="Ajuster la vue"
          onSelect={() => {
            onResetView();
            onClose();
          }}
        />
        <SheetRow
          icon={<WariXMagnetIcon size="mobile" />}
          label="Aimant"
          detail={magnet ? 'Activé' : 'Désactivé'}
          active={magnet}
          onSelect={onToggleMagnet}
          testId="chart-magnet-toggle-mobile"
        />
        <SheetRow
          icon={<WariXDrawingLockIcon size="mobile" />}
          label="Garder le dernier outil"
          detail={keepDrawingMode ? 'Activé' : 'Désactivé'}
          active={keepDrawingMode}
          onSelect={onToggleKeepDrawingMode}
          testId="chart-keep-drawing-toggle-mobile"
        />
        <SheetRow
          icon={drawingsHidden ? <WariXEyeOffIcon size="mobile" /> : <WariXEyeIcon size="mobile" />}
          label={drawingsHidden ? 'Afficher les dessins' : 'Masquer les dessins'}
          active={drawingsHidden}
          onSelect={() => onSetDrawingsHidden(!drawingsHidden)}
          testId="chart-hide-drawings-mobile"
        />
        <SheetRow
          icon={
            indicatorsHidden ? <WariXEyeOffIcon size="mobile" /> : <WariXEyeIcon size="mobile" />
          }
          label={indicatorsHidden ? 'Afficher les indicateurs' : 'Masquer les indicateurs'}
          active={indicatorsHidden}
          onSelect={() => onSetIndicatorsHidden(!indicatorsHidden)}
          testId="chart-hide-indicators-mobile"
        />
        <SheetRow
          icon={<WariXTrashIcon size="mobile" />}
          label={drawingCount === 0 ? 'Aucun dessin' : `Supprimer ${drawingCount} dessins`}
          disabled={drawingCount === 0}
          onSelect={() => {
            onRemoveAllDrawings();
            onClose();
          }}
          testId="chart-remove-drawings-mobile"
        />
      </div>
    </div>
  );
}
