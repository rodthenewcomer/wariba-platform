'use client';

import {
  forwardRef,
  useId,
  useRef,
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
  testId,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
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
      data-testid={testId}
      role="radiogroup"
      aria-label={label}
      className={cx(
        'grid h-11 grid-flow-col auto-cols-fr rounded-[9px] p-[3px] lg:h-9',
        'bg-[color:var(--wariba-component-workstation-surface-canvas)]',
        'ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)]',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(event, 1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(event, -1);
      }}
    >
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
              'relative rounded-[6px] px-2 font-semibold uppercase',
              'text-[length:var(--wariba-component-workstation-type-label)] tracking-[var(--wariba-component-workstation-tracking-label)]',
              'transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
              selected
                ? cx(
                    'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-primary)]',
                    'shadow-[inset_0_1px_0_0_var(--wariba-component-workstation-rim-light-strong),var(--wariba-component-workstation-elevation-key)]',
                    'after:absolute after:inset-x-2 after:top-0 after:h-0.5 after:rounded-b-full after:bg-[color:var(--wariba-component-workstation-interaction-selected)]',
                  )
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
