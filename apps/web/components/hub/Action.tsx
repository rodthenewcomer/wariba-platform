import Link from 'next/link';
import type { ReactNode } from 'react';
import { HubIcon, type HubIconRole } from './icons';

/**
 * The Hub's buttons.
 *
 * One primary per screen. That is the whole discipline: a page with three
 * indigo buttons has told the trader that three things are equally the next
 * thing to do, which is the same as telling them nothing.
 *
 * A control that navigates renders as an anchor and a control that acts
 * renders as a button — never a `<button>` wrapping an `<a>`, and never a
 * `<div onClick>`. Middle-click, copy-link, open-in-new-tab and screen-reader
 * announcements all depend on getting that right, and none of them can be
 * added back afterwards with an `onKeyDown`.
 */

export type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ActionSize = 'sm' | 'md' | 'lg';

const SIZE: Record<ActionSize, string> = {
  sm: 'min-h-[36px] px-3 text-[length:var(--wariba-font-size-label-sm)] gap-1.5 rounded-[8px]',
  md: 'min-h-[44px] px-4 text-[length:var(--wariba-font-size-label-md)] gap-2 rounded-[10px]',
  lg: 'min-h-[48px] px-5 text-[length:var(--wariba-font-size-label-md)] gap-2 rounded-[10px]',
};

const VARIANT: Record<ActionVariant, string> = {
  primary:
    'bg-[color:var(--wariba-accent-indigo)] text-[#0B0D12] font-semibold hover:brightness-110 active:translate-y-px shadow-[0_10px_28px_-14px_color-mix(in_srgb,var(--wariba-accent-indigo)_90%,transparent)]',
  secondary:
    'border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-raised)] text-[color:var(--wariba-text-primary)] font-semibold hover:border-[color:var(--wariba-accent-indigo-edge)] hover:bg-[color:var(--warix-surface-hover)]',
  ghost:
    'text-[color:var(--wariba-text-secondary)] font-medium hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)]',
  danger:
    'border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] text-[color:var(--wariba-accent-red)] font-semibold hover:bg-[color:color-mix(in_srgb,var(--wariba-accent-red)_20%,transparent)]',
};

const BASE = [
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
  'transition-[background-color,border-color,filter,transform]',
  'duration-[var(--wariba-component-workstation-motion-interaction)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-[color:var(--wariba-border-focus)]',
  'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
].join(' ');

export function actionClassName(
  variant: ActionVariant = 'primary',
  size: ActionSize = 'md',
  className = '',
): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;
}

export function ActionLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ActionVariant;
  size?: ActionSize;
  icon?: HubIconRole;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}) {
  return (
    <Link href={href} className={actionClassName(variant, size, className)} {...rest}>
      {icon ? <HubIcon role={icon} size={size === 'sm' ? 16 : 18} active /> : null}
      {children}
    </Link>
  );
}
