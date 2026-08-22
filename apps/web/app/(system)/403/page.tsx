import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.forbidden;

/**
 * Says only that access is refused.
 *
 * Naming the resource, its owner or why it is restricted would tell an
 * unauthorised visitor what exists and who has it — a smaller version of the
 * same leak the login error avoids.
 */
export default function ForbiddenPage() {
  return (
    <SystemState
      code="403"
      title={copy.title}
      body={copy.body}
      tone="warning"
      actions={[{ label: copy.home, href: '/hub' }]}
    />
  );
}
