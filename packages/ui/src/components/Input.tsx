'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
  label: string;
  /** Hides the visible label but keeps it for assistive tech — never the only label source. */
  hideLabel?: boolean;
  helperText?: string;
  errorText?: string;
  suffix?: string;
}

/** Design System §24.2 — label always present (never placeholder-only), error/help wired via aria-describedby. */
export function Input({
  label,
  hideLabel = false,
  helperText,
  errorText,
  suffix,
  className,
  id: providedId,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const suffixId = suffix ? `${id}-suffix` : undefined;
  // Suffix first: it's the unit (e.g. "lots", "USD") right next to the
  // value, so a screen reader announces it before the longer helper/error
  // prose — otherwise a suffix-only Input (no helperText/errorText) had its
  // unit visible to sighted users but never announced at all.
  const describedBy = [suffixId, helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-[var(--wariba-component-input-label-gap)]">
      <label
        htmlFor={id}
        className={cx(
          'text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={Boolean(errorText) || undefined}
          className={cx(
            'h-[var(--wariba-component-input-height)] w-full rounded-[var(--wariba-component-input-radius)]',
            'border-[length:var(--wariba-component-input-border-width)] bg-[color:var(--wariba-background-surface)]',
            'px-[var(--wariba-component-input-padding-x)] text-[length:var(--wariba-font-size-body-md)]',
            'text-[color:var(--wariba-text-primary)] placeholder:text-[color:var(--wariba-text-secondary)]',
            errorText
              ? 'border-[color:var(--wariba-status-danger-border)]'
              : 'border-[color:var(--wariba-border-default)]',
            'disabled:bg-[color:var(--wariba-background-disabled)] disabled:text-[color:var(--wariba-text-disabled)]',
            'transition-colors',
            suffix && 'pr-12',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span
            id={suffixId}
            className="wariba-data pointer-events-none absolute right-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {helperText ? (
        <p
          id={helperId}
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
        >
          {helperText}
        </p>
      ) : null}
      {errorText ? (
        <p
          id={errorId}
          role="alert"
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-status-danger-text)]"
        >
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
