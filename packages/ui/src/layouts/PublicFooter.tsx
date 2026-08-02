import type { LinkComponentType } from '../lib/link';

export interface PublicFooterProps {
  LinkComponent: LinkComponentType;
}

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/offres', label: 'Offres' },
      { href: '/fonctionnement', label: 'Fonctionnement' },
      { href: '/plateforme', label: 'Plateforme' },
    ],
  },
  {
    title: 'Confiance',
    links: [
      { href: '/status', label: 'Statut des systèmes' },
      { href: '/confiance/incidents', label: 'Incidents' },
      { href: '/confiance/changelog', label: 'Changelog des règles' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/legal/conditions', label: 'Conditions' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/risques', label: 'Avertissement sur les risques' },
    ],
  },
] as const;

/** UX Architecture §8 — sitemap footer, no fake partner logos or social proof. */
export function PublicFooter({ LinkComponent: Link }: PublicFooterProps) {
  return (
    <footer className="border-t border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-subtle)]">
      <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
            WARIBA
          </p>
          <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            Infrastructure de progression pour traders disciplinés.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-secondary)]">
              {column.title}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[color:var(--wariba-border-subtle)] px-4 py-4 text-center text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)] sm:px-6">
        WARIBA — environnement de trading simulé. Aucun capital réel en V1.
      </div>
    </footer>
  );
}
