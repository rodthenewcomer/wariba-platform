'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface ExecutionFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
> {
  /** Always present for assistive technology; `visibleLabel` decides whether it is also drawn. */
  label: string;
  visibleLabel?: ReactNode;
  errorText?: string | null;
  /** A 2px leading rule in the field's own semantic colour — stop-loss coral, take-profit emerald. */
  accentClassName?: string;
  /**
   * A small-caps tag drawn inside the field, before the value.
   *
   * This is what lets the Execution Center's gutter carry one label per section
   * (`PROTECTION`) while the two fields under it stay individually identifiable
   * without a second row of headings above them. The accessible `label` is
   * unchanged and still bound by `htmlFor` — the tag is decoration over a name
   * that already exists.
   */
  prefix?: string;
  prefixClassName?: string;
  /** Unit or scale drawn inside the field, after the value. */
  suffix?: string;
  inputClassName?: string;
}

/**
 * The Execution Center's own text field.
 *
 * WariX deliberately does not use the platform `Input` here. That component is
 * the light-theme product control — it paints `--wariba-background-surface`,
 * carries a 40px height and a visible 14px label, and three of them stacked is
 * exactly the "vertical form" reading the visual closure exists to remove.
 * This one is a workstation instrument: sunken control surface, hairline ring,
 * cobalt focus ring, a small-caps label that stays subordinate to the value,
 * and an optional side-coloured leading rule so a stop and a target are
 * distinguishable before either is read.
 *
 * The accessibility contract is identical and non-negotiable: a real `<label>`
 * bound by `htmlFor`, `aria-invalid` when rejected, and the error wired through
 * `aria-describedby` rather than left as adjacent text.
 */
export function ExecutionField({
  label,
  visibleLabel,
  errorText,
  accentClassName,
  prefix,
  prefixClassName,
  suffix,
  inputClassName,
  id: providedId,
  ...props
}: ExecutionFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = errorText ? `${id}-error` : undefined;
  const suffixId = suffix ? `${id}-suffix` : undefined;
  const describedBy = [suffixId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className={
          visibleLabel
            ? 'text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]'
            : 'sr-only'
        }
      >
        {visibleLabel ?? label}
        {visibleLabel ? <span className="sr-only"> {label}</span> : null}
      </label>
      <div
        className={`relative flex h-11 items-center overflow-hidden rounded-[var(--wariba-component-workstation-radius-control)] bg-[color:var(--wariba-component-workstation-surface-canvas)] shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55)] ring-1 ring-inset transition-[box-shadow] duration-[var(--wariba-component-workstation-motion-quick)] focus-within:shadow-[inset_0_1px_2px_0_rgba(5,7,12,0.55),0_0_6px_0_var(--wariba-component-workstation-focus-glow)] lg:h-9 ${
          errorText
            ? 'ring-[color:var(--wariba-component-workstation-trading-rejection)]'
            : 'ring-[color:var(--wariba-component-workstation-border-hairline)] focus-within:ring-[color:var(--wariba-component-workstation-border-focus)]'
        }`}
      >
        {accentClassName ? (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 left-0 top-0 w-[3px] ${accentClassName}`}
          />
        ) : null}
        {prefix ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none shrink-0 pl-1.5 pr-1 text-[length:var(--wariba-component-workstation-type-meta)] font-bold uppercase leading-none tracking-[var(--wariba-component-workstation-tracking-label)] ${
              prefixClassName ?? 'text-[color:var(--wariba-component-workstation-text-tertiary)]'
            }`}
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={Boolean(errorText) || undefined}
          className={`wariba-data h-full min-w-0 w-full border-0 bg-transparent text-[length:var(--wariba-component-workstation-type-data-strong)] tabular-nums text-[color:var(--wariba-component-workstation-text-primary)] placeholder:font-sans placeholder:text-[length:var(--wariba-component-workstation-type-meta)] placeholder:text-[color:var(--wariba-component-workstation-text-tertiary)] focus:outline-none ${
            prefix ? 'pl-0' : 'pl-2.5'
          } ${suffix ? 'pr-9' : 'pr-1.5'} ${inputClassName ?? ''}`}
          {...props}
        />
        {suffix ? (
          <span
            id={suffixId}
            className="pointer-events-none absolute right-2.5 text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {errorText ? (
        <p
          id={errorId}
          className="text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-trading-rejection)]"
        >
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
