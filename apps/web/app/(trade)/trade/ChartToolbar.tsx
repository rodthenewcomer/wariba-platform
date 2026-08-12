'use client';

import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ToolbarButton, WariXFitIcon, WariXIndicatorsIcon } from '@wariba/ui';
import { CANDLE_TIMEFRAMES, type CandleTimeframe } from '@wariba/contracts';
import { CHART_TOOLS, toolLabel, type ChartTool } from './chart-tool-mode';
import {
  canEnableAnotherIndicator,
  indicatorLabel,
  MAX_ACTIVE_INDICATORS,
  type ChartIndicator,
} from './chart-indicator-model';
import { ChartToolIcon } from './ChartToolIcon';

/**
 * The chart toolbar — W5 §14, §38, §61-§63, §86-§89.
 *
 * One compact analytical strip: canonical current timeframes stay reachable in
 * one click, indicators use a labelled popover, and WX1's six drawings live in
 * the separate desktop rail (or the single mobile Tools sheet).
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
      className="flex h-11 items-center gap-px rounded-[7px] bg-[color:var(--wariba-component-workstation-surface-control)] p-0 lg:h-8 lg:p-px"
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
            className={`wariba-data h-11 min-w-11 rounded-[6px] px-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:h-[30px] lg:min-w-8 ${
              selected
                ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] text-[color:var(--wariba-component-workstation-text-primary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
                : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
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
  icon: ReactNode;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}

/** A small dismissible popover. Escape closes it, and the trigger regains focus (§89). */
function ToolbarPopover({ label, testId, icon, active = false, children }: PopoverProps) {
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
      <ToolbarButton
        ref={triggerRef}
        label={label}
        icon={icon}
        showLabel
        active={open || active}
        data-testid={testId}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div
          id={id}
          className="absolute left-0 top-full z-[var(--wariba-z-popover)] mt-1 w-[13.5rem] rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] p-2 shadow-lg motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-popover)_ease-out]"
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
  onResetView,
  compact = false,
}: ChartToolbarProps) {
  return (
    <div
      data-testid="chart-toolbar"
      className="flex h-11 min-w-0 shrink-0 items-center gap-1 lg:h-8"
    >
      <TimeframeSelector timeframe={timeframe} onSelect={onSelectTimeframe} />
      {!compact && (
        <>
          <span
            aria-hidden="true"
            className="mx-0.5 h-5 w-px bg-[color:var(--wariba-component-workstation-border-hairline)]"
          />
          <ToolbarPopover
            label="Indicateurs"
            testId="chart-indicators-trigger"
            icon={<WariXIndicatorsIcon />}
          >
            {() => <IndicatorOptions indicators={indicators} onToggle={onToggleIndicator} />}
          </ToolbarPopover>
          {/* §63 — fit only. It touches the time scale and nothing else: no
              drawing is deleted, no indicator is reset, no timeframe changes and
              no command is sent. */}
          <ToolbarButton
            label="Ajuster le graphique"
            icon={<WariXFitIcon />}
            data-testid="chart-reset-view"
            onClick={onResetView}
          />
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
            className={`flex min-h-11 items-center gap-2 rounded-[var(--wariba-radius-sm)] px-1.5 py-1.5 text-[length:var(--wariba-font-size-label-sm)] lg:min-h-8 ${
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
      className="grid grid-cols-2 gap-1 sm:grid-cols-3"
    >
      {CHART_TOOLS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === tool}
          data-testid={`chart-tool-${option}`}
          onClick={() => onSelect(option)}
          className={`flex min-h-11 items-center gap-2 rounded-[var(--wariba-radius-sm)] px-2 py-1.5 text-left text-[length:var(--wariba-font-size-label-sm)] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
            option === tool
              ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] text-[color:var(--wariba-component-workstation-interaction-selected)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
              : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
          }`}
        >
          <ChartToolIcon tool={option} size="mobile" />
          <span>{toolLabel(option)}</span>
        </button>
      ))}
    </div>
  );
});
