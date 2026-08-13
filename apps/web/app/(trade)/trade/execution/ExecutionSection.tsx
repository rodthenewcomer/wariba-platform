import type { ReactNode } from 'react';

/**
 * W4 §61 — a seam, not a card.
 *
 * The pre-W4 right panel was a stack of bordered, elevated, rounded boxes: an
 * Order Ticket block, a Guardian block below it, alert cards above both. Each
 * one announced itself as a separate widget, which is why the panel read as a
 * SaaS dashboard rather than as one instrument.
 *
 * **Visual closure §12 refinement — a spec plate, not a stack of fields.**
 *
 * Replacing the boxes with seams fixed the "dashboard" reading but left a
 * "form" one: label, control, label, control, four times down a 320px column,
 * with every label starting at the same left edge as the control it introduced.
 * That is the shape of a settings page, and it is what the 1440 render still
 * showed in the panel's middle third.
 *
 * The label now sits in its own right-aligned gutter beside its control. Two
 * things follow, and both are what makes the middle third read as one
 * instrument rather than four:
 *
 * - The labels form a single vertical column of small caps down the left edge —
 *   the rail of an instrument plate, read once as a set, instead of four
 *   headings competing with the values under them.
 * - The controls form a single column of their own, so the eye travels down one
 *   track of operable things rather than alternating between prose and control.
 *
 * The gutter is 4rem: `PROTECTION` is the longest label the panel carries and
 * measures ~62px at 10px caps with label tracking, so nothing truncates and the
 * control column keeps 222px of a 320px panel.
 */
export interface ExecutionSectionProps {
  title: string;
  /** Optional control or value, rendered under the label in the gutter. */
  action?: ReactNode;
  /**
   * A derived *result* of this section's controls, rendered full-bleed under
   * both columns.
   *
   * The gutter leaves 222px of a 320px panel for controls, which is right for
   * inputs and wrong for a three-column table of money: the protection estimate
   * rendered inside it wrapped "Perte au SL" and "20.00 USD" onto second lines
   * and read as broken. A result is not a control — it does not need to align
   * with the label rail — so it takes the full width instead.
   */
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function ExecutionSection({
  title,
  action,
  footer,
  children,
  testId,
}: ExecutionSectionProps) {
  return (
    <section
      {...(testId ? { 'data-testid': testId } : {})}
      className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-2.5 border-t border-[color:var(--wariba-component-workstation-border-hairline)] px-3 py-2.5 first:border-t-0"
    >
      {/*
       * The label is a locator, not a headline. Right-aligned against its own
       * control and held a full step below every value in the section, so it is
       * unambiguous when you look for it and invisible when you are not.
       */}
      <div className="flex min-w-0 flex-col items-end gap-1 pt-2.5">
        <h3 className="text-right text-[length:var(--wariba-component-workstation-type-section-label)] font-semibold uppercase leading-tight tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
      {footer ? <div className="col-span-2 mt-2 min-w-0">{footer}</div> : null}
    </section>
  );
}
