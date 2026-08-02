'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id?: string;
  label: string;
  helperText?: string;
}

export function Radio({ label, helperText, className, id: providedId, ...props }: RadioProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = helperText ? `${id}-helper` : undefined;

  return (
    <div className="flex gap-3">
      <input
        id={id}
        type="radio"
        aria-describedby={helperId}
        className={cx(
          'mt-0.5 h-5 w-5 shrink-0 cursor-pointer',
          'border-[length:var(--wariba-border-width-default)] border-[color:var(--wariba-border-strong)]',
          'accent-[var(--wariba-action-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-[var(--wariba-opacity-disabled)]',
          className,
        )}
        {...props}
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
          {label}
        </span>
        {helperText ? (
          <span
            id={helperId}
            className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
          >
            {helperText}
          </span>
        ) : null}
      </label>
    </div>
  );
}
