'use client';

import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';

export interface PublicHeaderProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
}

const NAV = [
  { href: '/offres', label: 'Offres' },
  { href: '/fonctionnement', label: 'Fonctionnement' },
  { href: '/regles', label: 'Règles' },
  { href: '/plateforme', label: 'Plateforme' },
  { href: '/confiance', label: 'Confiance' },
  { href: '/aide', label: 'Aide' },
] as const;

/** UX Architecture §11 — sticky, stable height, no promotional banner, CTA never hides the rules link. */
export function PublicHeader({ LinkComponent: Link, currentPath }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--wariba-z-sticky)] border-b border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-canvas)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[var(--wariba-size-marketing-container-max)] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
        >
          WARIBA
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'text-[length:var(--wariba-font-size-body-sm)] font-medium transition-colors',
                currentPath.startsWith(item.href)
                  ? 'text-[color:var(--wariba-text-primary)]'
                  : 'text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/connexion"
            className="hidden text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-secondary)] hover:text-[color:var(--wariba-text-primary)] sm:inline"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="inline-flex h-10 items-center rounded-[var(--wariba-radius-md)] bg-[color:var(--wariba-action-primary)] px-4 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-action-primary-text)] hover:bg-cobalt-600"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
