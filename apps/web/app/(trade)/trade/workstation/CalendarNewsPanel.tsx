import { WariXEmptyState } from '@wariba/ui';

/** Honest WX1 shell: no provider means no invented economic event or headline. */
export function CalendarNewsPanel() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
      data-testid="calendar-news-panel"
    >
      <div className="mb-3 flex items-center justify-between border-b border-[color:var(--wariba-component-workstation-border-hairline)] pb-2">
        <div>
          <p className="text-[length:var(--wariba-component-workstation-type-label)] font-semibold text-[color:var(--wariba-component-workstation-text-primary)]">
            Intelligence de marché
          </p>
          <p className="mt-0.5 text-[length:var(--wariba-component-workstation-type-meta)] uppercase tracking-[var(--wariba-component-workstation-tracking-section)] text-[color:var(--wariba-component-workstation-text-tertiary)]">
            Calendrier · Actualités
          </p>
        </div>
        <span className="rounded-full bg-[color:var(--wariba-component-workstation-wash-neutral)] px-2 py-1 text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-hairline)]">
          Non connecté
        </span>
      </div>

      <WariXEmptyState
        title="Aucun flux calendrier connecté"
        description="WariX n’affiche pas d’événements, de prévisions ou d’actualités tant qu’une source autorisée n’est pas disponible."
      />
    </div>
  );
}
