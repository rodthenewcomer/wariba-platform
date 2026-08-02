import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface BoxProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType;
  children?: ReactNode;
}

/** Bare layout primitive — no visual opinion of its own. Everything else composes from this. */
export function Box({ as: Component = 'div', className, ...props }: BoxProps) {
  return <Component className={cx(className)} {...props} />;
}
