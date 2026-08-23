'use client';

import { useEffect, useState } from 'react';
import { SystemState } from '../../../components/SystemState';
import { productCopy } from '../../../lib/product-copy';

const copy = productCopy.system.offline;

/**
 * Reflects the browser's own connectivity rather than asking the trader to
 * judge it, and recovers by itself when the connection returns — an offline
 * screen that needs a manual refresh to notice the network is back is a second
 * failure on top of the first.
 */
export default function OfflinePage() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <SystemState
      title={copy.title}
      body={online ? copy.retrying : copy.body}
      tone="warning"
      actions={[{ label: copy.retry, onClick: () => window.location.reload() }]}
    />
  );
}
