'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { CANDLE_TIMEFRAMES, type CandleTimeframe } from '@wariba/contracts';
import { CHART_TOOLS, toolLabel, type ChartTool } from './chart-tool-mode';
import {
  canEnableAnotherIndicator,
  indicatorLabel,
  MAX_ACTIVE_INDICATORS,
  type ChartIndicator,
} from './chart-indicator-model';

/**
 * The chart toolbar — W5 §14, §38, §61-§63, §86-§89.
 *
 * One compact analytical strip: timeframes reachable in a single click at every
 * supported width, and everything else behind a labelled popover so the drawing
 * tools cannot push the strip past the panel's width at 1366 or 1440 (§62).
 * Nothing here submits a trading command, and nothing here reads execution state.
 *
 * **Accessibility.** The timeframe control is a real radiogroup with roving tab
 * focus and arrow-key navigation (§86); the indicator toggles are real
 * checkboxes with names, not colour swatches (§87); the tool buttons carry
 * `aria-pressed` and text names (§88). No control depends on colour alone to say
 * which one is active.
 */

interface TimeframeSelectorProps {
  timeframe: CandleTimeframe;
  onSelect(timeframe: CandleTimeframe): void;
}

/**
 * §86 — a radiogroup, not five buttons.
 *
 * Roving tabindex: one stop in the tab order, arrows move within the group. That
 * is the WAI-ARIA radio pattern, and it is what lets a keyboard trader change
 * interval without tabbing past four controls they did not want.
 */
const TimeframeSelector = memo(function TimeframeSelector({
  timeframe,
  onSelect,
}: TimeframeSelectorProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (direction: 1 | -1) => {
    const index = CANDLE_TIMEFRAMES.indexOf(timeframe);
    const next =
      CANDLE_TIMEFRAMES[(index + direction + CANDLE_TIMEFRAMES.length) % CANDLE_TIMEFRAMES.length];
    if (!next) return;
    onSelect(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Intervalle du graphique"
      data-testid="chart-timeframes"
      className="flex items-center gap-px rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-component-workstation-surface-raised)] p-px"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {CANDLE_TIMEFRAMES.map((option) => {
        const selected = option === timeframe;
        return (
          <button
            key={option}
            ref={(node) => {
              refs.current[option] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(option)}
            className={`wariba-data min-w-[2.25rem] rounded-[calc(var(--wariba-radius-sm)-1px)] px-1.5 py-1 text-[length:var(--wariba-font-size-label-sm)] font-medium transition-colors ${
              selected
                ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
                : 'text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-theme-text)]'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
});

interface PopoverProps {
  label: string;
  testId: string;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}

/** A small dismissible popover. Escape closes it, and the trigger regains focus (§89). */
function ToolbarPopover({ label, testId, active = false, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Only this popover's Escape — an active drawing owns Escape while the
      // popover is shut, and the two must not both react to one press (§112).
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`rounded-[var(--wariba-radius-sm)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] font-medium transition-colors ${
          open || active
            ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
            : 'text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-theme-text)]'
        }`}
      >
        {label}
      </button>
      {open && (
        <div
          id={id}
          className="absolute left-0 top-full z-30 mt-1 w-[13.5rem] rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-component-workstation-seam)] bg-[color:var(--wariba-component-workstation-surface-raised)] p-2 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export interface ChartToolbarProps {
  timeframe: CandleTimeframe;
  onSelectTimeframe(timeframe: CandleTimeframe): void;
  indicators: readonly ChartIndicator[];
  onToggleIndicator(id: string): void;
  tool: ChartTool;
  onSelectTool(tool: ChartTool): void;
  onResetView(): void;
  /** Mobile presentations hide the inline popovers and use a sheet instead (§66). */
  compact?: boolean;
}

export const ChartToolbar = memo(function ChartToolbar({
  timeframe,
  onSelectTimeframe,
  indicators,
  onToggleIndicator,
  tool,
  onSelectTool,
  onResetView,
  compact = false,
}: ChartToolbarProps) {
  return (
    <div
      data-testid="chart-toolbar"
      className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5"
    >
      <TimeframeSelector timeframe={timeframe} onSelect={onSelectTimeframe} />
      {!compact && (
        <>
          <ToolbarPopover label="Indicateurs" testId="chart-indicators-trigger">
            {() => <IndicatorOptions indicators={indicators} onToggle={onToggleIndicator} />}
          </ToolbarPopover>
          <ToolbarPopover label="Outils" testId="chart-tools-trigger" active={tool !== 'select'}>
            {(close) => (
              <ToolOptions
                tool={tool}
                onSelect={(next) => {
                  onSelectTool(next);
                  close();
                }}
              />
            )}
          </ToolbarPopover>
          {/* §63 — fit only. It touches the time scale and nothing else: no
              drawing is deleted, no indicator is reset, no timeframe changes and
              no command is sent. */}
          <button
            type="button"
            data-testid="chart-reset-view"
            onClick={onResetView}
            className="rounded-[var(--wariba-radius-sm)] px-2 py-1 text-[length:var(--wariba-font-size-label-sm)] font-medium text-[color:var(--wariba-text-secondary)] transition-colors hover:text-[color:var(--wariba-theme-text)]"
          >
            Ajuster
          </button>
        </>
      )}
    </div>
  );
});

export interface IndicatorOptionsProps {
  indicators: readonly ChartIndicator[];
  onToggle(id: string): void;
}

/** §38/§87 — real checkboxes with names. Shared by the desktop popover and the mobile sheet. */
export const IndicatorOptions = memo(function IndicatorOptions({
  indicators,
  onToggle,
}: IndicatorOptionsProps) {
  const canEnableMore = canEnableAnotherIndicator(indicators);
  return (
    <fieldset className="flex flex-col gap-0.5" data-testid="chart-indicator-options">
      <legend className="sr-only">Indicateurs du graphique</legend>
      {indicators.map((indicator) => {
        const label = indicatorLabel(indicator);
        const blocked = !indicator.enabled && !canEnableMore;
        return (
          <label
            key={indicator.id}
            className={`flex items-center gap-2 rounded-[var(--wariba-radius-sm)] px-1.5 py-1.5 text-[length:var(--wariba-font-size-label-sm)] ${
              blocked
                ? 'opacity-50'
                : 'cursor-pointer hover:bg-[color:var(--wariba-surface-selected)]'
            }`}
          >
            <input
              type="checkbox"
              checked={indicator.enabled}
              disabled={blocked}
              onChange={() => onToggle(indicator.id)}
              className="h-3.5 w-3.5 accent-[color:var(--wariba-chart-position,#6684FF)]"
            />
            <span
              aria-hidden="true"
              className="h-0.5 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: indicator.style.color }}
            />
            <span className="wariba-data text-[color:var(--wariba-theme-text)]">{label}</span>
          </label>
        );
      })}
      {!canEnableMore && (
        <p className="px-1.5 pt-1 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          Maximum {MAX_ACTIVE_INDICATORS} indicateurs actifs.
        </p>
      )}
    </fieldset>
  );
});

export interface ToolOptionsProps {
  tool: ChartTool;
  onSelect(tool: ChartTool): void;
}

/** §88 — every tool has a text name, so the toolbar is usable without seeing an icon. */
export const ToolOptions = memo(function ToolOptions({ tool, onSelect }: ToolOptionsProps) {
  return (
    <div
      role="group"
      aria-label="Outils de dessin"
      data-testid="chart-tool-options"
      className="flex flex-col gap-0.5"
    >
      {CHART_TOOLS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === tool}
          data-testid={`chart-tool-${option}`}
          onClick={() => onSelect(option)}
          className={`rounded-[var(--wariba-radius-sm)] px-1.5 py-1.5 text-left text-[length:var(--wariba-font-size-label-sm)] transition-colors ${
            option === tool
              ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
              : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)]'
          }`}
        >
          {toolLabel(option)}
        </button>
      ))}
    </div>
  );
});
