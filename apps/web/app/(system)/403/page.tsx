import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.forbidden;

/**
 * Says only that access is refused.
 *
 * Naming the resource, its owner or why it is restricted would tell an
 * unauthorised visitor what exists and who has it — a smaller version of the
 * same leak the login error avoids.
 *
 * The secondary action is real: `/support` exists and answers. It is offered
 * because a refusal someone believes is wrong needs a route to a human, and
 * that is the difference between a wall and a door someone forgot to unlock.
 */
export default function ForbiddenPage() {
  return (
    <SystemState
      code="403"
      title={copy.title}
      body={copy.body}
      tone="warning"
      actions={[
        { label: copy.home, href: '/hub' },
        { label: copy.support, href: '/support' },
      ]}
    />
  );
}
