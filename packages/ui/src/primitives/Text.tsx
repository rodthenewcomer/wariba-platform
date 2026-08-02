import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from '../lib/cx';

/**
 * Typography scale — Design System §12. Every variant maps to a token pair
 * (size + line-height); `data*` variants use the mono/tabular data font.
 */
const VARIANT = {
  'display-xl':
    'text-[length:var(--wariba-font-size-display-xl)] leading-[var(--wariba-line-height-display-xl)] font-semibold tracking-[var(--wariba-letter-spacing-tight)]',
  'display-lg':
    'text-[length:var(--wariba-font-size-display-lg)] leading-[var(--wariba-line-height-display-lg)] font-semibold tracking-[var(--wariba-letter-spacing-tight)]',
  'display-md':
    'text-[length:var(--wariba-font-size-display-md)] leading-[var(--wariba-line-height-display-md)] font-semibold tracking-[var(--wariba-letter-spacing-tight)]',
  'heading-xl':
    'text-[length:var(--wariba-font-size-heading-xl)] leading-[var(--wariba-line-height-heading-xl)] font-semibold tracking-[var(--wariba-letter-spacing-tight)]',
  'heading-lg':
    'text-[length:var(--wariba-font-size-heading-lg)] leading-[var(--wariba-line-height-heading-lg)] font-semibold tracking-[var(--wariba-letter-spacing-tight)]',
  'heading-md':
    'text-[length:var(--wariba-font-size-heading-md)] leading-[var(--wariba-line-height-heading-md)] font-semibold',
  'heading-sm':
    'text-[length:var(--wariba-font-size-heading-sm)] leading-[var(--wariba-line-height-heading-sm)] font-semibold',
  'body-lg':
    'text-[length:var(--wariba-font-size-body-lg)] leading-[var(--wariba-line-height-body-lg)] font-normal',
  'body-md':
    'text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-md)] font-normal',
  'body-sm':
    'text-[length:var(--wariba-font-size-body-sm)] leading-[var(--wariba-line-height-body-sm)] font-normal',
  'label-md':
    'text-[length:var(--wariba-font-size-label-md)] leading-[var(--wariba-line-height-label-md)] font-semibold',
  'label-sm':
    'text-[length:var(--wariba-font-size-label-sm)] leading-[var(--wariba-line-height-label-sm)] font-semibold tracking-[var(--wariba-letter-spacing-wide)] uppercase',
  'data-lg':
    'wariba-data text-[length:var(--wariba-font-size-data-lg)] leading-[var(--wariba-line-height-data-lg)] font-medium',
  'data-md':
    'wariba-data text-[length:var(--wariba-font-size-data-md)] leading-[var(--wariba-line-height-data-md)] font-medium',
  'data-sm':
    'wariba-data text-[length:var(--wariba-font-size-data-sm)] leading-[var(--wariba-line-height-data-sm)] font-medium',
} as const;

const COLOR = {
  primary: 'text-[color:var(--wariba-text-primary)]',
  secondary: 'text-[color:var(--wariba-text-secondary)]',
  // Deliberately NOT --wariba-text-tertiary (ink.300): measured contrast against
  // bone.50/white is 2.0–2.6:1 at normal text sizes, well under WCAG AA's 4.5:1 —
  // confirmed via axe-core during Prompt 02 verification. text.tertiary in
  // tokens.json works for icons/borders (3:1 threshold) but not body-sized text.
  // Flagging for the Design System owner rather than editing tokens.json here.
  tertiary: 'text-[color:var(--wariba-text-secondary)]',
  inverse: 'text-[color:var(--wariba-text-inverse)]',
  disabled: 'text-[color:var(--wariba-text-disabled)]',
  success: 'text-[color:var(--wariba-status-success-text)]',
  warning: 'text-[color:var(--wariba-status-warning-text)]',
  danger: 'text-[color:var(--wariba-status-danger-text)]',
} as const;

export interface TextProps extends ComponentPropsWithoutRef<'span'> {
  as?: ElementType;
  variant?: keyof typeof VARIANT;
  color?: keyof typeof COLOR;
  children?: ReactNode;
}

const DEFAULT_TAG: Partial<Record<keyof typeof VARIANT, ElementType>> = {
  'display-xl': 'h1',
  'display-lg': 'h1',
  'display-md': 'h1',
  'heading-xl': 'h1',
  'heading-lg': 'h2',
  'heading-md': 'h3',
  'heading-sm': 'h4',
};

export function Text({
  as,
  variant = 'body-md',
  color = 'primary',
  className,
  ...props
}: TextProps) {
  const Component = as ?? DEFAULT_TAG[variant] ?? 'span';
  return <Component className={cx(VARIANT[variant], COLOR[color], className)} {...props} />;
}
