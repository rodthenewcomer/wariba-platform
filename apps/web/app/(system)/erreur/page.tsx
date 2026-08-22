'use client';

import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.serverError;

export default function ServerErrorPage() {
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
    />
  );
}
