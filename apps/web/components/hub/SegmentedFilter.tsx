'use client';

import Link from 'next/link';

/**
 * A filter that is a set of links, not a set of buttons.
 *
 * Filtering changes what the page is showing, which is a different address —
 * so it is navigation, and navigation belongs in anchors. That is not
 * pedantry: it makes a filtered view shareable, bookmarkable, back-button
 * correct, and openable in a new tab, none of which a `useState` toggle gives
 * you. It also means the server does the filtering, which is the only place
 * the filtering can be trusted.
 *
 * Horizontally scrollable on a phone rather than wrapped: a filter row that
 * reflows into three lines pushes the content it filters off the screen.
 */
export interface SegmentOption {
  value: string;
  label: string;
  href: string;
  /** Shown after the label when a count is genuinely known. */
  count?: number | null;
}

export function SegmentedFilter({
  options,
  active,
  label,
}: {
  options: readonly SegmentOption[];
  active: string;
  label: string;
}) {
  return (
    /*
     * Wraps below `sm`, scrolls above it.
     *
     * Six account-state filters do not fit 320px, and horizontal scrolling cut
     * the third label mid-word — "En vérificat" — with no fade or chevron to
     * say more existed. A cleanly severed word reads as a broken layout, not as
     * an affordance, and the 2.5.1 gate names it explicitly. Wrapping costs a
     * row of height at the one width where height is cheaper than a truncated
     * control, and every option stays a full, tappable word.
     */
    <nav
      aria-label={label}
      data-testid="segmented-filter"
      className="-mx-1 flex max-w-full flex-wrap gap-1 px-1 pb-1 sm:flex-nowrap sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.value === active;
        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={selected ? 'page' : undefined}
            data-active={selected ? 'true' : 'false'}
            className={[
              'flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[8px] px-3',
              'text-[length:var(--wariba-font-size-label-md)] font-medium whitespace-nowrap',
              'transition-colors duration-[var(--wariba-component-workstation-motion-interaction)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
              'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
              selected
                ? 'bg-[color:var(--warix-surface-selected)] font-semibold text-[color:var(--wariba-text-primary)] shadow-[inset_0_1px_0_0_var(--warix-highlight-inner-strong)]'
                : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--warix-surface-hover)] hover:text-[color:var(--wariba-text-primary)]',
            ].join(' ')}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
