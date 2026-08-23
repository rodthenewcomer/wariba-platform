import type { ReactNode } from 'react';

/**
 * The line at the top of a page that is not the shell's title.
 *
 * The header already says where you are. This says what the page is *for* when
 * that is not obvious from one word — and holds the filters or controls that
 * belong to the content rather than to the route.
 *
 * Deliberately not a second `h1`: the shell owns that, and two of them on one
 * document is a landmark error a screen reader has to resolve by guessing.
 */
export function PageHeader({
  description,
  children,
}: {
  description?: string;
  children?: ReactNode;
}) {
  if (!description && !children) return null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {description ? (
        <p className="max-w-[52ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          {description}
        </p>
      ) : (
        <span />
      )}
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
