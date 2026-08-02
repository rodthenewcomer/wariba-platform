import type { ComponentType, ReactNode } from 'react';

/**
 * Shape of Next.js's <Link> (and any future router's link component) — layout
 * components accept it as a prop instead of importing next/link directly, so
 * @wariba/ui has no framework coupling. apps/web passes the real Link in.
 */
export type LinkComponentType = ComponentType<{
  href: string;
  className?: string;
  'aria-current'?: 'page' | undefined;
  children: ReactNode;
}>;
