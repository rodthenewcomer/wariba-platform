import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface AccordionItem {
  question: string;
  answer: ReactNode;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  className?: string;
}

/**
 * Native `<details>/<summary>` — works without JavaScript, respects the
 * current theme context via semantic tokens (Design System §47.2).
 */
export function Accordion({ items, className }: AccordionProps) {
  return (
    <div className={cx('flex flex-col', className)}>
      {items.map((item) => (
        <details
          key={item.question}
          className="group border-b border-[color:var(--wariba-border-subtle)] py-5 first:border-t"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)] [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden="true"
              className="shrink-0 text-[length:var(--wariba-font-size-heading-md)] font-normal text-[color:var(--wariba-text-secondary)] transition-transform duration-[var(--wariba-component-button-transition-duration)] group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="mt-3 max-w-3xl text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-text-secondary)]">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
