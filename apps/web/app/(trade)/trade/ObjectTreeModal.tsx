'use client';

import { WariXEyeIcon, WariXEyeOffIcon, WariXTrashIcon } from '@wariba/ui';
import { ChartModal } from './ChartModal';
import { catalogEntry } from './chart-tool-catalog';
import { drawingTypeLabel, type ChartDrawing } from './chart-drawing-model';
import { indicatorLabel, type ChartIndicator } from './chart-indicator-model';

/**
 * The object tree — §12.
 *
 * A real inventory of what is on this chart, built from the two stores that
 * actually hold it: the drawing store and the indicator registry. There is no
 * third "layers" concept invented to fill the panel, and no pane or series row
 * that WariX does not really have — §12 rules that out in as many words, and a
 * tree listing objects the trader cannot act on is a diagram, not a tool.
 *
 * Every row does something: select a drawing (which highlights it on the chart
 * and closes the panel, because the point of selecting is to look at it), toggle
 * a whole class of object's visibility, remove one drawing, or switch one
 * indicator off. Removal is per-object here rather than a single "clear
 * everything", because that is what a tree is *for* — the rail already has the
 * blunt instrument.
 */

export interface ObjectTreeModalProps {
  open: boolean;
  onClose(): void;
  symbol: string;
  drawings: readonly ChartDrawing[];
  selectedId: string | null;
  onSelectDrawing(id: string): void;
  onRemoveDrawing(id: string): void;
  drawingsHidden: boolean;
  onSetDrawingsHidden(hidden: boolean): void;
  indicators: readonly ChartIndicator[];
  onToggleIndicator(id: string): void;
  indicatorsHidden: boolean;
  onSetIndicatorsHidden(hidden: boolean): void;
}

function GroupHeader({
  title,
  count,
  hidden,
  onToggleHidden,
}: {
  title: string;
  count: number;
  hidden: boolean;
  onToggleHidden(): void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-canvas)] px-3 py-1.5">
      <span className="text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
        {title}
      </span>
      <span className="wariba-data rounded-full bg-[color:var(--wariba-component-workstation-surface-control)] px-1.5 text-[length:var(--wariba-component-workstation-type-meta)] tabular-nums text-[color:var(--wariba-component-workstation-text-secondary)]">
        {count}
      </span>
      <button
        type="button"
        onClick={onToggleHidden}
        aria-pressed={hidden}
        className={`ml-auto flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[length:var(--wariba-component-workstation-type-label)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] ${
          hidden
            ? 'text-[color:var(--wariba-component-workstation-trading-warning)]'
            : 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
        }`}
      >
        {hidden ? <WariXEyeOffIcon size="toolbar" /> : <WariXEyeIcon size="toolbar" />}
        {hidden ? 'Masqués' : 'Visibles'}
      </button>
    </div>
  );
}

export function ObjectTreeModal({
  open,
  onClose,
  symbol,
  drawings,
  selectedId,
  onSelectDrawing,
  onRemoveDrawing,
  drawingsHidden,
  onSetDrawingsHidden,
  indicators,
  onToggleIndicator,
  indicatorsHidden,
  onSetIndicatorsHidden,
}: ObjectTreeModalProps) {
  const enabledIndicators = indicators.filter((indicator) => indicator.enabled);

  return (
    <ChartModal
      open={open}
      onClose={onClose}
      title="Arborescence des objets"
      subtitle={`${symbol} — dessins et indicateurs actuellement sur ce graphique.`}
      width={480}
      height={520}
      testId="chart-object-tree"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <GroupHeader
          title="Dessins"
          count={drawings.length}
          hidden={drawingsHidden}
          onToggleHidden={() => onSetDrawingsHidden(!drawingsHidden)}
        />
        {drawings.length === 0 ? (
          <p className="px-3 py-4 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Aucun dessin sur {symbol}.
          </p>
        ) : (
          [...drawings].reverse().map((drawing) => {
            const entry = catalogEntry(drawing.type);
            const selected = drawing.id === selectedId;
            return (
              <div
                key={drawing.id}
                className={`flex items-center border-b border-[color:var(--wariba-component-workstation-border-hairline)] ${
                  selected ? 'bg-[color:var(--wariba-component-workstation-wash-selected)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectDrawing(drawing.id);
                    onClose();
                  }}
                  data-testid={`object-tree-drawing-${drawing.id}`}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 px-3 text-left text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-0.5 shrink-0 rounded-full"
                    style={{ backgroundColor: drawing.style.color }}
                  />
                  <span className="shrink-0 opacity-80">{entry?.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{drawingTypeLabel(drawing.type)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveDrawing(drawing.id)}
                  aria-label={`Supprimer ${drawingTypeLabel(drawing.type)}`}
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-trading-sell)]"
                >
                  <WariXTrashIcon size="toolbar" />
                </button>
              </div>
            );
          })
        )}

        <GroupHeader
          title="Indicateurs"
          count={enabledIndicators.length}
          hidden={indicatorsHidden}
          onToggleHidden={() => onSetIndicatorsHidden(!indicatorsHidden)}
        />
        {enabledIndicators.length === 0 ? (
          <p className="px-3 py-4 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Aucun indicateur actif.
          </p>
        ) : (
          enabledIndicators.map((indicator) => (
            <div
              key={indicator.id}
              className="flex items-center border-b border-[color:var(--wariba-component-workstation-border-hairline)]"
            >
              <span className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 px-3 text-[length:var(--wariba-component-workstation-type-data)] text-[color:var(--wariba-component-workstation-text-secondary)]">
                <span
                  aria-hidden="true"
                  className="w-5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: indicator.style.color,
                    height: indicator.style.width + 1,
                  }}
                />
                <span className="wariba-data min-w-0 flex-1 truncate tabular-nums">
                  {indicatorLabel(indicator)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggleIndicator(indicator.id)}
                aria-label={`Désactiver ${indicatorLabel(indicator)}`}
                className="mr-1.5 flex h-8 items-center rounded-[6px] px-2 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]"
              >
                Désactiver
              </button>
            </div>
          ))
        )}
      </div>
    </ChartModal>
  );
}
