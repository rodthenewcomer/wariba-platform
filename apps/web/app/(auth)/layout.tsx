import type { ReactNode } from 'react';

/**
 * The auth segment renders full-bleed.
 *
 * This layout used to centre a 440px column and stamp a wordmark above it,
 * which is why every auth page arrived as a card floating on an empty canvas.
 * The composition now belongs to `AuthShell`, which owns the split, the brand
 * side and the responsive collapse — so the layout's job is to get out of the
 * way rather than to impose a frame each page then has to work around.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
