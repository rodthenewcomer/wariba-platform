import type { ReactNode } from 'react';

/**
 * W4 §61 — a seam, not a card.
 *
 * The pre-W4 right panel was a stack of bordered, elevated, rounded boxes: an
 * Order Ticket block, a Guardian block below it, alert cards above both. Each
 * one announced itself as a separate widget, which is why the panel read as a
 * SaaS dashboard rather than as one instrument. This primitive replaces that
 * with a hairline rule and a small caps heading, so the Execution Center is a
 * single continuous surface whose parts are legible without being boxed.
 *
 * A section only suppresses its rule when it is genuinely the first child of
 * its container (`first:`) — inside the Execution Center it never is, because
 * the market header and the status area precede it, and a seam under the
 * header is exactly the separation that belongs there.
 */
export interface ExecutionSectionProps {
  title: string;
  /** Optional right-aligned control or value on the heading row. */
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function ExecutionSection({ title, action, children, testId }: ExecutionSectionProps) {
  return (
    <section
      {...(testId ? { 'data-testid': testId } : {})}
      className="flex flex-col gap-1.5 border-t border-[color:var(--wariba-component-workstation-seam)] px-3 py-2 first:border-t-0"
    >
      {/*
       * Visual closure §4 — the label is a locator, not a headline.
       *
       * At `label-sm` with normal weight these read as section titles competing
       * with the values under them, which is what made the panel feel like a
       * form. Dropped to `data-xs` with wider tracking: still unambiguous when
       * you look for it, invisible when you are not — so the eye goes to the
       * controls and the numbers instead.
       */}
      <div className="flex min-h-3 items-baseline justify-between gap-2">
        <h3 className="text-[length:var(--wariba-font-size-data-xs)] font-medium uppercase tracking-[0.08em] text-[color:var(--wariba-text-tertiary)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
