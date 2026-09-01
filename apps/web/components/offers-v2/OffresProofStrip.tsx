const FACTS = [
  { label: '3 parcours', detail: 'ONE · FLEX · INSTANT' },
  { label: '5 tailles', detail: '5K → 100K' },
  { label: 'Prix en FCFA', detail: 'Montants affichés clairement' },
  { label: 'Règles visibles', detail: 'Avant de commencer' },
  { label: 'WariX', detail: 'Plateforme WARIBA' },
] as const;

/**
 * Section 02 — the compact proof strip between the hero and the
 * configurator.
 *
 * Replaces the old "Trois portes, un même système" — three cards
 * re-explaining ONE/FLEX/INSTANT with their own selection affordance,
 * immediately above the configurator that does the same job better. A
 * visitor should not configure twice. This strip states five true facts
 * and nothing else: no cards, no click target, no second notion of "which
 * family is selected" — that question belongs to exactly one place on this
 * page, and it is below this strip, not inside it.
 */
export function OffresProofStrip() {
  return (
    <section className="commerce-band">
      <div className="commerce-shell">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-[color:var(--commerce-rule)] py-7 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-8 lg:gap-y-0 lg:divide-x lg:divide-[color:var(--commerce-rule)] lg:py-6">
          {FACTS.map((fact) => (
            <div key={fact.label} className="min-w-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark)]">
                {fact.label}
              </p>
              <p className="mt-1 truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-on-dark-dim)]">
                {fact.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
