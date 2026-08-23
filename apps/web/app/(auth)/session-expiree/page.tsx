import { Suspense } from 'react';
import Link from 'next/link';
import { AuthPanel, AuthShell } from '../AuthShell';
import { productCopy } from '../../../lib/product-copy';
import { safeInternalPath } from '../../../lib/navigation';

const copy = productCopy.auth.sessionExpired;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function SessionExpired({ searchParams }: PageProps) {
  const params = await searchParams;
  /*
   * The destination the trader was heading for, sanitised here rather than
   * trusted from the query string, then handed to /login so a reconnection
   * lands where they were going instead of dropping them on the hub.
   */
  const next = safeInternalPath(params.next);
  const target = `/login?next=${encodeURIComponent(next)}&raison=session-expiree`;

  return (
    <AuthShell title={copy.title} subtitle={copy.body} mark="expired">
      <AuthPanel>
        {/* A link, not a button: this navigates, and dressing navigation as a
          button breaks middle-click, copy-link and screen-reader expectations.
          It carries the decision-key styling so it still reads as the primary
          action. */}
        <Link
          href={target}
          className="flex h-12 w-full items-center justify-center rounded-[var(--wariba-component-input-radius)] bg-[color:var(--wariba-color-cobalt-600)] px-4 text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-color-white)] transition-[filter,transform] duration-[var(--wariba-component-workstation-motion-interaction)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px"
        >
          {copy.submit}
        </Link>
      </AuthPanel>
    </AuthShell>
  );
}

export default function SessionExpiredPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-dvh" role="status" aria-label="Chargement" />}>
      <SessionExpired {...props} />
    </Suspense>
  );
}
