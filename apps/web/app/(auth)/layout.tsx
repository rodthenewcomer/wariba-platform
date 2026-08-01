import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div data-wariba-section="auth">{children}</div>;
}
