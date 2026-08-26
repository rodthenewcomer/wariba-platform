import Link from 'next/link';

export default function RiskDisclosurePage() {
  return (
    <article className="mx-auto max-w-[var(--wariba-size-content-editorial-max)] px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-copper-300)]">
        Disclosure simulé v1.1
      </p>
      <h1 className="mt-4 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
        Risques et nature simulée
      </h1>
      <div className="mt-10 grid gap-9 text-[color:var(--wariba-color-ink-200)]">
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Aucun capital réel en V1
          </h2>
          <p className="mt-3">
            Toutes les balances, positions, ordres, fills et payouts du parcours actuel sont
            simulés. Une balance 100K ne signifie pas que 100 000 USD ont été déposés ou confiés.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            La simulation ne prédit pas le réel
          </h2>
          <p className="mt-3">
            Les spreads, slippages, liquidités et comportements de l’environnement simulé sont
            déterministes et peuvent différer d’un marché réel. Une performance simulée ne garantit
            aucun résultat futur.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Les règles peuvent bloquer ou terminer un compte
          </h2>
          <p className="mt-3">
            La perte quotidienne bloque vos nouvelles positions jusqu’au prochain reset, sans mettre
            fin au compte. La perte maximale, elle, y met fin. La règle du Meilleur Jour ne termine
            jamais un compte, mais elle peut retarder un passage ou un cycle de payout.
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
            Aucune promesse Live
          </h2>
          <p className="mt-3">
            WARIBA Review n’entraîne pas automatiquement un capital réel, un sixième payout, une
            relation d’emploi, une gestion de fonds ou une allocation Live.
          </p>
        </section>
      </div>
      <Link
        href="/programme"
        className="mt-12 inline-block font-semibold text-[color:var(--wariba-color-cobalt-300)]"
      >
        Relire le programme
      </Link>
    </article>
  );
}
