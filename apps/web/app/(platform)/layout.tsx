import type { ReactNode } from 'react';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <div data-wariba-section="platform">{children}</div>;
}
