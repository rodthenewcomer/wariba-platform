import type { ReactNode } from 'react';

/*
 * Never prerendered.
 *
 * Pages in this segment reach the Supabase server client, which validates the
 * full server config. Prerendering them at build time therefore demands
 * APP_ENV, DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the webhook secret as
 * *build* inputs — and a build argument is readable in image history forever,
 * so a CI build with no secrets is the correct build, and the one that failed.
 *
 * Set here rather than on each page because route segment config is inert in a
 * `'use client'` file: several pages in this segment are client components, so
 * the export they carried was silently doing nothing. A layout is a Server
 * Component and covers every child, whichever kind it is.
 */
export const dynamic = 'force-dynamic';


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
