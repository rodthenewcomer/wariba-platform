import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from '../lib/cx';

const GAP: Record<StackProps['gap'] & string, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
  '16': 'gap-16',
};

export interface StackProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType;
  /** Space token key — see docs/05-design/tokens.json `space`. */
  gap?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16';
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  children?: ReactNode;
}

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const;

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const;

/** Flexbox rhythm primitive. Gaps are always token-scale — never an arbitrary value. */
export function Stack({
  as: Component = 'div',
  gap = '4',
  direction = 'column',
  align,
  justify,
  wrap = false,
  className,
  ...props
}: StackProps) {
  return (
    <Component
      className={cx(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        GAP[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  );
}
