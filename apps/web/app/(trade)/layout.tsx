import type { ReactNode } from 'react';

export default function TradeLayout({ children }: { children: ReactNode }) {
  return <div data-wariba-section="trade">{children}</div>;
}
