'use client';

import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string;
  label: string;
  helperText?: string;
  errorText?: string;
  children: ReactNode;
}

/** Native <select> — full keyboard/screen-reader support without reinventing it (Design System §24.3). */
export function Select({
  label,
  helperText,
  errorText,
  className,
  id: providedId,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-[var(--wariba-component-input-label-gap)]">
      <label
        htmlFor={id}
        className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]"
      >
        {label}
      </label>
      <select
        id={id}
        aria-describedby={[helperId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(errorText) || undefined}
        className={cx(
          'h-[var(--wariba-component-input-height)] rounded-[var(--wariba-component-input-radius)]',
          'border-[length:var(--wariba-component-input-border-width)] bg-[color:var(--wariba-background-surface)]',
          'px-[var(--wariba-component-input-padding-x)] text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]',
          errorText
            ? 'border-[color:var(--wariba-status-danger-border)]'
            : 'border-[color:var(--wariba-border-default)]',
          'disabled:bg-[color:var(--wariba-background-disabled)] disabled:text-[color:var(--wariba-text-disabled)]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
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
