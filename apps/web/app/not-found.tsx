import { SystemBackButton } from '../components/SystemBackButton';
import { SystemState } from '../components/SystemState';
import { productCopy } from '../lib/product-copy';

const copy = productCopy.system.notFound;

export default function NotFound() {
  return (
    <SystemState
      code="404"
      title={copy.title}
      body={copy.body}
      actions={[
        { label: copy.home, href: '/hub' },
        { label: copy.back, node: <SystemBackButton label={copy.back} /> },
      ]}
    />
  );
}
