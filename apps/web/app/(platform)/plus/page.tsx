import Link from 'next/link';
import { signOutAction } from '../../(auth)/actions';
import { productCopy } from '../../../lib/product-copy';
import { HubIcon } from '../../../components/hub/icons';
import { Surface } from '../../../components/hub/Surface';
import { PageHeader } from '../../../components/hub/PageHeader';
import { MOBILE_OVERFLOW } from '../hub-destinations';

/*
 * Never prerendered — see the platform layout.
 *
 * Any page under `(platform)` renders `HubShell`, which builds a Supabase
 * server client and validates the full server config. A page without this
 * directive is therefore rendered at *build* time and drags DATABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and the webhook secret into the build inputs —
 * which, in a container build, means passing secrets as build arguments that
 * stay readable in image history forever.
 *
 * Every one of these pages is per-user or per-order and has nothing static to
 * emit, so the directive costs nothing and removes the trap.
 */
export const dynamic = 'force-dynamic';

/**
 * The overflow destinations, as a page.
 *
 * The tab bar opens these in a sheet, which is the right interaction on a
 * phone. This route exists so the same destinations are reachable by a direct
 * link, by a shared URL, and in a session where the sheet's JavaScript has not
 * loaded — a navigation that only exists inside a client component is a
 * navigation that can disappear.
 *
 * It reads the same `MOBILE_OVERFLOW` table the sheet does, so the two can
 * never drift.
 */
export default function PlusPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader description="Tout ce qui ne tient pas dans la barre du bas." />

      {MOBILE_OVERFLOW.map((group, index) => (
        <Surface key={group.title ?? `group-${index}`} className="flex flex-col gap-2 p-4">
          {group.title ? (
            <p className="px-1 pb-1 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
              {group.title}
            </p>
          ) : null}
          {group.destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className={[
                'flex min-h-[52px] items-center gap-3 rounded-[10px] border px-3.5',
                'transition-colors duration-[var(--wariba-component-workstation-motion-interaction)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2',
                'focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none',
                destination.emphasis === 'cta'
                  ? 'border-[color:var(--wariba-accent-indigo-edge)] bg-[color:var(--wariba-accent-indigo-wash)]'
                  : 'border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface-raised)] hover:bg-[color:var(--warix-surface-hover)]',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={
                  destination.emphasis === 'cta'
                    ? 'text-[color:var(--wariba-accent-indigo)]'
                    : 'text-[color:var(--wariba-text-secondary)]'
                }
              >
                <HubIcon
                  role={destination.icon}
                  size={24}
                  active={destination.emphasis === 'cta'}
                />
              </span>
              <span className="flex-1 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
                {destination.label}
              </span>
              <span aria-hidden="true" className="text-[color:var(--wariba-text-tertiary)]">
                <HubIcon role="chevron" size={16} />
              </span>
            </Link>
          ))}
        </Surface>
      ))}

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface-raised)] text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)] transition-colors hover:bg-[color:var(--warix-surface-hover)] motion-reduce:transition-none"
        >
          <HubIcon role="signOut" size={18} />
          {productCopy.hub.user.signOut}
        </button>
      </form>
    </div>
  );
}
