import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type CardPadding = 'compact' | 'default' | 'comfortable';

const PADDING: Record<CardPadding, string> = {
  compact: 'p-[var(--wariba-component-card-padding-compact)]',
  default: 'p-[var(--wariba-component-card-padding-default)]',
  comfortable: 'p-[var(--wariba-component-card-padding-comfortable)]',
};

export interface CardProps extends ComponentPropsWithoutRef<'div'> {
  padding?: CardPadding;
  children?: ReactNode;
}

/**
 * Design System §10 — hierarchy comes from space + border first; shadow is the
 * component-level default (none) unless a specific surface needs elevation.
 */
export function Card({ padding = 'default', className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--wariba-component-card-radius)] border-[length:var(--wariba-component-card-border-width)]',
        'border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)]',
        PADDING[padding],
        className,
      )}
      {...props}
    />
  );
}
