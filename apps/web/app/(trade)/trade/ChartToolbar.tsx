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
    /*
     * Visual closure §10 — a mode track, not five loose buttons.
     *
     * Sunken track, hairline ring, and the selected interval raised out of it
     * with a cobalt top rule: the same grammar `SegmentedControl` uses for order
     * type and `ToolRailButton` uses for the active drawing, so "which mode is
     * on" reads identically everywhere in WariX.
     *
     * The track is a plain flex row of `shrink-0` keys with its own horizontal
     * overflow. WX2's professional intervals can be appended to
     * `CANDLE_TIMEFRAMES` and will lay out and scroll correctly with no further
     * design work — which is §10's "design it so it can grow" requirement met
     * structurally rather than promised.
     */
    <div
      role="radiogroup"
      aria-label="Intervalle du graphique"
      data-testid="chart-timeframes"
      /* The track's inset padding is desktop-only. On a phone the row is 44px
         and the pre-chart chrome budget is exactly 116px, so 3px of track
         padding would leave 38px keys — under the touch minimum, which the WX1
         evidence harness measures. Mobile keys therefore fill the track. */
      className="flex h-11 min-w-0 items-center gap-0.5 overflow-x-auto rounded-[9px] bg-[color:var(--wariba-component-workstation-surface-canvas)] p-0 ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)] lg:h-9 lg:p-[3px]"
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
            className={`wariba-data relative h-full min-w-11 shrink-0 rounded-[6px] px-2 text-[length:var(--wariba-component-workstation-type-label)] font-semibold uppercase tabular-nums transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] lg:min-w-9 ${
              selected
                ? 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-primary)] shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong),var(--wariba-component-workstation-elevation-key)] after:absolute after:inset-x-2 after:top-0 after:h-0.5 after:rounded-b-full after:bg-[color:var(--wariba-component-workstation-interaction-selected)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
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
        /*
         * Refinement pass — chart instrumentation, not a settings card.
         *
         * Three changes carry it: a titled header band in the same small caps
         * the workstation's module headers use, a *sunken* well for the list so
         * the popover reads as a housing around instruments rather than as a
         * floating sheet of options, and a 10px radius matching the rail and
         * toolbar keys instead of the 12px card radius. It is attached to the
         * toolbar that opened it, not hovering above the page.
         */
        <div
          id={id}
          className="absolute left-0 top-full z-[var(--wariba-z-popover)] mt-1.5 w-[15rem] overflow-hidden rounded-[10px] border border-[color:var(--wariba-component-workstation-border-strong)] bg-[color:var(--wariba-component-workstation-surface-popover)] shadow-[var(--wariba-component-workstation-elevation-popover)] motion-safe:animate-[wariba-fade-in_var(--wariba-component-workstation-motion-popover)_ease-out]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-2.5 py-1.5 shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]">
            <span className="text-[length:var(--wariba-component-workstation-type-section-label)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-secondary)]">
              {label}
            </span>
          </div>
          <div className="bg-[color:var(--wariba-component-workstation-surface-canvas)] p-1.5">
            {children(() => setOpen(false))}
          </div>
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
      /* `shrink`, not `shrink-0`. At 320 the five 44px interval keys plus the
         two toolbar keys beside them measure 2px more than the viewport, so the
         last key clipped at the screen edge. The interval track already owns a
         horizontal overflow; letting the toolbar shrink is what hands the track
         that job instead of pushing the row past the edge. No key drops below
         its 44px touch target — the track scrolls. */
      className="flex h-11 min-w-0 shrink items-center gap-2 lg:h-9 lg:shrink-0"
    >
      <TimeframeSelector timeframe={timeframe} onSelect={onSelectTimeframe} />
      {!compact && (
        <>
          <span
            aria-hidden="true"
            className="h-5 w-px shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]"
          />
          {/* §10 — analysis is its own tool group, held together by proximity
              and separated from the interval track by a seam. */}
          <div className="flex shrink-0 items-center gap-1">
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
          </div>
        </>
      )}
    </div>
  );
});

export interface IndicatorOptionsProps {
  indicators: readonly ChartIndicator[];
  onToggle(id: string): void;
}

/**
 * §38/§87 — real checkboxes with names. Shared by the desktop popover and the
 * mobile sheet.
 *
 * Visual closure §18 — a palette row rather than a settings line. The row is a
 * chip that takes the indicator's own colour as a leading rule and lifts onto a
 * wash when active, the series colour is a drawn stroke rather than a dot, and
 * the native checkbox keeps its own accent colour so the control that carries
 * the state is still the control assistive technology and the E2E suite operate.
 * Nothing here becomes a div pretending to be a checkbox.
 */
export const IndicatorOptions = memo(function IndicatorOptions({
  indicators,
  onToggle,
}: IndicatorOptionsProps) {
  const canEnableMore = canEnableAnotherIndicator(indicators);
  return (
    <fieldset className="flex flex-col gap-1" data-testid="chart-indicator-options">
      <legend className="sr-only">Indicateurs du graphique</legend>
      {indicators.map((indicator) => {
        const label = indicatorLabel(indicator);
        const blocked = !indicator.enabled && !canEnableMore;
        return (
          <label
            key={indicator.id}
            className={`relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-[8px] pl-2.5 pr-2 text-[length:var(--wariba-component-workstation-type-data)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] lg:min-h-9 ${
              blocked
                ? 'opacity-45'
                : indicator.enabled
                  ? 'cursor-pointer bg-[color:var(--wariba-component-workstation-wash-neutral)]'
                  : 'cursor-pointer hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)]'
            }`}
          >
            {/* The leading rule is the indicator's own colour, so the palette is
                colour-coded without colour ever being the only identifier — the
                name sits right beside it. */}
            <span
              aria-hidden="true"
              className={`absolute bottom-0 left-0 top-0 w-0.5 ${indicator.enabled ? '' : 'opacity-30'}`}
              style={{ backgroundColor: indicator.style.color }}
            />
            <input
              type="checkbox"
              checked={indicator.enabled}
              disabled={blocked}
              onChange={() => onToggle(indicator.id)}
              className="h-4 w-4 shrink-0"
              style={{ accentColor: indicator.style.color }}
            />
            <span
              aria-hidden="true"
              className={`h-[3px] w-5 shrink-0 rounded-full ${indicator.enabled ? '' : 'opacity-40'}`}
              style={{ backgroundColor: indicator.style.color }}
            />
            <span
              className={`wariba-data font-semibold tabular-nums ${
                indicator.enabled
                  ? 'text-[color:var(--wariba-component-workstation-text-primary)]'
                  : 'text-[color:var(--wariba-component-workstation-text-secondary)]'
              }`}
            >
              {label}
            </span>
          </label>
        );
      })}
      {!canEnableMore && (
        <p className="px-1.5 pt-1 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
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

/**
 * §88 — every tool has a text name, so the toolbar is usable without seeing an
 * icon.
 *
 * Visual closure §18 — a tool palette: icon-forward tiles on a three-column
 * grid with the glyph above its name, rather than a stack of full-width text
 * rows that read as menu items. Each tile is 64px tall, comfortably past the
 * 44px touch minimum, and the selected tool takes the same cobalt wash + rule
 * the desktop rail uses so the two presentations of one choice look like one
 * choice.
 */
export const ToolOptions = memo(function ToolOptions({ tool, onSelect }: ToolOptionsProps) {
  return (
    <div
      role="group"
      aria-label="Outils de dessin"
      data-testid="chart-tool-options"
      className="grid grid-cols-3 gap-1.5"
    >
      {CHART_TOOLS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === tool}
          data-testid={`chart-tool-${option}`}
          onClick={() => onSelect(option)}
          className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[10px] px-1 py-2 text-center text-[length:var(--wariba-component-workstation-type-label)] font-semibold leading-tight transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] ${
            option === tool
              ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
              : 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]'
          }`}
        >
          <ChartToolIcon tool={option} size="mobile" />
          <span className="line-clamp-2">{toolLabel(option)}</span>
        </button>
      ))}
    </div>
  );
});
