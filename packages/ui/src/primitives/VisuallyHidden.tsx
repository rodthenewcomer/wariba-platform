import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** Screen-reader-only content — visually hidden without `display:none` (stays announced). */
export function VisuallyHidden({
  children,
  ...props
}: ComponentPropsWithoutRef<'span'> & { children: ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
