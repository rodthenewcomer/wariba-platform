import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-wariba-section="auth"
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[color:var(--wariba-background-canvas)] px-4 py-12"
    >
      <Link
        href="/"
        className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
      >
        WARIBA
      </Link>
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}
