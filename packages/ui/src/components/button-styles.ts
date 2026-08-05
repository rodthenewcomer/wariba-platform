import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-[var(--wariba-component-button-height-sm)] px-[var(--wariba-component-button-padding-x-sm)] text-[length:var(--wariba-font-size-label-sm)]',
  md: 'h-[var(--wariba-component-button-height-md)] px-[var(--wariba-component-button-padding-x-md)] text-[length:var(--wariba-font-size-label-md)]',
  lg: 'h-[var(--wariba-component-button-height-lg)] px-[var(--wariba-component-button-padding-x-lg)] text-[length:var(--wariba-font-size-label-md)]',
};

// Design System §24.1 — one look per intent, no arbitrary color per usage.
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-[color:var(--wariba-action-primary)] text-[color:var(--wariba-action-primary-text)] hover:bg-cobalt-600 active:bg-cobalt-700 disabled:bg-[color:var(--wariba-border-disabled)] disabled:text-[color:var(--wariba-text-disabled)]',
  secondary:
    'bg-[color:var(--wariba-action-secondary)] text-[color:var(--wariba-action-secondary-text)] border border-[color:var(--wariba-border-default)] hover:bg-[color:var(--wariba-action-secondary-hover)] active:bg-cobalt-100 disabled:text-[color:var(--wariba-text-disabled)] disabled:border-[color:var(--wariba-border-disabled)]',
  tertiary:
    'bg-transparent text-[color:var(--wariba-action-secondary-text)] hover:bg-[color:var(--wariba-background-subtle)] active:bg-[color:var(--wariba-background-selected)] disabled:text-[color:var(--wariba-text-disabled)]',
  destructive:
    'bg-[color:var(--wariba-action-destructive)] text-[color:var(--wariba-action-destructive-text)] hover:bg-[color:var(--wariba-status-danger-strong)] active:bg-danger-700 disabled:bg-[color:var(--wariba-border-disabled)] disabled:text-[color:var(--wariba-text-disabled)]',
  ghost:
    'bg-transparent text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-background-subtle)] hover:text-[color:var(--wariba-text-primary)] disabled:text-[color:var(--wariba-text-disabled)]',
  text: 'bg-transparent px-0 h-auto text-[color:var(--wariba-text-link)] underline-offset-2 hover:underline disabled:text-[color:var(--wariba-text-disabled)]',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}

/**
 * Shared visual treatment, usable on non-<button> elements (e.g. a Next.js
 * <Link> styled as a button — a link must render as <a>, never a <button>
 * wrapping an <a>). No 'use client' here deliberately: it's a pure string
 * function, and Button.tsx's 'use client' would make it uncallable from
 * Server Components (RSC forbids invoking a function exported from a client
 * module directly — only rendering client Components is allowed).
 */
export function buttonClassNames({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cx(
    'inline-flex items-center justify-center rounded-[var(--wariba-component-button-radius)] font-semibold',
    'gap-[var(--wariba-component-button-gap)] transition-colors duration-[var(--wariba-component-button-transition-duration)]',
    'disabled:cursor-not-allowed',
    // sm (32px) and md (40px) heights are both under the 44px touch-target
    // floor — min-height only ever grows the hit box (lg's 48px is already
    // past it, so this is a no-op there), never shrinks the visual label.
    variant !== 'text' &&
      'min-w-[var(--wariba-size-touch-target-minimum)] min-h-[var(--wariba-size-touch-target-minimum)]',
    SIZE[size],
    VARIANT[variant],
    className,
  );
}
