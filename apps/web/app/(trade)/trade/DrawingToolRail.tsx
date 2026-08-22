'use client';

import { memo, useCallback, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  WariXChartLinkIcon,
  WariXChevronRightIcon,
  WariXDrawingLockIcon,
  WariXEyeIcon,
  WariXEyeOffIcon,
  WariXLayersIcon,
  WariXLockClosedIcon,
  WariXLockOpenIcon,
  WariXMagnetIcon,
  WariXStarIcon,
  WariXTrashIcon,
  WariXZoomIcon,
} from '@wariba/ui';
import { FlyoutHeading, FlyoutRow, FlyoutSeparator, ToolFlyout } from './ToolFlyout';
import {
  CHART_CURSOR_ENTRIES,
  CHART_TOOL_FAMILIES,
  catalogEntry,
  familyForTool,
  type ChartToolFamily,
} from './chart-tool-catalog';
import { cursorModeLabel, type ChartCursorMode, type ChartTool } from './chart-tool-mode';

/**
 * The desktop chart tool rail — §9.
 *
 * WX1's rail was six equal buttons in a column: every tool WariX had, flat, with
 * no grouping and no way to grow. Read against the reference that is not a
 * charting rail, it is a small icon list — a trader scanning it finds no
 * Fibonacci group, no measurement group, and no sign that the product has a tool
 * *taxonomy* at all.
 *
 * This rail is built the way charting rails are: a cursor at the top, then one
 * button per tool **family** whose glyph becomes the held tool's own glyph, then
 * a seam, then the rail's housekeeping — magnet, visibility, favourites, object
 * tree, remove. Groups are separated by hairlines, families open attached
 * flyouts, and the whole column is 42px wide like the reference analysis rail.
 *
 * **Only real controls are here.** The retained-tool control is backed by the
 * drawing state machine; absent reference families remain absent until their
 * behaviours exist. §12 is explicit that reserving the grammar is fine but
 * faking the behaviour is not.
 */

/**
 * VX1-E — the interactive zone for a drawing tool.
 *
 * A 42px target inside the 56px rail leaves a calm seven-pixel gutter while
 * giving the 28px glyph enough optical mass at a 1366px laptop viewport.
 */
const RAIL_BUTTON = 42;
const HOVER_OPEN_DELAY_MS = 260;
const MIN_FLYOUT_VISIBLE_HEIGHT = 320;

function flyoutTopFor(node: HTMLButtonElement, rail: HTMLDivElement | null): number {
  if (!rail) return node.offsetTop;
  const railBounds = rail.getBoundingClientRect();
  const localTop = node.getBoundingClientRect().top - railBounds.top;
  return Math.max(
    4,
    Math.min(localTop, Math.max(4, railBounds.height - MIN_FLYOUT_VISIBLE_HEIGHT)),
  );
}

export interface DrawingToolRailProps {
  tool: ChartTool;
  onSelect(tool: ChartTool): void;
  cursorMode: ChartCursorMode;
  onSelectCursorMode(mode: ChartCursorMode): void;
  favorites: readonly string[];
  onToggleFavorite(id: string): void;
  magnet: boolean;
  onToggleMagnet(): void;
  keepDrawingMode: boolean;
  onToggleKeepDrawingMode(): void;
  drawingsLocked: boolean;
  onToggleDrawingsLocked(): void;
  onZoomIn(): void;
  chartLinkCopied: boolean;
  onCopyChartLink(): void;
  drawingsHidden: boolean;
  indicatorsHidden: boolean;
  onSetDrawingsHidden(hidden: boolean): void;
  onSetIndicatorsHidden(hidden: boolean): void;
  drawingCount: number;
  onRemoveAllDrawings(): void;
  onOpenObjectTree(): void;
}

interface RailButtonProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  activeTone?: 'interaction' | 'identity';
  /** Reveals the right-edge family disclosure chevron on intent. */
  expandable?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  testId?: string;
  onClick(event: MouseEvent<HTMLButtonElement>): void;
  onHoverOpen?: (node: HTMLButtonElement) => void;
  onHoverCancel?: () => void;
}

function RailButton({
  label,
  icon,
  active = false,
  activeTone = 'interaction',
  expandable = false,
  expanded = false,
  disabled = false,
  testId,
  onClick,
  onHoverOpen,
  onHoverCancel,
}: RailButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-haspopup={expandable ? 'menu' : undefined}
      aria-expanded={expandable ? expanded : undefined}
      disabled={disabled}
      data-testid={testId}
      onClick={(event) => onClick(event)}
      onPointerEnter={(event) => onHoverOpen?.(event.currentTarget)}
      onPointerLeave={onHoverCancel}
      onFocus={(event) => onHoverOpen?.(event.currentTarget)}
      style={{ width: RAIL_BUTTON, height: RAIL_BUTTON }}
      /*
       * VX1-B §5 — the rail's states, on frozen geometry.
       *
       * Idle is quiet neutral ink on the chart's own ground. Hover raises a
       * graphite surface under the glyph and brightens it; selection takes the
       * cobalt wash with a fine cobalt edge and a very local glow, so a held
       * tool is unmistakable from across the screen without the key growing by a
       * pixel. Disabled stays legible — an unavailable tool a trader cannot read
       * is a tool they will keep clicking.
       */
      className={`group/rail relative flex shrink-0 items-center justify-center rounded-[var(--wariba-component-workstation-radius-micro)] transition-[background-color,color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-quick)] ease-[var(--wariba-component-workstation-ease-move)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transform-none motion-reduce:transition-none ${
        active || expanded
          ? activeTone === 'identity'
            ? 'bg-[color:var(--wariba-component-workstation-identity-mark)] text-[color:var(--wariba-chart-background)] shadow-[0_0_10px_-2px_var(--wariba-component-workstation-wash-identity)]'
            : 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] shadow-[inset_0_0_0_1px_var(--wariba-component-workstation-seam-active),0_0_10px_-2px_var(--wariba-component-workstation-focus-glow)]'
          : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)] hover:shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]'
      }`}
    >
      {icon}
      {/*
       * Family disclosure — final closure §6.
       *
       * Appears only on intent, so the rail's silhouette at rest is exactly the
       * frozen one: no extra width, no taller row, no icon movement. It says
       * "there is more than one tool here" and nothing else, which is why it
       * only renders on families and never on the single-action keys (remove,
       * lock, object tree).
       *
       * It takes pointer events so hovering the chevron itself brings it to full
       * strength — the affordance answers the pointer that is asking about it.
       * The click still belongs to the row: WX1's flyout opens from the whole
       * button, and splitting the target in two would change a drawing
       * interaction this pass is not allowed to touch.
       */}
      {expandable && (
        <span
          aria-hidden="true"
          /*
           * Absolutely positioned, so none of this touches the row: same 32px
           * button, same icon, same order, same rail width. What changed after
           * the first render is only whether a human can *see* it — at 10px and
           * 70% against the rail's own grey it read as an artefact. It is now a
           * 12px glyph at full strength in the primary ink, one pixel further in
           * from the edge so the stroke is not fighting the rail's border.
           */
          className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[color:var(--wariba-component-workstation-text-primary)] opacity-0 transition-opacity duration-[var(--wariba-component-workstation-motion-interaction)] group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100"
        >
          <WariXChevronRightIcon className="h-3 w-3" />
        </span>
      )}
      {active && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-[-6px] w-[2px] rounded-full ${
            activeTone === 'identity'
              ? 'bg-[color:var(--wariba-component-workstation-identity-mark)]'
              : 'bg-[color:var(--wariba-component-workstation-interaction-selected)]'
          }`}
        />
      )}
    </button>
  );
}

function Seam() {
  return (
    <span
      aria-hidden="true"
      className="h-px w-8 shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
    />
  );
}

export const DrawingToolRail = memo(function DrawingToolRail({
  tool,
  onSelect,
  cursorMode,
  onSelectCursorMode,
  favorites,
  onToggleFavorite,
  magnet,
  onToggleMagnet,
  keepDrawingMode,
  onToggleKeepDrawingMode,
  drawingsLocked,
  onToggleDrawingsLocked,
  onZoomIn,
  chartLinkCopied,
  onCopyChartLink,
  drawingsHidden,
  indicatorsHidden,
  onSetDrawingsHidden,
  onSetIndicatorsHidden,
  drawingCount,
  onRemoveAllDrawings,
  onOpenObjectTree,
}: DrawingToolRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [openTop, setOpenTop] = useState(6);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFamily = familyForTool(tool);
  const activeCursor =
    CHART_CURSOR_ENTRIES.find((entry) => entry.mode === cursorMode) ?? CHART_CURSOR_ENTRIES[0];

  const cancelHover = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  /**
   * Hover-to-open, with a delay.
   *
   * Without the delay, dragging the pointer down the rail to reach the trash
   * flashes five panels on the way. 260ms is long enough that passing over a
   * button is not a request, short enough that resting on one feels immediate.
   */
  const scheduleOpen = useCallback(
    (id: string, node: HTMLButtonElement) => {
      cancelHover();
      hoverTimer.current = setTimeout(() => {
        setOpenTop(flyoutTopFor(node, railRef.current));
        setOpen(id);
      }, HOVER_OPEN_DELAY_MS);
    },
    [cancelHover],
  );

  const chooseTool = useCallback(
    (next: ChartTool) => {
      onSelect(next);
      setOpen(null);
      cancelHover();
    },
    [onSelect, cancelHover],
  );

  const chooseCursor = useCallback(
    (next: ChartCursorMode) => {
      onSelectCursorMode(next);
      setOpen(null);
      cancelHover();
    },
    [onSelectCursorMode, cancelHover],
  );

  const favoriteEntries = favorites
    .map((id) => catalogEntry(id as ChartTool))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const analysisFamilies = CHART_TOOL_FAMILIES.filter((family) => family.id !== 'measure');
  const measureFamily = CHART_TOOL_FAMILIES.find((family) => family.id === 'measure') ?? null;

  const toggleFlyout = (id: string, node: HTMLButtonElement) => {
    cancelHover();
    setOpenTop(flyoutTopFor(node, railRef.current));
    setOpen((current) => (current === id ? null : id));
  };

  const renderFamily = (family: ChartToolFamily) => {
    const heldHere = activeFamily?.id === family.id;
    const held = heldHere ? catalogEntry(tool) : null;
    return (
      <RailButton
        key={family.id}
        label={family.label}
        icon={held?.icon ?? family.icon}
        active={heldHere}
        expandable
        expanded={open === family.id}
        testId={`chart-tool-family-${family.id}`}
        onClick={(event) => toggleFlyout(family.id, event.currentTarget)}
        onHoverOpen={(node) => scheduleOpen(family.id, node)}
        onHoverCancel={cancelHover}
      />
    );
  };

  const openFamily = CHART_TOOL_FAMILIES.find((family) => family.id === open) ?? null;
  return (
    <div
      ref={railRef}
      data-tool-rail
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Outils du graphique"
      data-testid="chart-tools-trigger"
      /* §32 — the rail meets the plot on a hairline seam, and carries the shell's
         own rim light on its inner edge so the boundary reads as machined. */
      className="relative flex h-full w-[var(--wariba-component-workstation-drawing-rail-width)] shrink-0 overflow-visible border-r border-[color:var(--wariba-component-workstation-seam-hairline)] bg-[color:var(--wariba-component-workstation-surface-shell)] shadow-[inset_-1px_0_0_0_var(--wariba-component-workstation-rim-light)]"
      onPointerLeave={cancelHover}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden overscroll-contain py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <RailButton
          label={cursorModeLabel(cursorMode)}
          icon={activeCursor?.icon}
          active={tool === 'select'}
          expandable
          expanded={open === 'cursor'}
          testId="chart-tool-select"
          onClick={(event) => {
            cancelHover();
            if (tool !== 'select') {
              chooseCursor(cursorMode);
              return;
            }
            toggleFlyout('cursor', event.currentTarget);
          }}
          onHoverOpen={(node) => scheduleOpen('cursor', node)}
          onHoverCancel={cancelHover}
        />
        {analysisFamilies.map(renderFamily)}
        <Seam />
        {measureFamily ? renderFamily(measureFamily) : null}
        <RailButton
          label="Zoom avant"
          icon={<WariXZoomIcon />}
          testId="chart-zoom-in"
          onClick={onZoomIn}
        />
        <Seam />
        <RailButton
          label={magnet ? 'Aimant activé' : 'Aimant'}
          icon={<WariXMagnetIcon />}
          active={magnet}
          testId="chart-magnet-toggle"
          onClick={onToggleMagnet}
        />
        <RailButton
          label={keepDrawingMode ? 'Mode dessin continu activé' : 'Garder le dernier outil'}
          icon={<WariXDrawingLockIcon />}
          active={keepDrawingMode}
          testId="chart-keep-drawing-toggle"
          onClick={onToggleKeepDrawingMode}
        />
        <RailButton
          label={drawingsLocked ? 'Déverrouiller les dessins' : 'Verrouiller les dessins'}
          icon={drawingsLocked ? <WariXLockClosedIcon /> : <WariXLockOpenIcon />}
          active={drawingsLocked}
          testId="chart-drawings-lock-toggle"
          onClick={onToggleDrawingsLocked}
        />
        <RailButton
          label="Visibilité"
          icon={drawingsHidden || indicatorsHidden ? <WariXEyeOffIcon /> : <WariXEyeIcon />}
          active={drawingsHidden || indicatorsHidden}
          expandable
          expanded={open === 'visibility'}
          testId="chart-visibility-trigger"
          onClick={(event) => toggleFlyout('visibility', event.currentTarget)}
          onHoverOpen={(node) => scheduleOpen('visibility', node)}
          onHoverCancel={cancelHover}
        />
        <RailButton
          label={chartLinkCopied ? 'Lien du graphique copié' : 'Copier le lien du graphique'}
          icon={<WariXChartLinkIcon />}
          active
          activeTone="identity"
          testId="chart-copy-link"
          onClick={onCopyChartLink}
        />
        <Seam />
        <RailButton
          label={
            drawingCount === 0
              ? 'Aucun dessin à supprimer'
              : `Supprimer les ${drawingCount} dessins`
          }
          icon={<WariXTrashIcon />}
          disabled={drawingCount === 0}
          testId="chart-remove-drawings"
          onClick={onRemoveAllDrawings}
        />
        <RailButton
          label="Favoris"
          icon={<WariXStarIcon />}
          expandable
          expanded={open === 'favorites'}
          testId="chart-favorites-trigger"
          onClick={(event) => toggleFlyout('favorites', event.currentTarget)}
          onHoverOpen={(node) => scheduleOpen('favorites', node)}
          onHoverCancel={cancelHover}
        />
        <RailButton
          label="Arborescence des objets"
          icon={<WariXLayersIcon />}
          testId="chart-object-tree-trigger"
          onClick={onOpenObjectTree}
        />
      </div>

      {openFamily && (
        <ToolFlyout
          label={openFamily.label}
          top={openTop}
          {...(openFamily.width ? { width: openFamily.width } : {})}
          testId={`chart-tool-flyout-${openFamily.id}`}
          onDismiss={() => setOpen(null)}
        >
          {openFamily.groups.map((group, groupIndex) => (
            <div key={group.heading}>
              {groupIndex > 0 && <FlyoutSeparator />}
              <FlyoutHeading>{group.heading}</FlyoutHeading>
              {group.entries.map((entry) => (
                <FlyoutRow
                  key={entry.tool}
                  icon={entry.icon}
                  label={entry.label}
                  active={entry.tool === tool}
                  {...(entry.shortcut ? { shortcut: entry.shortcut } : {})}
                  favorite={favorites.includes(entry.tool)}
                  onToggleFavorite={() => onToggleFavorite(entry.tool)}
                  onSelect={() => chooseTool(entry.tool)}
                  testId={`chart-tool-${entry.tool}`}
                />
              ))}
            </div>
          ))}
        </ToolFlyout>
      )}

      {open === 'cursor' && (
        <ToolFlyout
          label="Mode du curseur"
          top={openTop}
          width={276}
          testId="chart-cursor-flyout"
          onDismiss={() => setOpen(null)}
        >
          <FlyoutHeading>Curseur</FlyoutHeading>
          {CHART_CURSOR_ENTRIES.map((entry) => (
            <FlyoutRow
              key={entry.mode}
              icon={entry.icon}
              label={entry.label}
              active={tool === 'select' && cursorMode === entry.mode}
              onSelect={() => chooseCursor(entry.mode)}
              testId={`chart-cursor-${entry.mode}`}
            />
          ))}
          <FlyoutSeparator />
          <p className="px-4 py-2 text-[length:var(--wariba-component-workstation-type-label)] leading-relaxed text-[color:var(--wariba-component-workstation-text-tertiary)]">
            La gomme supprime uniquement le dessin touché. Les ordres, niveaux et alertes restent
            hors de sa portée.
          </p>
        </ToolFlyout>
      )}

      {open === 'visibility' && (
        <ToolFlyout
          label="Visibilité"
          top={openTop}
          width={216}
          testId="chart-visibility-flyout"
          onDismiss={() => setOpen(null)}
        >
          {/* §11 — reversible, and never destructive. The labels state what the
              next press does, so a trader is never guessing which way the
              toggle currently sits. */}
          <FlyoutRow
            label={drawingsHidden ? 'Afficher les dessins' : 'Masquer les dessins'}
            active={drawingsHidden}
            onSelect={() => {
              onSetDrawingsHidden(!drawingsHidden);
              setOpen(null);
            }}
            testId="chart-hide-drawings"
          />
          <FlyoutRow
            label={indicatorsHidden ? 'Afficher les indicateurs' : 'Masquer les indicateurs'}
            active={indicatorsHidden}
            onSelect={() => {
              onSetIndicatorsHidden(!indicatorsHidden);
              setOpen(null);
            }}
            testId="chart-hide-indicators"
          />
          <FlyoutSeparator />
          <FlyoutRow
            label={drawingsHidden && indicatorsHidden ? 'Tout afficher' : 'Tout masquer'}
            active={drawingsHidden && indicatorsHidden}
            onSelect={() => {
              const hide = !(drawingsHidden && indicatorsHidden);
              onSetDrawingsHidden(hide);
              onSetIndicatorsHidden(hide);
              setOpen(null);
            }}
            testId="chart-hide-all"
          />
        </ToolFlyout>
      )}

      {open === 'favorites' && (
        <ToolFlyout
          label="Favoris"
          top={openTop}
          testId="chart-favorites-flyout"
          onDismiss={() => setOpen(null)}
        >
          <FlyoutHeading>Outils favoris</FlyoutHeading>
          {favoriteEntries.length === 0 ? (
            <p className="px-3 py-2 text-[length:var(--wariba-component-workstation-type-label)] leading-relaxed text-[color:var(--wariba-component-workstation-text-tertiary)]">
              Aucun favori. Ouvrez une famille d’outils et cliquez l’étoile d’un outil pour
              l’épingler ici.
            </p>
          ) : (
            favoriteEntries.map((entry) => (
              <FlyoutRow
                key={entry.tool}
                icon={entry.icon}
                label={entry.label}
                active={entry.tool === tool}
                favorite
                onToggleFavorite={() => onToggleFavorite(entry.tool)}
                onSelect={() => chooseTool(entry.tool)}
                testId={`chart-favorite-${entry.tool}`}
              />
            ))
          )}
        </ToolFlyout>
      )}
    </div>
  );
});
