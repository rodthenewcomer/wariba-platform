'use client';

import { SystemState } from '../components/SystemState';
import { productCopy } from '../lib/product-copy';
import { safeSupportReference } from '../lib/support-reference';

const copy = productCopy.system.serverError;

/**
 * The boundary an unhandled render or server-action failure lands in.
 *
 * This is where the correlation reference actually comes from in practice:
 * Next.js hashes the server-side error into `error.digest` and logs the real
 * exception where operators can find it. Showing the digest gives support
 * something to look the incident up by; showing `error.message` would ship the
 * exception text to the browser, which is how internals leak in production.
 *
 * `reset()` re-renders the failed segment without a full page load, so a
 * transient failure recovers without losing the rest of the session.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = safeSupportReference(error.digest);

  return (
    <SystemState
      code="500"
      title={copy.title}
      body={copy.body}
      tone="danger"
      actions={[
        { label: copy.retry, onClick: reset },
        { label: copy.home, href: '/hub' },
      ]}
      {...(reference ? { reference: copy.reference(reference) } : {})}
    />
  );
}
