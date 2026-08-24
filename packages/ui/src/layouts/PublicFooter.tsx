import type { LinkComponentType } from '../lib/link';

export interface PublicFooterProps {
  LinkComponent: LinkComponentType;
}

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/programme', label: 'Comment ça marche' },
      { href: '/warix', label: 'WariX' },
      { href: '/offres', label: 'Offres' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { href: '/aide', label: 'Centre d’aide' },
      { href: '/support', label: 'Support' },
      // The canonical article, not the marketing summary of it. Two
      // destinations carrying the same name is how a rule ends up with two
      // descriptions — see UX-HELP-002.
      { href: '/aide/wariba-one/regles-essentielles', label: 'Règles essentielles' },
    ],
  },
  {
    title: 'Cadre légal',
    links: [
      { href: '/legal/conditions', label: 'Conditions d’utilisation' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/risques', label: 'Risques et simulation' },
    ],
  },
] as const;

/** UX Architecture §8 — sitemap footer, no fake partner logos or social proof. */
export function PublicFooter({ LinkComponent: Link }: PublicFooterProps) {
  return (
    <footer className="border-t border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
      <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] grid-cols-2 gap-10 px-4 py-14 sm:grid-cols-4 sm:px-6 lg:py-20">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[length:var(--wariba-font-size-heading-md)] font-bold text-[color:var(--wariba-color-bone-50)]">
            WARIBA
          </p>
          {/*
           * Ligne de marque — laissée telle quelle.
           *
           * Elle relève du langage marketing, que cette passe éditoriale ne
           * touche pas (Prompt 11). Elle est signalée comme
           * EDITORIAL_DECISION_REQUIRED dans le rapport de clôture : « Retirez
           * ensuite vos performances simulées » se lit mal, mais réécrire une
           * accroche de marque au passage d'un travail sur l'aide serait la
           * changer sans décision.
           */}
          <p className="mt-3 max-w-xs text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
            Construisez d’abord votre base. Retirez ensuite vos performances simulées.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
              {column.title}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)] hover:text-[color:var(--wariba-color-bone-50)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[color:var(--wariba-color-ink-700)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-8 sm:px-6">
          {/*
           * La mention légale, dite à un lecteur plutôt qu'à un auditeur.
           *
           * L'ancienne version se terminait par « payout sandbox et Review
           * restent soumises à la policy attachée au compte, aux contrôles
           * d'intégrité et aux gates de lancement » — trois mots
           * d'implémentation dans la phrase que le plus de monde lira.
           *
           * Chaque fait est conservé : environnement simulé, nominal qui n'est
           * pas un dépôt, absence de garantie sur les résultats, prix
           * contractuels en FCFA, et conditions à remplir avant un payout
           * (UX-016 `LOCKED` — la nature simulée est répétée aux moments
           * critiques). Seule la langue change.
           */}
          <p className="max-w-5xl text-[length:var(--wariba-font-size-label-sm)] leading-[var(--wariba-line-height-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            WARIBA est un environnement de trading entièrement simulé. Le montant affiché sur un
            compte est une unité de simulation : ce n’est ni un dépôt, ni un compte de courtage, ni
            de l’argent qui vous est confié. Des résultats passés, réels ou simulés, ne garantissent
            aucun résultat futur. Les prix sont contractuels en FCFA ; les équivalents en USD sont
            donnés à titre indicatif. Un payout n’est possible qu’après avoir rempli les conditions
            attachées à votre compte, et WARIBA ne promet aucun compte réel à l’issue du parcours.
          </p>
          <p className="mt-5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
            © 2026 WARIBA. Bêta privée — documents juridiques en validation locale.
          </p>
        </div>
      </div>
    </footer>
  );
}
