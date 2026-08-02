import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface GridProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType;
  columns?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  gap?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12';
  children?: ReactNode;
}

const COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  8: 'grid-cols-8',
  12: 'grid-cols-12',
};

const GAP: Record<string, string> = {
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
};

export function Grid({
  as: Component = 'div',
  columns = 12,
  gap = '6',
  className,
  ...props
}: GridProps) {
  return <Component className={cx('grid', COLUMNS[columns], GAP[gap], className)} {...props} />;
}
