'use client';

import { useRouter } from 'next/navigation';
import { systemSecondaryActionClassName } from './SystemState';

/**
 * "Page précédente" on a 404.
 *
 * Deliberately `router.back()` and not a computed link: the page that sent
 * someone here is the browser's business, and reconstructing it from a
 * referrer would mean trusting a header an attacker controls — the same class
 * of open-redirect problem the auth flows already refuse.
 *
 * It stays secondary, always. On a tab opened directly on a dead link there is
 * no history to return to and the control does nothing — which is why the way
 * out of the product is the *primary* action here, and going back is only the
 * convenience offered beside it.
 */
export function SystemBackButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <button type="button" onClick={() => router.back()} className={systemSecondaryActionClassName}>
      {label}
    </button>
  );
}
