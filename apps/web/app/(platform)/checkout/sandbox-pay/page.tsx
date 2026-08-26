import { Suspense } from 'react';
import SandboxPayClient from './SandboxPayClient';

/**
 * Never prerendered.
 *
 * Every other route under `(platform)` sets this, and this page did too — but
 * as a `'use client'` file, where route segment config is inert. So it stayed
 * the one page Next rendered at build time, which runs the platform layout,
 * which builds a Supabase server client, which validates the full server
 * config. A build with no environment then failed here and nowhere else.
 *
 * The consequence is not only CI: containerising demanded APP_ENV,
 * DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the webhook secret as *build*
 * inputs, and a build argument is readable in image history forever.
 *
 * It is also simply wrong for this page: a simulated PSP checkout is per-order
 * and has nothing static to emit. The interactive half lives in
 * `SandboxPayClient` so this file can stay a Server Component and the export
 * below can actually be read.
 */
export const dynamic = 'force-dynamic';

export default function SandboxPayPage() {
  return (
    <Suspense fallback={null}>
      <SandboxPayClient />
    </Suspense>
  );
}
