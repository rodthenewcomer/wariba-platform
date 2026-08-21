/**
 * The dock's empty state.
 *
 * Final closure §17 — "Aucune alerte." centred on a bare surface is correct and
 * unfinished: it reads as a missing feature rather than as a reported
 * condition. This is the workstation's own state language at dock scale — a
 * semantic marker, one strong line stating the condition, and one quiet line
 * naming what will occupy the surface once it exists.
 *
 * Deliberately not an onboarding card: no illustration, no call to action, no
 * explanatory paragraph. A dock reports. Where no canonical action belongs on a
 * surface, none is offered.
 */
export interface DockEmptyStateProps {
  title: string;
  hint?: string;
  colSpan?: number;
}

export function DockEmptyState({ title, hint }: DockEmptyStateProps) {
  return (
    <div className="flex min-h-16 flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
      {/* VX1-C §7 — a short ruled mark rather than a dot: the surface is empty
          and says so, without a bullet that reads as a broken list item. */}
      <span
        aria-hidden="true"
        className="h-px w-8 rounded-full bg-[color:var(--wariba-component-workstation-seam-strong)]"
      />
      <p className="text-[length:var(--wariba-component-workstation-type-data)] font-semibold text-[color:var(--wariba-component-workstation-text-secondary)]">
        {title}
      </p>
      {hint ? (
        <p className="max-w-[16rem] text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-text-tertiary)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
