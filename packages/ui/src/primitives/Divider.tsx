import { cx } from '../lib/cx';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cx(
        'shrink-0 bg-[color:var(--wariba-border-subtle)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}
