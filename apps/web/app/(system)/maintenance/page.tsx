import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.maintenance;

/**
 * No estimated completion time.
 *
 * A countdown nobody can honour is a promise the platform did not make, and
 * the operational state that would justify one does not exist yet.
 */
export default function MaintenancePage() {
  return <SystemState title={copy.title} body={copy.body} tone="warning" />;
}
