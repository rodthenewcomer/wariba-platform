'use client';

import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.serverError;

/**
 * "Réessayer" is the primary action because most 500s are transient, and the
 * cheapest true thing this screen can offer is one more attempt. Returning to
 * the hub is the fallback for when it is not.
 */
export function ServerErrorState({ reference }: { reference?: string }) {
  return (
    <SystemState
      code="500"
      title={copy.title}
      body={copy.body}
      tone="danger"
      actions={[
        { label: copy.retry, onClick: () => window.location.reload() },
        { label: copy.home, href: '/hub' },
      ]}
      {...(reference ? { reference: copy.reference(reference) } : {})}
    />
  );
}
