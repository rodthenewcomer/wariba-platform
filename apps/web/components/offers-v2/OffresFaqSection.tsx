import Link from 'next/link';
import { ArrowRightIcon } from '@wariba/ui';

const FAQ_ITEMS = [
  {
    q: 'Est-ce que je trade avec de l’argent réel ?',
    a: 'Non. WARIBA utilise des comptes de trading simulés. Les tailles affichées sont nominales — elles ne représentent ni un dépôt bancaire ni un capital réel confié au trader.',
  },
  {
    q: 'Quelle est la différence entre ONE, FLEX et INSTANT ?',
    a: 'ONE est un paiement unique avant l’évaluation. FLEX répartit le coût en deux temps : un premier paiement, puis l’activation seulement après réussite. INSTANT n’a pas d’évaluation — l’accès à Performance est direct, avec des règles de risque plus resserrées.',
  },
  {
    q: 'Comment fonctionne l’activation FLEX ?',
    a: 'Le montant d’activation est figé au moment de l’achat. Il n’est prélevé que si vous réussissez l’évaluation — jamais avant, jamais en cas d’échec.',
  },
  {
    q: 'Qu’est-ce qu’un compte WARIBA Performance ?',
    a: 'C’est le compte simulé sur lequel vous tradez pour remplir les conditions liées aux payouts. Performance n’est pas un compte financé réel ni une promesse de revenus.',
  },
  {
    q: 'Que se passe-t-il si j’atteins une limite de risque ?',
    a: 'La perte quotidienne bloque de nouvelles positions jusqu’au prochain reset, sans terminer le compte. La perte maximale, elle, met fin au compte concerné.',
  },
  {
    q: 'Suis-je éligible à un payout dès que je suis rentable ?',
    a: 'L’éligibilité dépend des conditions du programme choisi — journées Performance, buffer, et règles spécifiques à votre compte. Voir le détail sur la page Payouts.',
  },
  {
    q: 'Les prix sont-ils disponibles en FCFA ?',
    a: 'Oui — les prix WARIBA sont exprimés en FCFA (XOF) pour les six marchés visés.',
  },
];

/** Section 10 — Last-objections FAQ. Not a Help Center duplicate — only the questions that block a purchase decision. */
export function OffresFaqSection() {
  return (
    <section className="commerce-band">
      <div className="commerce-shell py-16 lg:py-20">
        <p className="commerce-kicker">Dernières questions</p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">Avant de choisir.</h2>

        <div className="mt-8 divide-y divide-[color:var(--commerce-rule)] border-y border-[color:var(--commerce-rule)]">
          {FAQ_ITEMS.map((item, index) => (
            <details key={item.q} className="group py-4" open={index === 0}>
              <summary className="wariba-focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-md text-[length:var(--wariba-font-size-body-lg)] font-semibold text-[color:var(--wariba-on-dark)] marker:content-none">
                {item.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[color:var(--wariba-brand-300)] transition-transform duration-[var(--wariba-motion-state)] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Link
            href="/aide"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Centre d’aide
            <ArrowRightIcon size="sm" />
          </Link>
          <Link
            href="/aide/risque-regles"
            className="text-sm text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
          >
            Règles
          </Link>
          <Link
            href="/aide/payouts"
            className="text-sm text-[color:var(--wariba-on-dark-muted)] hover:text-[color:var(--wariba-on-dark)]"
          >
            Payouts
          </Link>
        </div>
      </div>
    </section>
  );
}
