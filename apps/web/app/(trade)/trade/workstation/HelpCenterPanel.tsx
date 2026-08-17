import Link from 'next/link';
import { WariXChevronRightIcon, WariXHelpIcon } from '@wariba/ui';

const HELP_DESTINATIONS = [
  {
    href: '/aide',
    title: 'Centre d’aide WARIBA',
    description: 'WariX, types d’ordres, SL / TP, règles Evaluation et Performance.',
  },
  {
    href: '/support',
    title: 'Contacter le support',
    description: 'Questions liées au compte, à une commande ou à une preuve.',
  },
] as const;

export function HelpCenterPanel() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
      data-testid="help-center-panel"
    >
      <div className="border-b border-[color:var(--wariba-component-workstation-border-hairline)] pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]">
          <WariXHelpIcon size="nav" />
        </div>
        <h3 className="mt-3 text-[length:var(--wariba-component-workstation-type-module-title)] font-bold text-[color:var(--wariba-component-workstation-text-primary)]">
          Aide WariX
        </h3>
        <p className="mt-1 text-[length:var(--wariba-component-workstation-type-label)] leading-relaxed text-[color:var(--wariba-component-workstation-text-secondary)]">
          Accédez aux contenus WARIBA existants sans quitter le contexte de votre poste de travail.
        </p>
      </div>

      <nav
        className="divide-y divide-[color:var(--wariba-component-workstation-border-hairline)]"
        aria-label="Aide WariX"
      >
        {HELP_DESTINATIONS.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="group block py-3 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[color:var(--wariba-component-workstation-text-primary)] group-hover:text-[color:var(--wariba-component-workstation-interaction-selected-text)]">
                {destination.title}
              </span>
              <span className="text-[color:var(--wariba-component-workstation-text-tertiary)]">
                <WariXChevronRightIcon size="toolbar" />
              </span>
            </span>
            <span className="mt-1 block text-[length:var(--wariba-component-workstation-type-label)] leading-relaxed text-[color:var(--wariba-component-workstation-text-tertiary)]">
              {destination.description}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
