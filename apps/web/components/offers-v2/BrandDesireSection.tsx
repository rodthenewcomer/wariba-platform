import Image from 'next/image';

const CLAIMS = [
  'Le trading, les soldes et les résultats sont simulés. Le nominal n’est jamais un dépôt.',
  'Les règles acceptées sont versionnées, horodatées et attachées à chaque compte.',
  'Le serveur décide des prix d’exécution, du risque, du passage et du versement.',
  'Aucun compte réel, aucun résultat futur, aucune disponibilité de paiement n’est garantie.',
];

/**
 * Section 06 — Brand Desire. A lighter editorial interruption, not a second
 * full-bleed photo section — the hero already carries the page's main
 * photography. Reuses the existing "cadre pour progresser" claim set from
 * the prior /offres page rather than inventing new promises.
 */
export function BrandDesireSection() {
  return (
    <section className="commerce-performance-island">
      <div className="mx-auto grid max-w-[var(--wariba-shell-max)] gap-10 px-[var(--wariba-shell-gutter)] py-16 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-20">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--wariba-radius-2xl)]">
          <Image
            src="/images/wariba-trader-abidjan.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 32vw, 100vw"
            className="object-cover object-[70%_center]"
          />
        </div>
        <div>
          <p className="commerce-kicker">Ce que vous achetez</p>
          <h2 className="commerce-section-title mt-5">
            Un cadre pour progresser. Pas une promesse de gain.
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {CLAIMS.map((claim) => (
              <li
                key={claim}
                className="commerce-well p-4 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]"
              >
                {claim}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
