import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from '../lib/cx';

/**
 * Structural table primitives only — Design System §22.2: sticky headers when
 * long, numbers right-aligned in the data font, text left-aligned. Sorting,
 * filtering, and pagination are data-layer concerns for later prompts.
 */
export function DataTable({ children, className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cx('w-full border-collapse text-left', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className={cx('sticky top-0 bg-[color:var(--wariba-background-surface)]', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function DataTableBody(props: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody {...props} />;
}

export function DataTableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={cx('border-b border-[color:var(--wariba-border-subtle)] last:border-0', className)}
      {...props}
    />
  );
}

export interface DataTableHeaderCellProps extends ComponentPropsWithoutRef<'th'> {
  align?: 'left' | 'right';
}

export function DataTableHeaderCell({
  align = 'left',
  className,
  children,
  ...props
}: DataTableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cx(
        'px-[var(--wariba-space-3)] py-[var(--wariba-space-2)]',
        'text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)]',
        'text-[color:var(--wariba-text-secondary)]',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface DataTableCellProps extends ComponentPropsWithoutRef<'td'> {
  align?: 'left' | 'right';
  numeric?: boolean;
  children?: ReactNode;
}

export function DataTableCell({ align, numeric = false, className, ...props }: DataTableCellProps) {
  const resolvedAlign = align ?? (numeric ? 'right' : 'left');
  return (
    <td
      className={cx(
        'px-[var(--wariba-space-3)] py-[var(--wariba-space-2)] text-[length:var(--wariba-font-size-body-sm)]',
        'text-[color:var(--wariba-text-primary)]',
        numeric && 'wariba-data',
        resolvedAlign === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}
