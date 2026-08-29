'use client';

export default function OffersError({ reset }: { reset: () => void }) {
  return (
    <main className="commerce-shell py-16">
      <div
        role="alert"
        className="max-w-xl rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-accent-red-edge)] bg-[color:var(--wariba-accent-red-wash)] p-6"
      >
        <p className="commerce-kicker">Catalogue indisponible</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-color-ink-50)]">
          Les versions exactes n’ont pas pu être chargées.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--wariba-color-ink-200)]">
          Aucun prix de secours n’est affiché : WARIBA refuse d’inventer une offre quand la source
          canonique ne répond pas.
        </p>
        <button type="button" onClick={reset} className="commerce-primary-action mt-6">
          Réessayer
        </button>
      </div>
    </main>
  );
}
