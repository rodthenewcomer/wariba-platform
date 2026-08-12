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

export interface MetricReadoutProps {
  label: string;
  shortLabel?: string;
  value: ReactNode;
  shortValue?: ReactNode;
  tone?: MetricTone;
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
  tone = 'default',
  compact = false,
  className,
  valueClassName,
}: MetricReadoutProps) {
  return (
    <div
      className={cx(
        'flex min-w-0 shrink-0 items-baseline',
        compact ? 'gap-1' : 'gap-1.5',
        className,
      )}
    >
      <dt className="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-[color:var(--wariba-component-workstation-text-tertiary)]">
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
          'wariba-data truncate text-[13px] font-semibold leading-none tabular-nums',
          METRIC_TONE[tone],
          valueClassName,
        )}
      >
        <span className="sm:hidden">{shortValue ?? value}</span>
        <span className="hidden sm:inline">{value}</span>
      </dd>
    </div>
  );
}

export interface ModuleHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
  testId?: string;
}

/** Compact module identity row shared by chart, execution and activity surfaces. */
export function ModuleHeader({
  title,
  eyebrow,
  status,
  actions,
  className,
  testId,
}: ModuleHeaderProps) {
  return (
    <header
      data-testid={testId}
      className={cx(
        'flex h-[var(--wariba-component-workstation-module-header-height)] min-w-0 shrink-0 items-center gap-2 border-b border-[color:var(--wariba-component-workstation-border-hairline)] bg-[color:var(--wariba-component-workstation-surface-module)] px-2',
        className,
      )}
    >
      {eyebrow ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="min-w-0 truncate text-[13px] font-bold leading-none text-[color:var(--wariba-component-workstation-text-primary)]">
        {title}
      </h2>
      {status ? <div className="min-w-0 shrink text-[11px]">{status}</div> : null}
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
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

/** Groupable workstation action with one consistent focus, pressed and tooltip contract. */
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
          'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[6px] px-2 text-[12px] font-semibold',
          'transition-[background-color,color,border-color,transform] duration-[var(--wariba-component-workstation-motion-interaction)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
          'active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:text-[color:var(--wariba-text-disabled)]',
          active
            ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] text-[color:var(--wariba-component-workstation-text-primary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
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

export function ToolRailButton({ label, icon, active, className, ...props }: ToolRailButtonProps) {
  return (
    <Tooltip label={label} side="right">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'relative flex h-8 w-8 items-center justify-center rounded-[6px] transition-[background-color,color,transform] duration-[var(--wariba-component-workstation-motion-interaction)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)] active:translate-y-px',
          active
            ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] text-[color:var(--wariba-component-workstation-interaction-selected)] before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:rounded-r before:bg-[color:var(--wariba-component-workstation-border-selected)]'
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

/** Native-button radiogroup with roving focus and arrow-key selection. */
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
        'grid h-11 grid-flow-col auto-cols-fr rounded-[8px] bg-[color:var(--wariba-component-workstation-surface-control)] p-0.5 lg:h-8',
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
              'rounded-[6px] px-2 text-[11px] font-semibold transition-colors duration-[var(--wariba-component-workstation-motion-interaction)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
              selected
                ? 'bg-[color:var(--wariba-component-workstation-surface-control-active)] text-[color:var(--wariba-component-workstation-text-primary)] shadow-[var(--wariba-shadow-xs)]'
                : 'text-[color:var(--wariba-component-workstation-text-secondary)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
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
    <div className={cx('flex min-h-8 min-w-0 items-center gap-2 px-2 text-[11px]', className)}>
      <span className="font-semibold text-[color:var(--wariba-component-workstation-text-secondary)]">
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
  className?: string;
}

export function MobileStructuredRow({
  primary,
  secondary,
  trailing,
  action,
  details,
  className,
}: MobileStructuredRowProps) {
  const detailsId = useId();
  return (
    <article
      className={cx(
        'grid min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[color:var(--wariba-component-workstation-border-hairline)] px-2 py-2',
        className,
      )}
      aria-describedby={details ? detailsId : undefined}
    >
      <div className="min-w-0 text-[12px] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]">
        {primary}
      </div>
      {trailing ? (
        <div className="wariba-data row-span-2 self-center text-right text-[12px] tabular-nums text-[color:var(--wariba-component-workstation-text-primary)]">
          {trailing}
        </div>
      ) : null}
      {secondary ? (
        <div className="min-w-0 text-[11px] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {secondary}
        </div>
      ) : null}
      {details ? (
        <div
          id={detailsId}
          className="col-span-2 text-[11px] text-[color:var(--wariba-component-workstation-text-secondary)]"
        >
          {details}
        </div>
      ) : null}
      {action ? <div className="col-span-2 flex justify-end">{action}</div> : null}
    </article>
  );
}
