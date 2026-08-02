'use client';

import { PublicFooter, PublicHeader } from '@wariba/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      data-wariba-section="public"
      data-wariba-theme="marketing"
      className="flex min-h-dvh flex-col"
    >
      <PublicHeader LinkComponent={Link} currentPath={pathname} />
      <main className="flex-1">{children}</main>
      <PublicFooter LinkComponent={Link} />
    </div>
  );
}
