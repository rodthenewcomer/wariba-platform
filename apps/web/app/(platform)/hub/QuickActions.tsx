import Link from 'next/link';
import { HubIcon, type HubIconRole } from '../../../components/hub/icons';
import { Surface, SurfaceTitle } from '../../../components/hub/Surface';

/**
 * The three or four things worth doing from here.
 *
 * ## The rule that shapes this component
 *
 * Nothing disabled, ever. A permanently greyed "Demander un payout" on an
 * account that will not be eligible for weeks is not information — it is a
 * control that has taught the trader to ignore controls. An action appears
 * when it can be taken and is absent when it cannot, so everything on screen
 * is live.
 *
 * That also means the caller decides the list from real state, not from a
 * fixed menu. This component only renders what it is handed.
 */

export interface QuickAction {
  label: string;
  href: string;
  icon: HubIconRole;
  /** One short line saying why this is worth a tap. */
  hint?: string;
  emphasis?: boolean;
}

export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  if (actions.length === 0) return null;

  return (
    <Surface data-testid="quick-actions" className="flex flex-col gap-4 p-5 sm:p-6">
      <SurfaceTitle>Actions rapides</SurfaceTitle>
      <ul className="grid min-w-0 gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={`${action.href}-${action.label}`} className="min-w-0">
            <Link
              href={action.href}
              className={[
                'group flex min-h-[56px] min-w-0 w-full max-w-full items-center gap-3 rounded-[10px] border px-3.5 py-2.5',
                'transition-[background-color,border-color] duration-[var(--wariba-component-workstation-motion-interaction)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
                'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
                action.emphasis
                  ? 'border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)] hover:bg-[color:color-mix(in_srgb,var(--wariba-accent-indigo)_20%,transparent)]'
                  : 'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)]',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={
                  action.emphasis
                    ? 'shrink-0 text-[color:var(--wariba-accent-indigo)]'
                    : 'shrink-0 text-[color:var(--wariba-text-secondary)]'
                }
              >
                <HubIcon role={action.icon} size={22} active={action.emphasis} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                  {action.label}
                </span>
                {action.hint ? (
                  <span className="mt-0.5 block truncate text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {action.hint}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-[color:var(--wariba-text-tertiary)] transition-transform duration-[var(--wariba-component-workstation-motion-interaction)] group-hover:translate-x-0.5 motion-reduce:transition-none"
              >
                <HubIcon role="chevron" size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
