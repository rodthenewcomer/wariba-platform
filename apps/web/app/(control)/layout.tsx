import type { ReactNode } from 'react';

export default function ControlLayout({ children }: { children: ReactNode }) {
  return <div data-wariba-section="control">{children}</div>;
}
