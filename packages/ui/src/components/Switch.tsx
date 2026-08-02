'use client';

import { useId, type ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'id'
> {
  id?: string;
  label: string;
  hideLabel?: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Design System §24.6 — a reversible preference / feature flag toggle, never used
 * to accept a legal condition (use Checkbox for that).
 */
export function Switch({
  label,
  hideLabel = false,
  checked,
  onCheckedChange,
  disabled,
  className,
  id: providedId,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cx(
          'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors',
          checked
            ? 'bg-[color:var(--wariba-action-primary)]'
            : 'bg-[color:var(--wariba-border-strong)]',
          'disabled:cursor-not-allowed disabled:opacity-[var(--wariba-opacity-disabled)]',
          className,
        )}
        {...props}
      >
        <span
          className={cx(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </button>
      <label
        htmlFor={id}
        className={cx(
          'text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
    </div>
  );
}
