'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassNames, type ButtonSize, type ButtonVariant } from './button-styles';

export { buttonClassNames } from './button-styles';
export type { ButtonSize, ButtonStyleOptions, ButtonVariant } from './button-styles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon rendered before the label — pass a sized <Icon />. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * Every action in WARIBA has a verb + object label (Design System §42.2) —
 * this component doesn't enforce that, but callers should never pass "OK".
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      className={buttonClassNames({ variant, size, className })}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leadingIcon
      )}
      <span className={loading ? 'opacity-70' : undefined}>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}
