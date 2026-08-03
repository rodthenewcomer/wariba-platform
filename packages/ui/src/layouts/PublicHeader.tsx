'use client';

import { cx } from '../lib/cx';
import type { LinkComponentType } from '../lib/link';

export interface PublicHeaderProps {
  LinkComponent: LinkComponentType;
  currentPath: string;
}

const NAV = [
  { href: '/programme', label: 'Programme' },
  { href: '/warix', label: 'WariX' },
  { href: '/offres', label: 'Offres' },
  { href: '/aide', label: 'Aide' },
] as const;

/** UX Architecture §11 — sticky, stable height, no promotional banner, CTA never hides the rules link. */
export function PublicHeader({ LinkComponent: Link, currentPath }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--wariba-z-sticky)] border-b border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-color-ink-950)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[var(--wariba-size-marketing-container-max)] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-[length:var(--wariba-font-size-heading-md)] font-bold tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)]"
        >
          WARIBA
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'text-[length:var(--wariba-font-size-body-sm)] font-medium transition-colors',
                currentPath === item.href || currentPath.startsWith(`${item.href}/`)
                  ? 'text-[color:var(--wariba-color-bone-50)]'
                  : 'text-[color:var(--wariba-color-ink-200)] hover:text-[color:var(--wariba-color-bone-50)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-color-ink-200)] hover:text-[color:var(--wariba-color-bone-50)] sm:inline"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="hidden h-10 items-center rounded-[var(--wariba-radius-md)] bg-[color:var(--wariba-color-cobalt-400)] px-4 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-ink-950)] hover:bg-[color:var(--wariba-color-cobalt-300)] sm:inline-flex"
          >
            Commencer
          </Link>
          <details className="group relative lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-color-ink-600)] px-3 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-bone-50)] marker:content-none">
              Menu
            </summary>
            <nav
              aria-label="Navigation mobile"
              className="absolute right-0 top-12 w-64 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)] p-2 shadow-[var(--wariba-shadow-lg)]"
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-[var(--wariba-radius-md)] px-3 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-color-ink-100)] hover:bg-[color:var(--wariba-color-ink-800)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/support"
                className="flex min-h-11 items-center rounded-[var(--wariba-radius-md)] px-3 text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-color-ink-100)] hover:bg-[color:var(--wariba-color-ink-800)]"
              >
                Support
              </Link>
              <Link
                href="/inscription"
                className="mt-2 flex min-h-11 items-center justify-center rounded-[var(--wariba-radius-md)] bg-[color:var(--wariba-color-cobalt-400)] px-3 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-ink-950)]"
              >
                Commencer
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
