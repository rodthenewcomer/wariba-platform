'use client';

import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx } from '../lib/cx';
import { Tooltip } from './Tooltip';

export type MetricTone = 'default' | 'positive' | 'negative' | 'warning' | 'danger';

const METRIC_TONE: Record<MetricTone, string> = {
  default: 'text-[color:var(--wariba-component-workstation-text-primary)]',
  positive: 'text-[color:var(--wariba-component-workstation-text-financial-positive)]',
  negative: 'text-[color:var(--wariba-component-workstation-text-financial-negative)]',
  warning: 'text-[color:var(--wariba-component-workstation-trading-warning)]',
  danger: 'text-[color:var(--wariba-component-workstation-trading-rejection)]',
};

/** The consumption rule takes its metric's own tone, so it can never disagree with the figure. */
const CONSUMPTION_TONE: Record<MetricTone, string> = {
  default: 'bg-[color:var(--wariba-component-workstation-interaction-selected)]',
  positive: 'bg-[color:var(--wariba-component-workstation-text-financial-positive)]',
  negative: 'bg-[color:var(--wariba-component-workstation-text-financial-negative)]',
  warning: 'bg-[color:var(--wariba-component-workstation-trading-warning)]',
  danger: 'bg-[color:var(--wariba-component-workstation-trading-rejection)]',
};

/**
 * How much of the instrument's hierarchy this figure claims.
 *
 * `lead` is the one number a trader checks first in its group; `support` is a
 * figure that only earns attention once the lead has been read. The difference
 * is deliberately a full type step (15px vs 13px) plus a text-colour step, not
 * a weight tweak — at a 44px bar height nothing smaller reads as hierarchy.
 */
export type MetricEmphasis = 'lead' | 'support';

/** `stacked` is cockpit instrumentation; `inline` stays available for dense rows. */
export type MetricLayout = 'stacked' | 'inline';

export interface MetricReadoutProps {
  label: string;
  shortLabel?: string;
  value: ReactNode;
  shortValue?: ReactNode;
  /**
   * Currency or scale, rendered a step down from the figure so the digits read
   * first. It stays inside the same `<dd>` — and inside the wide variant — so
   * the announced and matched value is still "10 000.00 USD", one string.
   */
  unit?: string;
  tone?: MetricTone;
  emphasis?: MetricEmphasis;
  layout?: MetricLayout;
  compact?: boolean;
  /**
   * How much of this metric's own budget is consumed, 0..1, as a hairline rule
   * under the figure.
   *
   * Final closure §12 — risk communicated visually without inventing data. The
   * ratio must come from a canonical helper, never from arithmetic performed
   * here; this component only draws what it is handed. The rule is
   * `aria-hidden` on purpose: it is a redundant encoding of the figure directly
   * above it, which is already text, so nothing is carried by colour alone.
   */
  consumedRatio?: number;
  className?: string;
  valueClassName?: string;
}

/** Business-free cockpit metric. The label/value relationship remains explicit. */
export function MetricReadout({
  label,
  shortLabel,
  value,
  shortValue,
  unit,
  tone = 'default',
  emphasis = 'support',
  layout = 'stacked',
  compact = false,
  consumedRatio,
  className,
  valueClassName,
}: MetricReadoutProps) {
  const stacked = layout === 'stacked';
  const unitNode = unit ? (
    <>
      {' '}
      <span className="text-[length:var(--wariba-component-workstation-type-meta)] font-medium text-[color:var(--wariba-component-workstation-text-tertiary)]">
        {unit}
      </span>
    </>
  ) : null;

  return (
    /*
     * Each metric is its own `<dl>`.
     *
     * Grouping metrics for the instrumentation bar first produced
     * `dl > div(group) > div(metric) > dt + dd`, and a `<dl>` only sanctions one
     * level of `<div>` grouping — axe flagged it `serious` on every workstation
     * page ("dl element has direct children that are not allowed: div > div",
     * plus a `definition-list` violation on every `<dt>`/`<dd>` under it). A
     * term/definition pair per metric is both valid and a truer description of
     * what one readout is, so the bar's container is now an ordinary element and
     * the list semantics live here, where the pair actually is.
     */
    <dl
      className={cx(
        'flex min-w-0 shrink-0',
        stacked
          ? 'flex-col justify-center gap-[3px]'
          : compact
            ? 'items-baseline gap-1'
            : 'items-baseline gap-1.5',
        className,
      )}
    >
      <dt
        className={cx(
          'truncate font-semibold uppercase leading-none text-[color:var(--wariba-component-workstation-text-tertiary)]',
          'text-[length:var(--wariba-component-workstation-type-meta)] tracking-[var(--wariba-component-workstation-tracking-section)]',
        )}
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="sm:hidden">
          {shortLabel ?? label}
        </span>
        <span aria-hidden="true" className="hidden sm:inline">
          {label}
        </span>
      </dt>
      <dd
        className={cx(
          'wariba-data truncate font-semibold leading-none tabular-nums',
          emphasis === 'lead'
            ? 'text-[length:var(--wariba-component-workstation-type-metric)]'
            : 'text-[length:var(--wariba-component-workstation-type-metric-compact)]',
          // Refinement pass — every figure in the bar is primary-toned, and
          // lead/support is carried by *size alone* (16px vs 14px). Dimming the
          // support figures to secondary is what produced the "tiny system
          // text" reading: four account numbers a trader checks constantly are
          // not secondary information, they are simply smaller than equity.
          METRIC_TONE[tone],
          valueClassName,
        )}
      >
        <span className="sm:hidden">{shortValue ?? value}</span>
        <span className="hidden sm:inline">
          {value}
          {unitNode}
        </span>
      </dd>
      {consumedRatio === undefined ? null : (
        <div
          aria-hidden="true"
          className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[color:var(--wariba-component-workstation-surface-canvas)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)]"
        >
          <div
            className={cx(
              'h-full rounded-full transition-[width] duration-[var(--wariba-component-workstation-motion-interaction)]',
              CONSUMPTION_TONE[tone],
            )}
            style={{ width: `${Math.min(100, Math.max(0, consumedRatio * 100))}%` }}
          />
        </div>
      )}
    </dl>
  );
}

/**
 * The vertical rule that turns a run of metrics into readable groups.
 *
 * The WX1 bar set every metric the same distance apart, which is why it read as
 * one continuous sentence rather than as instrumentation: grouping is what lets
 * the eye stop. This is a hairline, not a border — it separates without boxing.
 */
export function MetricSeam({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'h-6 w-px shrink-0 bg-[color:var(--wariba-component-workstation-border-hairline)]',
        className,
      )}
    />
  );
}

export type ModuleAccent = 'none' | 'identity' | 'interaction';

const MODULE_ACCENT: Record<ModuleAccent, string> = {
  none: '',
  identity: 'before:bg-[color:var(--wariba-component-workstation-identity-rule)]',
  interaction: 'before:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
};

export interface ModuleHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  /** A 2px leading rule. WARIBA copper marks an owned instrument; cobalt marks an active one. */
  accent?: ModuleAccent;
  className?: string;
  testId?: string;
}

/**
 * Compact module identity row shared by chart, execution and activity surfaces.
 *
 * Three things carry the "instrument, not form" reading: the header sits on the
 * raised surface rather than the module body so the module has a visible lid, a
 * hairline of top rim light gives that lid an edge, and the title runs a full
 * step above the eyebrow instead of matching it.
 */
export function ModuleHeader({
  title,
  eyebrow,
  status,
  actions,
  accent = 'none',
  className,
  testId,
}: ModuleHeaderProps) {
  return (
    <header
      data-testid={testId}
      className={cx(
        'relative flex h-[var(--wariba-component-workstation-module-header-height)] min-w-0 shrink-0 items-center gap-2',
        'border-b border-[color:var(--wariba-component-workstation-border-hairline)]',
        'bg-[color:var(--wariba-component-workstation-surface-raised-module)] px-2.5',
        'shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light)]',
        accent === 'none'
          ? ''
          : cx(
              'before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-r-full',
              MODULE_ACCENT[accent],
            ),
        className,
      )}
    >
      {eyebrow ? (
        <span className="shrink-0 text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="min-w-0 truncate text-[length:var(--wariba-component-workstation-type-module-title)] font-bold leading-none tracking-[-0.01em] text-[color:var(--wariba-component-workstation-text-primary)]">
        {title}
      </h2>
      {status ? (
        <div className="min-w-0 shrink text-[length:var(--wariba-component-workstation-type-meta)]">
          {status}
        </div>
      ) : null}
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

/**
 * Small-caps locator above a group of controls.
 *
 * Deliberately quieter than the values it introduces: a section label a trader
 * reads before the number is a label that has won an argument it should lose.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase leading-none',
        'tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  /** Extra screen-reader context, such as the selected instrument and live quote. */
  accessibleDetail?: ReactNode;
  labelClassName?: string;
  active?: boolean;
  showLabel?: boolean;
  tooltipSide?: 'top' | 'bottom';
}

/**
 * Groupable workstation action with one consistent focus, pressed and tooltip contract.
 *
 * The active state is a cobalt wash with a cobalt-300 label rather than a lighter
 * grey fill: the WX1 grey read as "slightly different rectangle" at a glance, and
 * grey-on-grey is exactly the timidity the visual closure exists to remove. The
 * text tone is cobalt **300**, not 400 — 400 on its own wash measures 4.25:1,
 * under AA for a 12px label.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    {
      label,
      icon,
      accessibleDetail,
      labelClassName,
      active,
      showLabel = false,
      tooltipSide = 'bottom',
      className,
      ...props
    },
    ref,
  ) {
    const button = (
      <button
        ref={ref}
        type="button"
        aria-label={showLabel ? undefined : label}
        aria-pressed={active === undefined ? undefined : active}
        className={cx(
          'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[7px] px-2',
          'text-[length:var(--wariba-component-workstation-type-data)] font-semibold',
          'transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-interaction)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
          'active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:text-[color:var(--wariba-text-disabled)]',
          active
            ? 'bg-[color:var(--wariba-component-workstation-wash-selected)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
            : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
          className,
        )}
        {...props}
      >
        {icon}
        {showLabel ? (
          <>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className={labelClassName}>
              {label}
            </span>
          </>
        ) : null}
        {accessibleDetail ? <span className="sr-only">{accessibleDetail}</span> : null}
      </button>
    );

    return showLabel ? (
      button
    ) : (
      <Tooltip label={label} side={tooltipSide}>
        {button}
      </Tooltip>
    );
  },
);

export interface ToolRailButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active: boolean;
}

/**
 * A drawing-rail tool.
 *
 * Selection is carried three ways at once — a cobalt wash, a cobalt-300 glyph and
 * a full-height leading rule — because the WX1 rail carried it only as a grey
 * background one step lighter than its neighbour (measured ~3.04:1 against the
 * rail, and perceptually far weaker than that number suggests at 32px).
 */
export function ToolRailButton({ label, icon, active, className, ...props }: ToolRailButtonProps) {
  return (
    <Tooltip label={label} side="right">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'relative flex h-8 w-8 items-center justify-center rounded-[7px]',
          'transition-[background-color,color,box-shadow,transform] duration-[var(--wariba-component-workstation-motion-interaction)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-px',
          active
            ? cx(
                'bg-[color:var(--wariba-component-workstation-wash-selected-strong)]',
                'text-[color:var(--wariba-component-workstation-interaction-selected-text)]',
                'ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]',
                // The rail is 36px around a 32px key, so −2px is exactly the
                // rail's own left edge: the accent reads as a mark on the rail
                // rather than as a stripe inside the button.
                'before:absolute before:-left-0.5 before:bottom-0 before:top-0 before:w-[3px] before:rounded-r-full before:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
              )
            : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
  /** Tighter desktop instrument density; mobile retains the 44px touch target. */
  compact?: boolean;
  testId?: string;
}

/**
 * Native-button radiogroup with roving focus and arrow-key selection.
 *
 * Presented as a mode switch rather than as generic tabs: the track is a sunken
 * control surface with a hairline, and the selected mode is a raised key with a
 * cobalt top rule — the same visual grammar the timeframe cluster and the tool
 * rail use, so "which mode am I in" reads identically everywhere in WariX.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
  compact = false,
  testId,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  /*
   * VX1-B §11 — Market/Limit/Stop share the interval track's grammar.
   *
   * One raised surface slides between the segments rather than two segments
   * repainting: the same object moving, which is what the interaction is. The
   * geometry is measured from the selected button because the control is a
   * `auto-cols-fr` grid — a computed third would drift the moment an option's
   * label changed length or an option was disabled.
   */
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = options.findIndex((option) => option.value === value);
    const selected = index >= 0 ? refs.current[index] : null;
    setIndicator((current) => {
      if (!selected) return current === null ? current : null;
      const next = { left: selected.offsetLeft, width: selected.offsetWidth };
      if (current && current.left === next.left && current.width === next.width) return current;
      return next;
    });
  }, [value, options]);
  const move = (event: KeyboardEvent<HTMLDivElement>, direction: 1 | -1) => {
    const enabled = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);
    const current = enabled.findIndex(({ option }) => option.value === value);
    if (current < 0 || enabled.length === 0) return;
    event.preventDefault();
    const next = enabled[(current + direction + enabled.length) % enabled.length];
    if (!next) return;
    onValueChange(next.option.value);
    refs.current[next.index]?.focus();
  };

  return (
    <div
      ref={trackRef}
      data-testid={testId}
      role="radiogroup"
      aria-label={label}
      className={cx(
        'relative grid h-11 grid-flow-col auto-cols-fr rounded-[var(--wariba-component-workstation-radius-control)] p-[3px]',
        compact ? 'lg:h-8 lg:p-0.5' : 'lg:h-9',
        'bg-[color:var(--wariba-component-workstation-surface-canvas)]',
        'shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55)]',
        'ring-1 ring-inset ring-[color:var(--wariba-component-workstation-seam-hairline)]',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(event, 1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(event, -1);
      }}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          data-testid={testId ? `${testId}-indicator` : undefined}
          className={cx(
            'pointer-events-none absolute inset-y-[3px] rounded-[var(--wariba-component-workstation-radius-micro)]',
            'bg-[color:var(--wariba-component-workstation-surface-control)]',
            'shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong),var(--wariba-component-workstation-elevation-key)]',
            'transition-[left,width] duration-[var(--wariba-component-workstation-motion-quick)]',
            'ease-[var(--wariba-component-workstation-ease-move)] motion-reduce:transition-none',
            compact ? 'lg:inset-y-0.5' : '',
          )}
          style={{ left: indicator.left, width: indicator.width }}
        >
          <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-[color:var(--wariba-component-workstation-interaction-selected)] shadow-[0_0_8px_0_var(--wariba-component-workstation-focus-glow)]" />
        </span>
      ) : null}
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cx(
              'relative z-10 rounded-[var(--wariba-component-workstation-radius-micro)] font-semibold uppercase',
              compact
                ? 'px-0.5 text-[length:var(--wariba-component-workstation-type-meta)] tracking-normal'
                : 'px-2 text-[length:var(--wariba-component-workstation-type-label)] tracking-[var(--wariba-component-workstation-tracking-label)]',
              'transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
              selected
                ? 'text-[color:var(--wariba-component-workstation-text-primary)]'
                : 'text-[color:var(--wariba-component-workstation-text-tertiary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface CompactEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CompactEmptyState({
  title,
  description,
  action,
  className,
}: CompactEmptyStateProps) {
  return (
    <div
      className={cx(
        'flex min-h-8 min-w-0 items-center gap-2 px-2.5 text-[length:var(--wariba-component-workstation-type-label)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--wariba-component-workstation-border-strong)]"
      />
      <span className="font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-secondary)]">
        {title}
      </span>
      {description ? (
        <span className="min-w-0 truncate text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {description}
        </span>
      ) : null}
      {action ? <span className="ml-auto shrink-0">{action}</span> : null}
    </div>
  );
}

export interface MobileStructuredRowProps {
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
  details?: ReactNode;
  /** A 2px leading rule in the row's own semantic colour — side, tone or state. */
  accentClassName?: string;
  className?: string;
}

export function MobileStructuredRow({
  primary,
  secondary,
  trailing,
  action,
  details,
  accentClassName,
  className,
}: MobileStructuredRowProps) {
  const detailsId = useId();
  return (
    <article
      className={cx(
        'relative grid min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1',
        'border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-2.5 py-2',
        accentClassName
          ? cx(
              'before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5',
              accentClassName,
            )
          : '',
        className,
      )}
      aria-describedby={details ? detailsId : undefined}
    >
      <div className="min-w-0 text-[length:var(--wariba-component-workstation-type-data)] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]">
        {primary}
      </div>
      {trailing ? (
        <div className="wariba-data row-span-2 self-center text-right text-[length:var(--wariba-component-workstation-type-data-strong)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]">
          {trailing}
        </div>
      ) : null}
      {secondary ? (
        <div className="min-w-0 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {secondary}
        </div>
      ) : null}
      {details ? (
        <div
          id={detailsId}
          className="col-span-2 text-[length:var(--wariba-component-workstation-type-label)] text-[color:var(--wariba-component-workstation-text-secondary)]"
        >
          {details}
        </div>
      ) : null}
      {action ? <div className="col-span-2 flex justify-end">{action}</div> : null}
    </article>
  );
}
