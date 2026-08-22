import Link from 'next/link';
import { signOutAction } from '../../(auth)/actions';
import { productCopy } from '../../../lib/product-copy';
import { HubModule, HubModuleTitle } from '../hub/HubModule';

/**
 * The phone overflow menu.
 *
 * Everything a trader can reach that does not deserve one of the four tab
 * slots. Which, right now, means help, support and the published rules — and
 * not Profil or Notifications, which this page used to link to.
 *
 * Those two links went to routes that do not exist. A tab bar entry leading to
 * a menu leading to a 404 is worse than an absent feature: the trader spent
 * two taps to be told the product is broken, and the product knew.
 */
const SECTIONS = [
  {
    title: 'Comprendre',
    links: [
      { href: '/programme', label: 'Programme et règles' },
      { href: '/aide', label: 'Aide' },
      { href: '/support', label: 'Contacter le support' },
    ],
  },
  {
    title: 'Informations légales',
    links: [
      { href: '/legal/conditions', label: 'Conditions générales' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
      { href: '/legal/risques', label: 'Avertissement sur les risques' },
    ],
  },
] as const;

export default function PlusPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      {SECTIONS.map((section) => (
        <HubModule key={section.title} className="flex flex-col gap-3 p-5 sm:p-6">
          <HubModuleTitle>{section.title}</HubModuleTitle>
          <div className="flex flex-col">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="-mx-2 flex min-h-[44px] items-center justify-between gap-3 rounded-[var(--warix-radius-well)] px-2 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
              >
                {link.label}
                <svg
                  aria-hidden="true"
                  className="shrink-0 text-[color:var(--wariba-text-tertiary)]"
                  fill="none"
                  height="18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <path d="m9.5 6 6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </HubModule>
      ))}

      {/* The desktop header carries this in the account menu; a phone has no
          header menu, so the overflow page is where signing out lives. */}
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex min-h-[44px] w-full items-center justify-center rounded-[var(--wariba-component-input-radius)] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
        >
          {productCopy.hub.user.signOut}
        </button>
      </form>
    </div>
  );
}
