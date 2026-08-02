import type { ReactNode } from 'react';

/** Design System §29 — Trade is genuinely dark (Ink surfaces), compact, no marketing chrome. */
export default function TradeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-wariba-section="trade"
      data-wariba-theme="trade"
      data-theme="dark"
      className="min-h-dvh bg-[color:var(--wariba-theme-background)] text-[color:var(--wariba-theme-text)]"
    >
      {children}
    </div>
  );
}
